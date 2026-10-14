import "server-only";

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, startupFollows, startupMembers, startups } from "@/db/schema";
import { notifyActivity } from "@/lib/notifications";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function allocateMemberNo(tx: Transaction, startupId: string) {
  const [updated] = await tx.update(startups)
    .set({ fanCount: sql`${startups.fanCount} + 1` })
    .where(eq(startups.id, startupId)).returning({ fanCount: startups.fanCount });
  if (!updated) throw new Error("Startup not found");
  return updated.fanCount;
}

export type FollowResult =
  | { status: "member" }
  | { status: "followed"; follow: typeof follows.$inferSelect; created: boolean };

export async function getStartupFollow(userId: string, startupId: string) {
  const [follow] = await db.select().from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId))).limit(1);
  return follow ?? null;
}

export async function followStartup(userId: string, startupId: string): Promise<FollowResult> {
  const result = await db.transaction<FollowResult>(async (tx) => {
    const [startup] = await tx.select({ id: startups.id }).from(startups)
      .where(eq(startups.id, startupId)).for("update");
    if (!startup) throw new Error("Startup not found");

    const [member] = await tx.select({ userId: startupMembers.userId }).from(startupMembers)
      .where(and(eq(startupMembers.userId, userId), eq(startupMembers.startupId, startupId))).limit(1);
    if (member) return { status: "member" };

    const [existing] = await tx.select().from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId))).limit(1);
    if (existing) return { status: "followed", follow: existing, created: false };

    const [follow] = await tx.insert(follows).values({
      userId, startupId, memberNo: await allocateMemberNo(tx, startupId),
    }).returning();
    if (!follow) throw new Error("Could not follow startup");
    return { status: "followed", follow, created: true };
  });
  if (result.status === "followed" && result.created) notifyActivity({ kind: "new_fan", actorId: userId, startupId });
  return result;
}

export async function unfollowStartup(userId: string, startupId: string) {
  await db.transaction(async (tx) => {
    await tx.select({ id: startups.id }).from(startups)
      .where(eq(startups.id, startupId)).for("update");
    await tx.delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId)));
  });
}

export async function getStartupFollowOptions(userId: string, startupId: string) {
  return db.select({ name: startups.name, slug: startups.slug, memberNo: startupFollows.memberNo })
    .from(startupMembers)
    .innerJoin(startups, eq(startups.id, startupMembers.startupId))
    .leftJoin(startupFollows, and(
      eq(startupFollows.followerStartupId, startups.id), eq(startupFollows.startupId, startupId),
    ))
    .where(and(eq(startupMembers.userId, userId), ne(startups.id, startupId)))
    .orderBy(asc(startups.name), asc(startups.id));
}

export async function updateStartupFollow(userId: string, startupId: string, followerStartupId: string, following: boolean) {
  if (startupId === followerStartupId) return { status: "self" } as const;
  const result = await db.transaction(async (tx) => {
    const locked = await tx.select({ id: startups.id }).from(startups)
      .where(inArray(startups.id, [startupId, followerStartupId])).orderBy(asc(startups.id)).for("update");
    if (locked.length !== 2) return { status: "missing" } as const;
    const [member] = await tx.select({ role: startupMembers.role }).from(startupMembers)
      .where(and(eq(startupMembers.userId, userId), eq(startupMembers.startupId, followerStartupId)));
    if (!member || (member.role !== "owner" && member.role !== "editor")) return { status: "forbidden" } as const;
    const condition = and(eq(startupFollows.followerStartupId, followerStartupId), eq(startupFollows.startupId, startupId));
    if (!following) {
      const removed = await tx.delete(startupFollows).where(condition).returning({ memberNo: startupFollows.memberNo });
      return { status: "success", changed: removed.length > 0 } as const;
    }
    const [existing] = await tx.select().from(startupFollows).where(condition);
    if (existing) return { status: "success", changed: false } as const;
    await tx.insert(startupFollows).values({
      followerStartupId, startupId, memberNo: await allocateMemberNo(tx, startupId),
    });
    return { status: "success", changed: true } as const;
  });
  if (following && result.status === "success" && result.changed) notifyActivity({ kind: "new_fan", actorId: userId, startupId, actorStartupId: followerStartupId });
  return result;
}
