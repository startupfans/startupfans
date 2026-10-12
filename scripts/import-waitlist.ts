import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import type postgres from "postgres";
import { db } from "../db/index";
import { startups, users } from "../db/schema";
import { followStartup } from "../lib/follows";

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

export async function importWaitlist(path: string) {
  const [header, ...rows] = parseCsv(await readFile(path, "utf8"));
  if (!header) throw new Error("CSV is empty.");
  const columns = header.map((column) => column.trim().toLowerCase());
  const emailIndex = columns.indexOf("email");
  if (emailIndex === -1) throw new Error("CSV must have an email column.");
  const orderColumn = ["created_at", "createdat", "timestamp", "date", "priority"]
    .find((column) => columns.includes(column));
  const orderIndex = orderColumn ? columns.indexOf(orderColumn) : -1;
  const orderedRows = rows.map((row, index) => {
    const value = row[orderIndex]?.trim() ?? "";
    const numeric = value ? Number(value) : NaN;
    const order = orderColumn === "priority" ? numeric :
      Number.isFinite(numeric) ? (numeric < 1e12 ? numeric * 1000 : numeric) : Date.parse(value);
    return { row, index, order: Number.isFinite(order) ? order : Infinity };
  });
  if (orderColumn) {
    orderedRows.sort((a, b) => (a.order - b.order) || (a.index - b.index));
  }

  const [startup] = await db.select({ id: startups.id }).from(startups)
    .where(eq(startups.slug, "startupfans")).limit(1);
  if (!startup) throw new Error("startupfans does not exist. Run pnpm seed first.");

  let createdUsers = 0;
  let newFollows = 0;
  let skippedRows = 0;
  let skippedMembers = 0;
  const invalidEmails: string[] = [];
  for (const { row } of orderedRows) {
    if (row.length === 1 && row[0] === "") continue;
    const email = (row[emailIndex] ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      skippedRows++;
      if (invalidEmails.length < 3) invalidEmails.push(email || "(empty)");
      continue;
    }
    if (row.length !== header.length) {
      skippedRows++;
      continue;
    }

    const [created] = await db.insert(users).values({ email })
      .onConflictDoNothing({ target: users.email }).returning();
    if (created) createdUsers++;
    const [user] = created ? [created] : await db.select().from(users)
      .where(eq(users.email, email)).limit(1);
    if (!user) throw new Error(`Could not upsert user ${email}`);
    const result = await followStartup(user.id, startup.id);
    if (result.status === "member") {
      skippedRows++;
      skippedMembers++;
      continue;
    }
    if (!result.created) {
      skippedRows++;
    } else {
      newFollows++;
      console.log(`New follow: ${email}, fan #${result.follow.memberNo}`);
    }
  }
  console.log(`Created users: ${createdUsers}; new follows: ${newFollows}; skipped rows: ${skippedRows}`);
  console.log(`Skipped team members: ${skippedMembers} (already on the team, so cannot be fans)`);
  console.log(`First invalid emails (up to 3): ${invalidEmails.length ? invalidEmails.join(", ") : "none"}`);
}

async function main() {
  try {
    const path = process.argv[2];
    if (!path || process.argv.length !== 3) {
      throw new Error("Usage: pnpm import:waitlist <path.csv>");
    }
    await importWaitlist(path);
  } finally {
    const databaseRuntime: typeof globalThis & {
      startupfansPostgres?: ReturnType<typeof postgres>;
    } = globalThis;
    const sql = databaseRuntime.startupfansPostgres;
    if (sql) await sql.end();
  }
}
main().catch((error: unknown) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
