import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, startupMembers, startups } from "@/db/schema";

export type FollowResult =
  | { status: "member" }
  | { status: "followed"; follow: typeof follows.$inferSelect; created: boolean };

export async function getStartupFollow(userId: string, startupId: string) {
  const [follow] = await db.select().from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId))).limit(1);
  return follow ?? null;
}

export async function followStartup(userId: string, startupId: string): Promise<FollowResult> {
  return db.transaction(async (tx) => {
    const [startup] = await tx.select({ id: startups.id }).from(startups)
      .where(eq(startups.id, startupId)).for("update");
    if (!startup) throw new Error("Startup not found");

    const [member] = await tx.select({ userId: startupMembers.userId }).from(startupMembers)
      .where(and(eq(startupMembers.userId, userId), eq(startupMembers.startupId, startupId))).limit(1);
    if (member) return { status: "member" };

    const [existing] = await tx.select().from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId))).limit(1);
    if (existing) return { status: "followed", follow: existing, created: false };

    const [updated] = await tx.update(startups)
      .set({ fanCount: sql`${startups.fanCount} + 1` })
      .where(eq(startups.id, startupId)).returning({ fanCount: startups.fanCount });
    if (!updated) throw new Error("Startup not found");

    const [follow] = await tx.insert(follows).values({
      userId, startupId, memberNo: updated.fanCount,
    }).returning();
    if (!follow) throw new Error("Could not follow startup");
    return { status: "followed", follow, created: true };
  });
}

export async function unfollowStartup(userId: string, startupId: string) {
  await db.transaction(async (tx) => {
    await tx.select({ id: startups.id }).from(startups)
      .where(eq(startups.id, startupId)).for("update");
    await tx.delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId)));
  });
}
