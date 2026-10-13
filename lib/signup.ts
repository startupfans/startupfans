import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function existingUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users)
    .where(eq(sql`lower(btrim(${users.email}))`, normalizedEmail)).limit(1);
  return user ?? null;
}

/** Open signup: any non-empty email can create an account via magic link. */
export async function canSignUp(email: string): Promise<boolean> {
  return Boolean(email.trim().toLowerCase());
}
