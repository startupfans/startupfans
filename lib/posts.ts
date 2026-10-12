import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { posts, startupMembers, startups, users } from "@/db/schema";

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
};

export async function getPublicStartupPosts(startupId: string) {
  return db.select(publicPostFields).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.startupId, startupId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.publishedAt), desc(posts.id));
}

export type PublicPost = Awaited<ReturnType<typeof getPublicStartupPosts>>[number];

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
