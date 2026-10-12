import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { follows, posts, startupMembers, startups, users } from "@/db/schema";

const publicPostFields = {
  id: posts.id,
  authorId: posts.authorId,
  body: posts.bodyMd,
  publishedAt: posts.publishedAt,
  mediaUrl: posts.mediaUrl,
  mediaType: posts.mediaType,
  mediaPosterUrl: posts.mediaPosterUrl,
  authorName: users.name,
  authorEmail: users.email,
  startupName: startups.name,
  startupSlug: startups.slug,
  startupLogoUrl: startups.logoUrl,
};

export async function getPublicStartupPosts(startupId: string) {
  return db.select(publicPostFields).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.startupId, startupId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.publishedAt), desc(posts.id));
}

export type PublicPost = Awaited<ReturnType<typeof getPublicStartupPosts>>[number];

function parseFeedCursor(cursor?: string) {
  if (!cursor || cursor.length > 128) return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
    .exec(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!match) return null;
  const timestamp = match[1];
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== timestamp.replace(/(\.\d{3})\d{3}Z$/, "$1Z")) return null;
  return { timestamp, id: match[2] };
}

export async function listFeed({ userId, following = false, cursor }: {
  userId?: string;
  following?: boolean;
  cursor?: string;
} = {}): Promise<{ posts: PublicPost[]; nextCursor: string | null }> {
  if (following && !userId) return { posts: [], nextCursor: null };
  const before = parseFeedCursor(cursor);
  const rows = await db.select({
    ...publicPostFields,
    cursorTimestamp: sql<string>`to_char(${posts.publishedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(
      eq(posts.visibility, "public"),
      following && userId ? inArray(posts.startupId,
        db.select({ startupId: follows.startupId }).from(follows).where(eq(follows.userId, userId))) : undefined,
      before ? sql`(${posts.publishedAt}, ${posts.id}) < (${before.timestamp}::timestamptz, ${before.id}::uuid)` : undefined,
    ))
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(21);
  const page = rows.slice(0, 20);
  const last = page.at(-1);
  return {
    posts: page,
    nextCursor: rows.length > 20 && last
      ? Buffer.from(`${last.cursorTimestamp}|${last.id}`).toString("base64url") : null,
  };
}

export const getPublicPost = cache(async (slug: string, postId: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) return null;
  const [post] = await db.select(publicPostFields).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.id, postId), eq(startups.slug, slug), eq(posts.visibility, "public")))
    .limit(1);
  return post ?? null;
});

export async function getPostMembership(slug: string, userId: string) {
  const [member] = await db.select({ startupId: startups.id, role: startupMembers.role })
    .from(startupMembers).innerJoin(startups, eq(startups.id, startupMembers.startupId))
    .where(and(eq(startups.slug, slug), eq(startupMembers.userId, userId))).limit(1);
  return member ?? null;
}

export function isStartupMediaUrl(value: string, slug: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)
      && url.port === "" && url.username === "" && url.password === ""
      && url.search === "" && url.hash === ""
      && url.pathname.startsWith(`/startups/${slug}/`)
      && /^[-a-zA-Z0-9_.]+$/.test(url.pathname.slice(`/startups/${slug}/`.length));
  } catch {
    return false;
  }
}
