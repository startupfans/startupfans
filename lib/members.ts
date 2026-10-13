import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { follows, startupMembers, startups, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { captureServerEvent } from "@/lib/posthog-server";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireStartupOwner(slug: string, { allowSiteAdmin = true } = {}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const [row] = await db.select({ startup: startups, role: startupMembers.role }).from(startups)
    .leftJoin(startupMembers, and(eq(startupMembers.startupId, startups.id), eq(startupMembers.userId, user.id)))
    .where(eq(startups.slug, slug))
    .limit(1);
  if (!row) notFound();
  const isSiteAdmin = isAdmin(user);
  const isOwner = row.role === "owner";
  if (!isOwner && !(allowSiteAdmin && isSiteAdmin)) notFound();
  return { user, startup: row.startup, isSiteAdmin, isOwner, isMember: row.role !== null };
}

// All team changes share the startup lock, including invite acceptance.
export async function withOwnedStartup<T>(
  slug: string,
  userId: string,
  operation: (tx: Transaction, startup: typeof startups.$inferSelect) => Promise<T>,
  { allowSiteAdmin = true } = {},
) {
  return db.transaction(async (tx) => {
    const [startup] = await tx.select().from(startups).where(eq(startups.slug, slug)).for("update");
    if (!startup) notFound();
    const [member] = await tx.select().from(startupMembers)
      .where(and(eq(startupMembers.startupId, startup.id), eq(startupMembers.userId, userId)));
    if (member?.role !== "owner") {
      if (!allowSiteAdmin) notFound();
      const [user] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId));
      if (!isAdmin(user)) notFound();
    }
    return operation(tx, startup);
  });
}

export async function removeStartupMember(slug: string, actorId: string, memberId: string) {
  return withOwnedStartup(slug, actorId, async (tx, startup) => {
    const members = await tx.select().from(startupMembers).where(eq(startupMembers.startupId, startup.id));
    const member = members.find((entry) => entry.userId === memberId);
    if (!member) return { status: "missing" } as const;
    if (member.role === "owner" && members.filter((entry) => entry.role === "owner").length <= 1) {
      return { status: "last-owner" } as const;
    }
    await tx.delete(startupMembers).where(and(eq(startupMembers.startupId, startup.id), eq(startupMembers.userId, memberId)));
    return { status: "removed" } as const;
  });
}

export async function setStartupMemberRole(slug: string, actorId: string, memberId: string, role: string) {
  const result = await withOwnedStartup(slug, actorId, async (tx, startup) => {
    if (role !== "owner" && role !== "editor") return { status: "invalid-role" } as const;
    const members = await tx.select().from(startupMembers).where(eq(startupMembers.startupId, startup.id));
    const member = members.find((entry) => entry.userId === memberId);
    if (!member) return { status: "missing" } as const;
    if (member.role === role) return { status: "unchanged" } as const;
    if (member.role === "owner" && members.filter((entry) => entry.role === "owner").length <= 1) {
      return { status: "last-owner" } as const;
    }
    await tx.update(startupMembers).set({ role })
      .where(and(eq(startupMembers.startupId, startup.id), eq(startupMembers.userId, memberId)));
    return { status: "changed", startupId: startup.id, previousRole: member.role, role } as const;
  });
  if (result.status === "changed") {
    await captureServerEvent({
      distinctId: actorId,
      event: "team_role_changed",
      properties: { startup_id: result.startupId, member_id: memberId, previous_role: result.previousRole, role: result.role },
    });
  }
  return result;
}

export async function getFollowedStartups(userId: string) {
  return db.select({ name: startups.name, slug: startups.slug, memberNo: follows.memberNo }).from(follows)
    .innerJoin(startups, eq(startups.id, follows.startupId))
    .where(eq(follows.userId, userId)).orderBy(desc(follows.createdAt), desc(startups.id));
}

export async function getMemberStartups(userId: string) {
  return db.select({
    name: startups.name,
    slug: startups.slug,
    tagline: startups.tagline,
    logoUrl: startups.logoUrl,
    role: startupMembers.role,
    fanCount: count(follows.userId),
  }).from(startupMembers)
    .innerJoin(startups, eq(startups.id, startupMembers.startupId))
    .leftJoin(follows, eq(follows.startupId, startups.id))
    .where(eq(startupMembers.userId, userId))
    .groupBy(startups.id, startupMembers.role, startupMembers.createdAt)
    .orderBy(desc(startupMembers.createdAt), desc(startups.id));
}

export async function updateProfile(userId: string, name: string | null, avatarUrl: string | null) {
  await db.update(users).set({ name, avatarUrl }).where(eq(users.id, userId));
}

export function textField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function isOptionalHttpsUrl(value: string) {
  if (!value) return true;
  if (value.length > 2048 || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
