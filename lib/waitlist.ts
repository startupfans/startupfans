import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, magicLinks, sessions, startupMembers, startups, users, waitlistEntries } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/emails/welcome";
import { followStartup, getStartupFollow } from "@/lib/follows";
import { allocateHandle } from "@/lib/handles";

export const MAX_WAITLIST_BATCH = 25;

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

type SignupEntry = Pick<typeof waitlistEntries.$inferInsert,
  "email" | "source" | "position" | "signedUpAt" | "verified">;

async function upsertEntries(entries: SignupEntry[], signal: AbortSignal) {
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.email, entry])).values()];
  await db.transaction(async (tx) => {
    for (let offset = 0; offset < uniqueEntries.length; offset += 500) {
      signal.throwIfAborted();
      await tx.insert(waitlistEntries).values(uniqueEntries.slice(offset, offset + 500)).onConflictDoUpdate({
        target: waitlistEntries.email,
        set: {
          source: sql`coalesce(excluded.source, ${waitlistEntries.source})`,
          position: sql`excluded.position`,
          signedUpAt: sql`coalesce(excluded.signed_up_at, ${waitlistEntries.signedUpAt})`,
          verified: sql`coalesce(excluded.verified, ${waitlistEntries.verified})`,
        },
      });
    }
    signal.throwIfAborted();
  });
}

export function parseGetWaitlistSignups(input: unknown) {
  if (!Array.isArray(input)) throw new Error("GetWaitlist returned an invalid signup list.");
  const signups: unknown[] = input;
  const entries: SignupEntry[] = [];
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

let lastSyncedAt: number | null = null;
let syncError: string | null = null;
let pendingSync: Promise<{ imported: number; skipped: number }> | null = null;

export function getWaitlistSyncState() {
  return {
    lastSyncedAt,
    secondsAgo: lastSyncedAt === null ? null : Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000)),
    error: syncError,
  };
}

export async function syncGetWaitlistIfStale() {
  if (!process.env.GETWAITLIST_API_KEY ||
    (lastSyncedAt !== null && Date.now() - lastSyncedAt < 60_000)) return;
  try {
    await syncGetWaitlist();
  } catch {
    // The page reads the failure reason and still lists the stored signups.
  }
}

async function fetchGetWaitlist(apiKey: string, signal: AbortSignal) {
  const entries: SignupEntry[] = [];
  let skipped = 0;
  const limit = 1000;
  // https://getwaitlist.com/docs/api-docs/authenticated
  for (let offset = 0; ; offset += limit) {
    signal.throwIfAborted();
    const url = new URL("https://api.getwaitlist.com/api/v1/signup/waitlist/33121");
    url.search = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString();
    const response = await fetch(url, {
      headers: { "api-key": apiKey }, cache: "no-store", signal,
    });
    if (!response.ok) throw new Error(`GetWaitlist sync failed (${response.status}).`);
    const payload: unknown = await response.json();
    const page = parseGetWaitlistSignups(payload);
    entries.push(...page.entries);
    skipped += page.skipped;
    if (page.pageSize < limit) break;
  }
  await upsertEntries(entries, signal);
  return { imported: entries.length, skipped };
}

export async function syncGetWaitlist() {
  const apiKey = process.env.GETWAITLIST_API_KEY;
  if (!apiKey) throw new Error("GetWaitlist sync is not configured.");
  if (pendingSync) return pendingSync;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error("GetWaitlist sync timed out after 10 seconds.");
      controller.abort(error);
      reject(error);
    }, 10_000);
  });
  pendingSync = Promise.race([fetchGetWaitlist(apiKey, controller.signal), deadline])
    .then((result) => {
      lastSyncedAt = Date.now();
      syncError = null;
      return result;
    }).catch((error: unknown) => {
      syncError = error instanceof Error ? error.message : "Could not sync the waitlist.";
      throw error;
    }).finally(() => {
      clearTimeout(timeout);
      pendingSync = null;
    });
  return pendingSync;
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
      and (exists (select 1 from ${sessions} s
          where s.user_id = u.id and w.invited_at is not null and s.expires_at > w.invited_at)
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
    throw new Error(`Choose between 1 and ${MAX_WAITLIST_BATCH} people.`);
  }
  if (selection.kind === "entry" && (typeof selection.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selection.id))) {
    throw new Error("Invalid waitlist entry.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
    throw new Error("Email delivery is not configured.");
  }
  const { result, emails } = await db.transaction(async (lock) => {
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
    const entries = await lock.select().from(waitlistEntries).where(selection.kind === "first"
      ? and(isNull(waitlistEntries.invitedAt), isNull(waitlistEntries.joinedUserId))
      : eq(waitlistEntries.id, selection.id)).orderBy(...waitlistOrder)
      .limit(selection.kind === "first" ? selection.count : 1);
    if (selection.kind === "entry" && entries.length === 0) throw new Error("Waitlist entry not found.");
    const result: { sent: number; previewed: number; skipped: number; alreadyOnTeam: number; failed: number; errors: string[] } = {
      sent: 0, previewed: 0, skipped: 0, alreadyOnTeam: 0, failed: 0, errors: [],
    };
    const emails: Parameters<typeof sendEmail>[0][] = [];
    const markInvited = async (id: string) => {
      await lock.update(waitlistEntries).set({
        invitedAt: sql`coalesce(${waitlistEntries.invitedAt}, clock_timestamp())`,
      }).where(eq(waitlistEntries.id, id));
    };
    for (const entry of entries) {
      if (entry.invitedAt && (selection.kind === "first" || !selection.resend)) {
        result.skipped++;
        continue;
      }
      const user = await db.transaction((tx) => allocateHandle(tx, entry.email));
      const [member] = await db.select({ userId: startupMembers.userId }).from(startupMembers)
        .where(and(eq(startupMembers.userId, user.id), eq(startupMembers.startupId, startup.id))).limit(1);
      if (member) {
        await markInvited(entry.id);
        result.alreadyOnTeam++;
        continue;
      }
      const existingFollow = await getStartupFollow(user.id, startup.id);
      if (entry.invitedAt && !existingFollow) {
        throw new Error("This person no longer follows startupfans. Their previous fan number cannot be reassigned.");
      }
      const follow = await followStartup(user.id, startup.id);
      if (follow.status === "member") {
        await markInvited(entry.id);
        result.alreadyOnTeam++;
        continue;
      }
      const token = randomBytes(32).toString("hex");
      const link = new URL("/auth/verify", process.env.APP_URL || "http://localhost:3000");
      link.search = new URLSearchParams({ token, next: "/me" }).toString();
      await lock.insert(magicLinks).values({
        tokenHash: createHash("sha256").update(token).digest("hex"),
        email: entry.email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await markInvited(entry.id);
      emails.push({ to: entry.email, ...welcomeEmail(link.toString(), follow.follow.memberNo) });
    }
    return { result, emails };
  });
  let lastDeliveryStarted = 0;
  for (const email of emails) {
    // Delivery starts are 600 ms apart, after the admission lock is released.
    await delay(Math.max(0, 600 - (Date.now() - lastDeliveryStarted)));
    lastDeliveryStarted = Date.now();
    try {
      const delivery = await sendEmail(email);
      if (delivery.delivered) result.sent++;
      else result.previewed++;
    } catch (error) {
      result.failed++;
      result.errors.push(error instanceof Error ? error.message : "Could not send a welcome email.");
    }
  }
  return result;
}
