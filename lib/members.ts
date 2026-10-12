import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { follows, startupMembers, startups, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireStartupOwner(slug: string) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const [row] = await db.select({ startup: startups }).from(startups)
    .innerJoin(startupMembers, eq(startupMembers.startupId, startups.id))
    .where(and(eq(startups.slug, slug), eq(startupMembers.userId, user.id), eq(startupMembers.role, "owner")))
    .limit(1);
  if (!row) notFound();
  return { user, startup: row.startup };
}

// All team changes share the startup lock, including invite acceptance.
export async function withOwnedStartup<T>(
  slug: string,
  userId: string,
  operation: (tx: Transaction, startup: typeof startups.$inferSelect) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    const [startup] = await tx.select().from(startups).where(eq(startups.slug, slug)).for("update");
    if (!startup) notFound();
    const [member] = await tx.select().from(startupMembers)
      .where(and(eq(startupMembers.startupId, startup.id), eq(startupMembers.userId, userId)));
    if (member?.role !== "owner") notFound();
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

export async function getFollowedStartups(userId: string) {
  return db.select({ name: startups.name, slug: startups.slug, memberNo: follows.memberNo }).from(follows)
    .innerJoin(startups, eq(startups.id, follows.startupId))
    .where(eq(follows.userId, userId)).orderBy(desc(follows.createdAt), desc(startups.id));
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
