import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, startupInvites, startupMembers, startups, users } from "@/db/schema";
import { withOwnedStartup } from "@/lib/members";

const inviteLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const usedEmailInviteRetentionMs = 30 * 24 * 60 * 60 * 1000;

function startupInviteCleanupCondition(now = new Date()) {
  return or(
    and(isNull(startupInvites.usedAt), lte(startupInvites.expiresAt, now)),
    and(isNull(startupInvites.invitedEmail), isNotNull(startupInvites.usedAt)),
    and(isNotNull(startupInvites.invitedEmail),
      lte(startupInvites.usedAt, new Date(now.getTime() - usedEmailInviteRetentionMs))),
  );
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isInviteToken(token: string) {
  return /^[0-9a-f]{64}$/.test(token);
}

export async function createStartupInvite(slug: string, userId: string, invitedEmail?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + inviteLifetimeMs);
  await withOwnedStartup(slug, userId, async (tx, startup) => {
    await tx.insert(startupInvites).values({
      tokenHash: tokenHash(token), startupId: startup.id, createdBy: userId, expiresAt,
      invitedEmail: invitedEmail?.trim().toLowerCase() || null,
    });
  });
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/join/${token}`;
}

export async function getUnusedStartupInvites(startupId: string) {
  const invites = await db.select({
    tokenHash: startupInvites.tokenHash, invitedEmail: startupInvites.invitedEmail, expiresAt: startupInvites.expiresAt,
    uses: startupInvites.uses,
  }).from(startupInvites).where(and(
    eq(startupInvites.startupId, startupId), isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date()),
  ))
    .orderBy(asc(startupInvites.expiresAt));
  // Invites have a fixed lifetime and no stored creation timestamp.
  return invites.map((invite) => ({ ...invite, createdAt: new Date(invite.expiresAt.getTime() - inviteLifetimeMs) }));
}

export async function hasExpiredStartupInvites(startupId: string) {
  const [row] = await db.select({ count: count() }).from(startupInvites).where(and(
    eq(startupInvites.startupId, startupId), startupInviteCleanupCondition(),
  ));
  return row.count > 0;
}

export async function clearExpiredStartupInvites(slug: string, userId: string) {
  return withOwnedStartup(slug, userId, async (tx, startup) => {
    await tx.delete(startupInvites).where(and(
      eq(startupInvites.startupId, startup.id), startupInviteCleanupCondition(),
    ));
  });
}

export async function revokeStartupInvite(slug: string, userId: string, hash: string) {
  return withOwnedStartup(slug, userId, async (tx, startup) => {
    await tx.update(startupInvites).set({ usedAt: new Date() }).where(and(
      eq(startupInvites.startupId, startup.id), eq(startupInvites.tokenHash, hash), isNull(startupInvites.usedAt),
    ));
  });
}

export async function getValidStartupInvite(token: string, email?: string) {
  if (!isInviteToken(token)) return null;
  const [invite] = await db.select({
    startupId: startups.id, slug: startups.slug, name: startups.name,
    invitedEmail: startupInvites.invitedEmail, inviterName: users.name, inviterHandle: users.handle,
  })
    .from(startupInvites).innerJoin(startups, eq(startups.id, startupInvites.startupId))
    .innerJoin(users, eq(users.id, startupInvites.createdBy))
    .where(and(eq(startupInvites.tokenHash, tokenHash(token)), isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date()),
      email === undefined ? undefined : or(isNull(startupInvites.invitedEmail),
        eq(sql`lower(btrim(${startupInvites.invitedEmail}))`, email.trim().toLowerCase()))))
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
    const [activeInvite] = await tx.select({ invitedEmail: startupInvites.invitedEmail }).from(startupInvites)
      .where(and(eq(startupInvites.tokenHash, tokenHash(token)), eq(startupInvites.startupId, invite.startupId),
        isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date())))
      .for("update");
    if (!activeInvite) return null;
    const [user] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!user || (activeInvite.invitedEmail !== null &&
      activeInvite.invitedEmail.trim().toLowerCase() !== user.email.trim().toLowerCase())) return null;
    const kind = activeInvite.invitedEmail === null ? "link" : "email";
    const [member] = await tx.select({ userId: startupMembers.userId }).from(startupMembers)
      .where(and(eq(startupMembers.startupId, invite.startupId), eq(startupMembers.userId, userId)));
    if (member && kind === "link") return { ...startup, status: "already-member", kind } as const;
    const [claimed] = await tx.update(startupInvites).set({
      usedAt: kind === "email" ? new Date() : null,
      uses: sql`${startupInvites.uses} + 1`,
    })
      .where(and(eq(startupInvites.tokenHash, tokenHash(token)), eq(startupInvites.startupId, invite.startupId),
        isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date())))
      .returning({ startupId: startupInvites.startupId });
    if (!claimed) return null;
    await tx.insert(startupMembers).values({ startupId: claimed.startupId, userId, role: "editor" })
      .onConflictDoNothing({ target: [startupMembers.startupId, startupMembers.userId] });
    await tx.delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.startupId, claimed.startupId)));
    return { ...startup, status: "accepted", kind } as const;
  });
}
