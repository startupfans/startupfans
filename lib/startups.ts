import "server-only";

import { asc, count, desc, eq, and } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { follows, posts, startupMembers, startups, users } from "@/db/schema";

export const getStartupBySlug = cache(async (slug: string) => {
  const [startup] = await db.select().from(startups).where(eq(startups.slug, slug)).limit(1);
  return startup ?? null;
});

export async function createStartup(input: typeof startups.$inferInsert) {
  return db.transaction(async (tx) => {
    const [startup] = await tx.insert(startups).values(input)
      .onConflictDoNothing({ target: startups.slug }).returning();
    if (!startup) return null;

    await tx.insert(startupMembers).values({
      startupId: startup.id,
      userId: input.createdBy,
      role: "owner",
    });
    return startup;
  });
}

export async function getStartupMembers(startupId: string) {
  return db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, email: users.email, role: startupMembers.role })
    .from(startupMembers).innerJoin(users, eq(users.id, startupMembers.userId))
    .where(eq(startupMembers.startupId, startupId)).orderBy(asc(users.createdAt), asc(users.id));
}

export async function getStartupPosts(startupId: string) {
  return db.select({
    id: posts.id,
    body: posts.bodyMd,
    publishedAt: posts.publishedAt,
    authorName: users.name,
    authorEmail: users.email,
  }).from(posts).innerJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.startupId, startupId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.publishedAt), desc(posts.id));
}

export async function getStartupFanCount(startupId: string) {
  const [row] = await db.select({ count: count() }).from(follows)
    .where(eq(follows.startupId, startupId));
  return row?.count ?? 0;
}
