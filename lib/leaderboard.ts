import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { posts, startups } from "@/db/schema";

import { startupFanCount } from "@/lib/startups";

const startupFields = {
  id: startups.id,
  slug: startups.slug,
  name: startups.name,
  tagline: startups.tagline,
  logoUrl: startups.logoUrl,
};

export const getMostFollowed = unstable_cache(async (limit = 10) => {
  const fanCount = startupFanCount;
  return db.select({ ...startupFields, count: fanCount }).from(startups)
    .where(sql`${fanCount} > 0`)
    .orderBy(desc(fanCount), asc(startups.name), asc(startups.id))
    .limit(limit);
}, ["leaderboard-most-followed"], { revalidate: 300 });

export const getMostActive = unstable_cache(async (limit = 10, days = 7) => {
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
}, ["leaderboard-most-active"], { revalidate: 300 });

export type LeaderboardStartup = Awaited<ReturnType<typeof getMostFollowed>>[number];
