import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { startupInvites, startupMembers, startups } from "@/db/schema";
import { withOwnedStartup } from "@/lib/members";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isInviteToken(token: string) {
  return /^[0-9a-f]{64}$/.test(token);
}

export async function createStartupInvite(slug: string, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await withOwnedStartup(slug, userId, async (tx, startup) => {
    await tx.insert(startupInvites).values({
      tokenHash: tokenHash(token), startupId: startup.id, createdBy: userId, expiresAt,
    });
  });
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/join/${token}`;
}

export async function getUnusedStartupInvites(startupId: string) {
  const invites = await db.select({ tokenHash: startupInvites.tokenHash, expiresAt: startupInvites.expiresAt })
    .from(startupInvites).where(and(eq(startupInvites.startupId, startupId), isNull(startupInvites.usedAt)))
    .orderBy(asc(startupInvites.expiresAt));
  const now = Date.now();
  return invites.map((invite) => ({ ...invite, expired: invite.expiresAt.getTime() <= now }));
}

export async function revokeStartupInvite(slug: string, userId: string, hash: string) {
  return withOwnedStartup(slug, userId, async (tx, startup) => {
    await tx.delete(startupInvites).where(and(
      eq(startupInvites.startupId, startup.id), eq(startupInvites.tokenHash, hash), isNull(startupInvites.usedAt),
    ));
  });
}

export async function getValidStartupInvite(token: string) {
  if (!isInviteToken(token)) return null;
  const [invite] = await db.select({ startupId: startups.id, slug: startups.slug, name: startups.name })
    .from(startupInvites).innerJoin(startups, eq(startups.id, startupInvites.startupId))
    .where(and(eq(startupInvites.tokenHash, tokenHash(token)), isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date())))
    .limit(1);
  return invite ?? null;
}

export async function acceptStartupInvite(token: string, userId: string) {
  const invite = await getValidStartupInvite(token);
  if (!invite) return null;
  return db.transaction(async (tx) => {
    const [startup] = await tx.select({ slug: startups.slug }).from(startups)
      .where(eq(startups.id, invite.startupId)).for("update");
    if (!startup) return null;
    const [claimed] = await tx.update(startupInvites).set({ usedAt: new Date() })
      .where(and(eq(startupInvites.tokenHash, tokenHash(token)), eq(startupInvites.startupId, invite.startupId),
        isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date())))
      .returning({ startupId: startupInvites.startupId });
    if (!claimed) return null;
    await tx.insert(startupMembers).values({ startupId: claimed.startupId, userId, role: "editor" })
      .onConflictDoNothing({ target: [startupMembers.startupId, startupMembers.userId] });
    return startup;
  });
}
