import "server-only";

import { eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { users } from "@/db/schema";

export const RESERVED_HANDLES = new Set([
  "admin", "startupfans", "me", "login", "feed", "start", "api", "s", "u",
  "join", "settings", "team", "fans", "following",
]);

export function handleFromEmail(email: string): string {
  return email.trim().split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "")
    .slice(0, 24).padEnd(3, "_");
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Allocation inserts the user so the unique index arbitrates concurrent signups.
export async function allocateHandle(tx: Transaction, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await tx.select().from(users)
    .where(eq(sql`lower(btrim(${users.email}))`, normalizedEmail)).limit(1);
  if (existing) return existing;

  const base = handleFromEmail(normalizedEmail);
  for (let number = 1; ; number++) {
    const suffix = number === 1 ? "" : String(number);
    const handle = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (RESERVED_HANDLES.has(handle)) continue;
    try {
      // A savepoint keeps the outer transaction usable after a unique violation.
      return await tx.transaction(async (attempt) => {
        const [user] = await attempt.insert(users).values({ email: normalizedEmail, handle })
          .onConflictDoUpdate({ target: users.email, set: { email: normalizedEmail } }).returning();
        if (!user) throw new Error("Could not create a user.");
        return user;
      });
    } catch (error) {
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
      if (!(cause instanceof Error)) throw error;
      const code: unknown = Reflect.get(cause, "code");
      const constraint: unknown = Reflect.get(cause, "constraint_name");
      if (code !== "23505" || constraint !== "users_handle_unique") throw error;
    }
  }
}
