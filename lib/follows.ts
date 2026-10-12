import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, startups } from "@/db/schema";

export async function getStartupFollow(userId: string, startupId: string) {
  const [follow] = await db.select().from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId))).limit(1);
  return follow ?? null;
}

export async function followStartup(userId: string, startupId: string) {
  return db.transaction(async (tx) => {
    const [startup] = await tx.select({ id: startups.id }).from(startups)
      .where(eq(startups.id, startupId)).for("update");
    if (!startup) throw new Error("Startup not found");

    const [existing] = await tx.select().from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.startupId, startupId))).limit(1);
    if (existing) return existing;

    const [updated] = await tx.update(startups)
      .set({ fanCount: sql`${startups.fanCount} + 1` })
      .where(eq(startups.id, startupId)).returning({ fanCount: startups.fanCount });
    if (!updated) throw new Error("Startup not found");

    const [follow] = await tx.insert(follows).values({
      userId, startupId, memberNo: updated.fanCount,
    }).returning();
    if (!follow) throw new Error("Could not follow startup");
    return follow;
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
