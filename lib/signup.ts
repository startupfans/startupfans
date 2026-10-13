import "server-only";

import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { startupInvites, users, waitlistEntries } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { getValidStartupInvite } from "@/lib/invites";

export async function existingUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users)
    .where(eq(sql`lower(btrim(${users.email}))`, normalizedEmail)).limit(1);
  return user ?? null;
}

export async function canSignUp(email: string, { inviteToken }: { inviteToken?: string } = {}): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (isAdminEmail(normalizedEmail, process.env.ADMIN_EMAILS)) return true;
  if (await existingUser(normalizedEmail)) return true;

  const [waitlistInvite] = await db.select({ id: waitlistEntries.id }).from(waitlistEntries)
    .where(and(eq(sql`lower(btrim(${waitlistEntries.email}))`, normalizedEmail), isNotNull(waitlistEntries.invitedAt)))
    .limit(1);
  if (waitlistInvite) return true;

  const [emailInvite] = await db.select({ tokenHash: startupInvites.tokenHash }).from(startupInvites)
    .where(and(eq(sql`lower(btrim(${startupInvites.invitedEmail}))`, normalizedEmail),
      isNull(startupInvites.usedAt), gt(startupInvites.expiresAt, new Date())))
    .limit(1);
  if (emailInvite) return true;

  return Boolean(inviteToken && await getValidStartupInvite(inviteToken));
}
