import "server-only";

import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

const windowMs = 15 * 60 * 1000;
type RateLimitDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function allowRateLimit(identifier: string, limit: number, database: RateLimitDatabase = db,
  windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)) {
  const hash = createHash("sha256").update(identifier).digest("hex");
  const [attempt] = await database.insert(loginAttempts)
    .values({ email: hash, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [loginAttempts.email, loginAttempts.windowStart],
      set: { count: sql`least(${loginAttempts.count} + 1, ${limit + 1})` },
    })
    .returning({ count: loginAttempts.count });
  return Boolean(attempt && attempt.count <= limit);
}

export async function allowMagicLinkRequest(email: string, forwardedFor: string | null) {
  const ip = forwardedFor?.split(",")[0].trim() || "unknown";
  const identifiers = [
    { value: `email:${email.trim().toLowerCase()}`, limit: 5 },
    { value: `ip:${ip}`, limit: 30 },
  ].map(({ value, limit }) => ({
    value,
    hash: createHash("sha256").update(value).digest("hex"),
    limit,
  })).sort((a, b) => a.hash.localeCompare(b.hash));

  return db.transaction(async (tx) => {
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    await tx.delete(loginAttempts).where(lt(loginAttempts.windowStart, windowStart));
    let allowed = true;
    for (const { value, limit } of identifiers) {
      if (!await allowRateLimit(value, limit, tx, windowStart)) allowed = false;
    }
    return allowed;
  });
}
