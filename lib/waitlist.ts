import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, magicLinks, sessions, startups, users, waitlistEntries } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/emails/welcome";
import { followStartup, getStartupFollow } from "@/lib/follows";

export const MAX_WAITLIST_BATCH = 50;
export const MAX_WAITLIST_CSV_BYTES = 500_000;

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  const csv = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += character;
      }
    } else if (character === "," || character === "\n" || character === "\r") {
      row.push(field);
      field = "";
      closedQuote = false;
      if (character !== ",") {
        rows.push(row);
        row = [];
        if (character === "\r" && csv[index + 1] === "\n") index++;
      }
    } else if (character === '"') {
      if (field || closedQuote) throw new Error("Malformed CSV: unexpected quote.");
      quoted = true;
    } else {
      if (closedQuote) throw new Error("Malformed CSV: text after a closing quote.");
      field += character;
    }
  }
  if (quoted) throw new Error("Malformed CSV: unclosed quoted field.");
  if (field || row.length || closedQuote) rows.push([...row, field]);
  return rows;
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) &&
    !email.startsWith(".") && !email.includes("..") && !email.includes(".@") &&
    email.split("@")[0].length <= 64;
}

export function parseWaitlistDate(value: string): Date | null {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(
    /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/,
    "$1T$2:$3:$4Z",
  );
  const numeric = Number(normalized);
  const milliseconds = Number.isFinite(numeric)
    ? (numeric < 1e12 ? numeric * 1000 : numeric) : Date.parse(normalized);
  const date = new Date(milliseconds);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parsePosition(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (value === "") return null;
  const position = Number(value);
  return Number.isInteger(position) && position > 0 && position <= 2_147_483_647 ? position : null;
}

type ImportEntry = Pick<typeof waitlistEntries.$inferInsert,
  "email" | "source" | "position" | "signedUpAt" | "verified">;

async function upsertEntries(entries: ImportEntry[]) {
  await db.transaction(async (tx) => {
    for (const entry of entries) {
      await tx.insert(waitlistEntries).values(entry).onConflictDoUpdate({
        target: waitlistEntries.email,
        set: {
          source: entry.source,
          position: entry.position,
          signedUpAt: entry.signedUpAt,
          // A CSV without a verified column must not erase API verification.
          verified: entry.verified ?? sql`${waitlistEntries.verified}`,
        },
      });
    }
  });
}

export function parseWaitlistCsv(input: string) {
  if (Buffer.byteLength(input, "utf8") > MAX_WAITLIST_CSV_BYTES) {
    throw new Error("Use a CSV smaller than 500 KB.");
  }
  const [header, ...rows] = parseCsv(input);
  if (!header) throw new Error("CSV is empty.");
  const columns = header.map((column) => column.trim().toLowerCase());
  const emailIndex = columns.indexOf("email");
  if (emailIndex === -1) throw new Error("CSV must have an email column.");
  const dateColumn = ["created_at", "createdat", "timestamp", "date"]
    .find((column) => columns.includes(column));
  const dateIndex = dateColumn ? columns.indexOf(dateColumn) : -1;
  const priorityIndex = columns.indexOf("priority");
  const verifiedIndex = columns.indexOf("verified");
  const spamIndex = columns.indexOf("is_spam");
  const orderedRows = rows.map((row, index) => {
    const signedUpAt = parseWaitlistDate(row[dateIndex] ?? "");
    const position = parsePosition(row[priorityIndex]?.trim());
    const order = dateColumn ? signedUpAt?.getTime() : position;
    return { row, index, signedUpAt, position, order: order ?? Infinity };
  }).sort((a, b) => (a.order - b.order) || (a.index - b.index));
  const entries: ImportEntry[] = [];
  const emails = new Set<string>();
  let skipped = 0;
  for (const { row, signedUpAt, position } of orderedRows) {
    if (row.length === 1 && row[0] === "") continue;
    const email = (row[emailIndex] ?? "").trim().toLowerCase();
    if (row.length !== header.length || !isValidEmail(email) || emails.has(email) ||
      /^(true|1)$/i.test(row[spamIndex]?.trim() ?? "")) {
      skipped++;
      continue;
    }
    emails.add(email);
    const verified = row[verifiedIndex]?.trim().toLowerCase();
    entries.push({
      email, source: "csv",
      // Date-ordered exports retain that order; priority-only exports keep nulls last.
      position: dateColumn || priorityIndex === -1 ? entries.length + 1 : position,
      signedUpAt,
      verified: verified === "true" || verified === "1" ? true :
        verified === "false" || verified === "0" ? false : null,
    });
  }
  return { entries, skipped };
}

export async function importWaitlistCsv(input: string) {
  const { entries, skipped } = parseWaitlistCsv(input);
  await upsertEntries(entries);
  return { imported: entries.length, skipped };
}

export function parseGetWaitlistSignups(input: unknown) {
  if (!Array.isArray(input)) throw new Error("GetWaitlist returned an invalid signup list.");
  const signups: unknown[] = input;
  const entries: ImportEntry[] = [];
  let skipped = 0;
  for (const signup of signups) {
    if (!signup || typeof signup !== "object" ||
      !("email" in signup) || typeof signup.email !== "string") {
      throw new Error("GetWaitlist returned an invalid signup.");
    }
    const email = signup.email.trim().toLowerCase();
    if (("is_spam" in signup && signup.is_spam === true) || !isValidEmail(email)) {
      skipped++;
      continue;
    }
    entries.push({
      email, source: "getwaitlist",
      position: "priority" in signup ? parsePosition(signup.priority) : null,
      signedUpAt: "created_at" in signup && typeof signup.created_at === "string"
        ? parseWaitlistDate(signup.created_at) : null,
      verified: "verified" in signup && typeof signup.verified === "boolean" ? signup.verified : null,
    });
  }
  return { entries, skipped, pageSize: input.length };
}

export async function syncGetWaitlist() {
  const apiKey = process.env.GETWAITLIST_API_KEY;
  if (!apiKey) throw new Error("GetWaitlist sync is not configured.");
  const entries: ImportEntry[] = [];
  let skipped = 0;
  const limit = 1000;
  // https://getwaitlist.com/docs/api-docs/authenticated
  for (let offset = 0; ; offset += limit) {
    const url = new URL("https://api.getwaitlist.com/api/v1/signup/waitlist/33121");
    url.search = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString();
    const response = await fetch(url, {
      headers: { "api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GetWaitlist sync failed (${response.status}).`);
    const payload: unknown = await response.json();
    const page = parseGetWaitlistSignups(payload);
    entries.push(...page.entries);
    skipped += page.skipped;
    if (page.pageSize < limit) break;
  }
  await upsertEntries(entries);
  return { imported: entries.length, skipped };
}

const waitlistOrder = [
  sql`${waitlistEntries.position} asc nulls last`,
  sql`${waitlistEntries.signedUpAt} asc nulls last`,
  waitlistEntries.createdAt,
  waitlistEntries.id,
];

export function waitlistStatus(entry: { invitedAt: Date | null; joinedUserId: string | null }): "waiting" | "invited" | "joined" {
  if (entry.joinedUserId) return "joined";
  if (entry.invitedAt) return "invited";
  return "waiting";
}

export async function detectWaitlistJoins() {
  // The invitation's own follow predates invited_at and cannot count as a join.
  await db.execute(sql`
    update ${waitlistEntries} as w
    set joined_user_id = u.id,
        joined_at = coalesce(
          (select min(m.used_at) from ${magicLinks} m where m.email = u.email),
          (select min(f.created_at) from ${follows} f
            where f.user_id = u.id and f.created_at > w.invited_at),
          now()
        )
    from ${users} u
    where u.email = w.email and w.joined_user_id is null
      and (exists (select 1 from ${sessions} s where s.user_id = u.id)
        or exists (select 1 from ${follows} f
          where f.user_id = u.id and f.created_at > w.invited_at))
  `);
}

export async function listWaitlist() {
  await detectWaitlistJoins();
  const entries = await db.select({ entry: waitlistEntries, user: {
    id: users.id, email: users.email, name: users.name,
  } }).from(waitlistEntries).leftJoin(users, eq(waitlistEntries.joinedUserId, users.id))
    .orderBy(...waitlistOrder);
  return entries.map(({ entry, user }) => ({ ...entry, user, status: waitlistStatus(entry) }));
}

type AdmissionSelection = { kind: "first"; count: number } | { kind: "entry"; id: string; resend: boolean };

export async function letInWaitlist(selection: AdmissionSelection) {
  if (selection.kind === "first" && (!Number.isInteger(selection.count) ||
    selection.count < 1 || selection.count > MAX_WAITLIST_BATCH)) {
    throw new Error("Choose between 1 and 50 people.");
  }
  if (selection.kind === "entry" && (typeof selection.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selection.id))) {
    throw new Error("Invalid waitlist entry.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
    throw new Error("Email delivery is not configured.");
  }
  return db.transaction(async (lock) => {
    // Serializes admission actions across instances, preserving batch order.
    // The allocator runs its own transaction and keeps existing fan numbers.
    const [admissionLock] = await lock.execute(sql`select pg_try_advisory_xact_lock(33121) as acquired`);
    if (admissionLock?.acquired !== true) {
      throw new Error("Another admission is running. Try again shortly.");
    }
    await detectWaitlistJoins();
    const [startup] = await db.select({ id: startups.id }).from(startups)
      .where(eq(startups.slug, "startupfans")).limit(1);
    if (!startup) throw new Error("startupfans does not exist. Run pnpm seed first.");
    const entries = await db.select().from(waitlistEntries).where(selection.kind === "first"
      ? and(isNull(waitlistEntries.invitedAt), isNull(waitlistEntries.joinedUserId))
      : eq(waitlistEntries.id, selection.id)).orderBy(...waitlistOrder)
      .limit(selection.kind === "first" ? selection.count : 1);
    if (selection.kind === "entry" && entries.length === 0) throw new Error("Waitlist entry not found.");
    const result: { sent: number; previewed: number; skipped: number; failed: number; error: string | null } = {
      sent: 0, previewed: 0, skipped: 0, failed: 0, error: null,
    };
    let lastDeliveryStarted = 0;
    for (const entry of entries) {
      if (entry.invitedAt && (selection.kind === "first" || !selection.resend)) {
        result.skipped++;
        continue;
      }
      try {
        const [user] = await db.insert(users).values({ email: entry.email })
          .onConflictDoUpdate({ target: users.email, set: { email: entry.email } }).returning();
        if (!user) throw new Error("Could not create a user.");
        const existingFollow = await getStartupFollow(user.id, startup.id);
        if (entry.invitedAt && !existingFollow) {
          throw new Error("This person no longer follows startupfans. Their previous fan number cannot be reassigned.");
        }
        const follow = await followStartup(user.id, startup.id);
        if (follow.status === "member") {
          result.skipped++;
          continue;
        }
        // Space email requests to avoid bursts, including retries.
        await delay(Math.max(0, 550 - (Date.now() - lastDeliveryStarted)));
        lastDeliveryStarted = Date.now();
        const delivery = await db.transaction(async (tx) => {
          const token = randomBytes(32).toString("hex");
          const link = new URL("/auth/verify", process.env.APP_URL || "http://localhost:3000");
          link.search = new URLSearchParams({ token, next: "/me" }).toString();
          await tx.insert(magicLinks).values({
            tokenHash: createHash("sha256").update(token).digest("hex"),
            email: entry.email,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          const delivered = await sendEmail({ to: entry.email, ...welcomeEmail(link.toString(), follow.follow.memberNo) });
          await tx.update(waitlistEntries).set({
            invitedAt: sql`coalesce(${waitlistEntries.invitedAt}, clock_timestamp())`,
          })
            .where(eq(waitlistEntries.id, entry.id));
          return delivered;
        });
        if (delivery.delivered) result.sent++;
        else result.previewed++;
      } catch (error) {
        result.failed++;
        result.error = error instanceof Error ? error.message : "Could not send a welcome email.";
      }
    }
    return result;
  });
}
