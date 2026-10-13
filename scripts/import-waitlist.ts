import { readFile } from "node:fs/promises";
import type postgres from "postgres";
import { importWaitlistCsv } from "../lib/waitlist";

export async function importWaitlist(path: string) {
  const result = await importWaitlistCsv(await readFile(path, "utf8"));
  console.log(`Imported entries: ${result.imported}; skipped rows: ${result.skipped}`);
  console.log("Entries are waiting. Let people in from /admin/waitlist.");
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
    const connection = databaseRuntime.startupfansPostgres;
    if (connection) await connection.end();
  }
}
main().catch((error: unknown) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
