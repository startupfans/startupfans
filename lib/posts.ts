import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { follows, postComments, postReshares, posts, startupMembers, startups, users } from "@/db/schema";
import { parseMentions, resolveMentions } from "@/lib/mentions";
import { isMediaFilename } from "@/lib/media";
import { getCurrentUser } from "@/lib/auth";
import { postReactionFields } from "@/lib/reactions";
import { postReshareFields } from "@/lib/reshares";
import { getRepliesPreviews, type RepliesPreview } from "@/lib/comments";
import { isAdmin } from "@/lib/admin";

function publicPostFields(viewerId: string | null, admin = false) {
  return {
    ...postReactionFields(viewerId),
    ...postReshareFields(viewerId),
    viewerMember: viewerId === null ? sql<boolean>`false` : sql<boolean>`exists (
      select 1 from ${startupMembers} where ${startupMembers.startupId} = ${posts.startupId} and ${startupMembers.userId} = ${viewerId})`,
    viewerFanNo: viewerId === null ? sql<number | null>`null` : sql<number | null>`(
      select ${follows.memberNo} from ${follows} where ${follows.startupId} = ${posts.startupId} and ${follows.userId} = ${viewerId})`,
    id: posts.id,
    startupId: posts.startupId,
    replyCount: sql<number>`(select count(*)::integer from ${postComments} where ${postComments.postId} = ${posts.id} and ${postComments.deletedAt} is null)`,
    canReply: sql<boolean>`${admin} or exists (select 1 from ${startupMembers} m
      where m.startup_id = ${posts.startupId} and m.user_id = ${viewerId})
      or exists (select 1 from ${follows} f where f.startup_id = ${posts.startupId} and f.user_id = ${viewerId})`,
    canModerate: sql<boolean>`${admin} or exists (select 1 from ${startupMembers} m
      where m.startup_id = ${posts.startupId} and m.user_id = ${viewerId} and m.role = 'owner')`,
    authorId: posts.authorId,
    body: posts.bodyMd,
    publishedAt: posts.publishedAt,
    mediaUrl: posts.mediaUrl,
    mediaType: posts.mediaType,
    mediaPosterUrl: posts.mediaPosterUrl,
    mediaStatus: posts.mediaStatus,
    authorName: users.name,
    authorHandle: users.handle,
    authorAvatarUrl: users.avatarUrl,
    authorEmail: users.email,
    startupName: startups.name,
    startupSlug: startups.slug,
    startupLogoUrl: startups.logoUrl,
  };
}

async function hydrateReplies<T extends { id: string; body: string; replyCount: number; canReply: boolean; canModerate: boolean }>(rows: T[], viewerId: string | null, mentionHandles: readonly string[] = []) {
  const uniquePosts = [...new Map(rows.map((post) => [post.id, post])).values()];
  const handles = [...mentionHandles, ...uniquePosts.flatMap((post) => parseMentions(post.body).map((token) => token.handle))];
  const previews = await getRepliesPreviews(uniquePosts.map((post) => post.id), viewerId, 10, handles);
  return rows.map((post) => {
    const comments = previews.get(post.id) ?? [];
    return { ...post, repliesPreview: {
      comments, total: post.replyCount, hasMore: post.replyCount > comments.length,
      viewerId, canReply: post.canReply, canModerate: post.canModerate,
    } satisfies RepliesPreview };
  });
}

type PostTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function createPostForStartup({ startupId, authorId, body, media, source }: {
  startupId: string;
  authorId: string;
  body: string;
  media: { url: string; type: "image" | "video" } | null;
  source: "web" | "slack" | "mcp";
}, transaction?: PostTransaction) {
  if (!body.trim() || body.length > 5000) throw new Error("Post body must have 1 to 5,000 characters.");
  const create = async (tx: PostTransaction) => {
    const [member] = await tx.select().from(startupMembers)
      .where(and(eq(startupMembers.startupId, startupId), eq(startupMembers.userId, authorId)))
      .for("share");
    if (!member) throw new Error("Only team members can post.");
    const [post] = await tx.insert(posts).values({
      startupId, authorId, bodyMd: body.trim(), source, visibility: "public",
      mediaUrl: media?.url ?? null, mediaType: media?.type ?? null,
    }).returning({ id: posts.id });
    return post;
  };
  return transaction ? create(transaction) : db.transaction(create);
}

export async function getPublicStartupPosts(startupId: string) {
  const user = await getCurrentUser();
  const rows = await db.select(publicPostFields(user?.id ?? null, isAdmin(user))).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.startupId, startupId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.publishedAt), desc(posts.id));
  return hydrateReplies(rows, user?.id ?? null);
}

export type PublicPost = Omit<Awaited<ReturnType<typeof getPublicStartupPosts>>[number], "repliesPreview"> & { repliesPreview?: RepliesPreview };

export type TimelineItem =
  | { kind: "post"; id: string; timestamp: string; post: PublicPost }
  | { kind: "reshare"; id: string; timestamp: string; post: PublicPost;
      resharer: { name: string | null; handle: string; avatarUrl: string | null }; note: string | null; imageUrl: string | null; createdAt: Date };

const resharers = alias(users, "resharers");
const reshareId = sql<string>`(${postReshares.postId}::text || ':' || ${postReshares.userId}::text) collate "C"`;
const postTimelineId = sql<string>`${posts.id}::text collate "C"`;

function parseFeedCursor(cursor?: string) {
  if (!cursor || cursor.length > 256) return null;
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const match = new RegExp(`^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{6}Z)\\|(post|reshare)\\|(${uuid}(?::${uuid})?)$`)
    .exec(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!match) return null;
  const [, timestamp, kind, id] = match;
  if ((kind === "reshare") !== id.includes(":")) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== timestamp.replace(/(\.\d{3})\d{3}Z$/, "$1Z")) return null;
  return { timestamp, kind, id };
}

export async function listFeed({ userId, following = false, cursor, authorId }: {
  userId?: string;
  following?: boolean;
  cursor?: string;
  authorId?: string;
} = {}): Promise<{ items: TimelineItem[]; nextCursor: string | null }> {
  if (following && !userId) return { items: [], nextCursor: null };
  const user = await getCurrentUser();
  const viewerId = user?.id ?? null;
  const before = parseFeedCursor(cursor);
  const postQuery = db.select({
    ...publicPostFields(viewerId, isAdmin(user)),
    cursorTimestamp: sql<string>`to_char(${posts.publishedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(
      eq(posts.visibility, "public"),
      authorId ? eq(posts.authorId, authorId) : undefined,
      following && userId ? inArray(posts.startupId,
        db.select({ startupId: follows.startupId }).from(follows).where(eq(follows.userId, userId))) : undefined,
      before ? sql`(${posts.publishedAt}, 'post'::text collate "C", ${postTimelineId}) <
        (${before.timestamp}::timestamptz, ${before.kind}::text collate "C", ${before.id}::text collate "C")` : undefined,
    ))
    .orderBy(desc(posts.publishedAt), desc(postTimelineId)).limit(21);
  const reshareQuery = following ? Promise.resolve([]) : db.select({
    post: publicPostFields(viewerId, isAdmin(user)),
    id: reshareId,
    cursorTimestamp: sql<string>`to_char(${postReshares.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    createdAt: postReshares.createdAt,
    note: postReshares.note,
    imageUrl: postReshares.imageUrl,
    resharer: { name: resharers.name, handle: resharers.handle, avatarUrl: resharers.avatarUrl },
  }).from(postReshares)
    .innerJoin(posts, eq(posts.id, postReshares.postId))
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .innerJoin(resharers, eq(resharers.id, postReshares.userId))
    .where(and(
      eq(posts.visibility, "public"),
      authorId ? eq(postReshares.userId, authorId) : undefined,
      before ? sql`(${postReshares.createdAt}, 'reshare'::text collate "C", ${reshareId}) <
        (${before.timestamp}::timestamptz, ${before.kind}::text collate "C", ${before.id}::text collate "C")` : undefined,
    ))
    .orderBy(desc(postReshares.createdAt), desc(reshareId)).limit(21);
  const [postRows, reshareRows] = await Promise.all([postQuery, reshareQuery]);
  const merged: TimelineItem[] = [
    ...postRows.map((post): TimelineItem => ({ kind: "post", id: post.id, timestamp: post.cursorTimestamp, post })),
    ...reshareRows.map(({ cursorTimestamp, ...item }): TimelineItem => ({ kind: "reshare", timestamp: cursorTimestamp, ...item })),
  ];
  const compare = (a: string, b: string) => a < b ? 1 : a > b ? -1 : 0;
  merged.sort((a, b) => compare(a.timestamp, b.timestamp) || compare(a.kind, b.kind) || compare(a.id, b.id));
  const page = merged.slice(0, 20);
  const noteHandles = page.flatMap((item) => item.kind === "reshare" && item.note
    ? parseMentions(item.note, false).map((token) => token.handle) : []);
  const hydrated = await hydrateReplies(page.map((item) => item.post), viewerId, noteHandles);
  const postsById = new Map(hydrated.map((post) => [post.id, post]));
  const items = page.map((item) => {
    const post = postsById.get(item.post.id);
    if (!post) throw new Error("Timeline post preview missing.");
    return { ...item, post };
  });
  const last = page.at(-1);
  return {
    items,
    nextCursor: merged.length > 20 && last
      ? Buffer.from(`${last.timestamp}|${last.kind}|${last.id}`).toString("base64url") : null,
  };
}

export const getPublicPost = cache(async (slug: string, postId: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) return null;
  const [post] = await db.select(publicPostFields((await getCurrentUser())?.id ?? null)).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.id, postId), eq(startups.slug, slug), eq(posts.visibility, "public")))
    .limit(1);
  if (post) await resolveMentions([post.body]);
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
      && isMediaFilename(url.pathname.slice(`/startups/${slug}/`.length));
  } catch {
    return false;
  }
}

export async function getPublicUserPosts(userId: string) {
  const user = await getCurrentUser();
  const rows = await db.select(publicPostFields(user?.id ?? null, isAdmin(user))).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.authorId, userId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.publishedAt), desc(posts.id)).limit(20);
  return hydrateReplies(rows, user?.id ?? null);
}
