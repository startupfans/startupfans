import "server-only";

import { asc, count, desc, eq, and, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { follows, posts, startupMembers, startups, users } from "@/db/schema";
import { getMediaFormat, isMediaFilename } from "@/lib/media";

export function isStartupProfileImageUrl(value: string, slug: string, creatorId?: string) {
  if (!value) return true;
  if (value.length > 500 || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) return true;
    const prefix = `/startups/${slug}/profile/`;
    const filename = url.pathname.slice(prefix.length);
    return /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)
      && !url.port && !url.search && !url.hash && url.pathname.startsWith(prefix)
      && isMediaFilename(filename) && getMediaFormat(filename)?.type === "image"
      && (!creatorId || filename.startsWith(`${creatorId}-`));
  } catch {
    return false;
  }
}

export const getStartupBySlug = cache(async (slug: string) => {
  const [startup] = await db.select().from(startups).where(eq(startups.slug, slug)).limit(1);
  return startup ?? null;
});

export async function createStartup(input: typeof startups.$inferInsert) {
  return db.transaction(async (tx) => {
    const [startup] = await tx.insert(startups).values(input)
      .onConflictDoNothing({ target: startups.slug }).returning();
    if (!startup) return null;

    // The creator joins as an owner, never as a fan of their own startup.
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

export const getTeam = cache(async (startupId: string) => {
  const publicPosts = and(eq(posts.startupId, startupId), eq(posts.visibility, "public"));
  const totals = db.select({ authorId: posts.authorId, postCount: count().as("post_count") })
    .from(posts).where(publicPosts).groupBy(posts.authorId).as("team_post_totals");
  const latest = db.selectDistinctOn([posts.authorId], {
    authorId: posts.authorId,
    body: posts.bodyMd,
    publishedAt: posts.publishedAt,
  }).from(posts).where(publicPosts)
    .orderBy(asc(posts.authorId), desc(posts.publishedAt), desc(posts.id)).as("team_latest_posts");

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl,
    role: startupMembers.role,
    joinedAt: startupMembers.createdAt,
    postCount: sql`coalesce(${totals.postCount}, 0)`.mapWith(Number),
    latestPostDate: latest.publishedAt,
    latestPostBody: latest.body,
  }).from(startupMembers)
    .innerJoin(users, eq(users.id, startupMembers.userId))
    .leftJoin(totals, eq(totals.authorId, users.id))
    .leftJoin(latest, eq(latest.authorId, users.id))
    .where(eq(startupMembers.startupId, startupId))
    .orderBy(asc(startupMembers.createdAt), asc(users.id));
});

export type TeamMember = Awaited<ReturnType<typeof getTeam>>[number];

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
