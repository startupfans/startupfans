import "server-only";

import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

const windowMs = 15 * 60 * 1000;

export async function allowMagicLinkRequest(email: string, forwardedFor: string | null) {
  const ip = forwardedFor?.split(",")[0].trim() || "unknown";
  const identifiers = [
    { value: `email:${email.trim().toLowerCase()}`, limit: 5 },
    { value: `ip:${ip}`, limit: 30 },
  ].map(({ value, limit }) => ({
    hash: createHash("sha256").update(value).digest("hex"),
    limit,
  })).sort((a, b) => a.hash.localeCompare(b.hash));

  return db.transaction(async (tx) => {
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    await tx.delete(loginAttempts).where(lt(loginAttempts.windowStart, windowStart));
    let allowed = true;
    for (const { hash, limit } of identifiers) {
      const [attempt] = await tx.insert(loginAttempts)
        .values({ email: hash, windowStart, count: 1 })
        .onConflictDoUpdate({
          target: [loginAttempts.email, loginAttempts.windowStart],
          set: { count: sql`least(${loginAttempts.count} + 1, ${limit + 1})` },
        })
        .returning({ count: loginAttempts.count });
      if (!attempt || attempt.count > limit) allowed = false;
    }
    return allowed;
  });
}
