import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, posts, startups } from "@/db/schema";

const startupFields = {
  id: startups.id,
  slug: startups.slug,
  name: startups.name,
  tagline: startups.tagline,
  logoUrl: startups.logoUrl,
};

export async function getMostFollowed(limit = 10) {
  const fanCount = count(follows.userId);
  return db.select({ ...startupFields, count: fanCount }).from(startups)
    .innerJoin(follows, eq(follows.startupId, startups.id))
    .groupBy(startups.id)
    .orderBy(desc(fanCount), asc(startups.name), asc(startups.id))
    .limit(limit);
}

export async function getMostActive(limit = 10, days = 7) {
  const postCount = count(posts.id);
  return db.select({ ...startupFields, count: postCount }).from(startups)
    .innerJoin(posts, eq(posts.startupId, startups.id))
    .where(and(
      eq(posts.visibility, "public"),
      sql`${posts.publishedAt} >= now() - ${days} * interval '1 day'`,
      sql`${posts.publishedAt} <= now()`,
    ))
    .groupBy(startups.id)
    .orderBy(desc(postCount), asc(startups.name), asc(startups.id))
    .limit(limit);
}

export type LeaderboardStartup = Awaited<ReturnType<typeof getMostFollowed>>[number];
