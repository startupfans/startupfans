import "server-only";

import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, postComments, posts, startupMembers, startups, users } from "@/db/schema";
import { mentionSegments, parseMentions, resolveMentionHandles } from "@/lib/mentions";
import { isAdmin } from "@/lib/admin";
import { commentReactionFields } from "@/lib/reactions";
import { isReplyImageUrl } from "@/lib/media";
import { allowRateLimit } from "@/lib/ratelimit";

type CommentUser = { id: string; email: string };
type CommentTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CommentResult =
  | { status: "success"; startupId: string }
  | { status: "error"; message: string };

export async function getCommentAccess(startupId: string, user: CommentUser, tx?: CommentTransaction) {
  const database = tx ?? db;
  const [member] = await database.select({ role: startupMembers.role }).from(startupMembers)
    .where(and(eq(startupMembers.startupId, startupId), eq(startupMembers.userId, user.id)))
    .for("share");
  const [follow] = await database.select({ userId: follows.userId }).from(follows)
    .where(and(eq(follows.startupId, startupId), eq(follows.userId, user.id))).for("share");
  return { canReply: isAdmin(user) || Boolean(member || follow), canModerate: isAdmin(user) || member?.role === "owner" };
}

function commentQuery(postId: string, viewerId: string | null = null, threadIds?: string[]) {
  return db.select({
    id: postComments.id,
    parentId: postComments.parentId,
    userId: postComments.userId,
    body: postComments.body,
    imageUrl: postComments.imageUrl,
    createdAt: postComments.createdAt,
    avatarUrl: users.avatarUrl,
    ...commentReactionFields(viewerId),
    // Keep the existing public author-name fallback, without shipping an email address.
    displayName: sql<string>`coalesce(nullif(trim(${users.name}), ''), split_part(${users.email}, '@', 1))`,
  }).from(postComments)
    .innerJoin(users, eq(users.id, postComments.userId))
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(eq(postComments.postId, postId), eq(posts.visibility, "public"), isNull(postComments.deletedAt),
      threadIds ? or(inArray(postComments.id, threadIds), inArray(postComments.parentId, threadIds)) : undefined))
    .orderBy(asc(postComments.createdAt), asc(postComments.id));
}

async function resolveCommentMentions(comments: Awaited<ReturnType<typeof commentQuery>>) {
  const parsed = comments.map((comment) => ({ comment, tokens: parseMentions(comment.body, false) }));
  const handles = [...new Set(parsed.flatMap(({ tokens }) => tokens.map((token) => token.handle)))];
  const mentions = await resolveMentionHandles(handles);
  return parsed.map(({ comment, tokens }) => ({ ...comment, mentions: mentionSegments(comment.body, mentions, tokens) }));
}

export async function getPublicComments(postId: string, viewerId: string | null = null) {
  return resolveCommentMentions(await commentQuery(postId, viewerId));
}

export type PublicComment = Awaited<ReturnType<typeof getPublicComments>>[number];

export type ReplyComment = Omit<PublicComment, "createdAt"> & { createdAt: string };
export type RepliesPreview = {
  comments: ReplyComment[];
  total: number;
  hasMore: boolean;
  viewerId: string | null;
  canReply: boolean;
  canModerate: boolean;
};

export async function getRepliesPreview(postId: string, viewerId: string | null, limit: number) {
  const [post] = await db.select({ startupId: posts.startupId }).from(posts)
    .where(and(eq(posts.id, postId), eq(posts.visibility, "public"))).limit(1);
  if (!post) return null;
  const previewLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.trunc(limit))) : 3;
  const [roots, counts] = await Promise.all([
    db.select({ id: postComments.id }).from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.parentId),
        or(isNull(postComments.deletedAt), sql`exists (
          select 1 from post_comments child where child.parent_id = ${postComments.id}
          and child.post_id = ${postId} and child.deleted_at is null
        )`)))
      .orderBy(desc(postComments.createdAt), desc(postComments.id)).limit(previewLimit + 1),
    db.select({ total: sql<number>`count(*)::int` }).from(postComments)
      .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt))),
  ]);
  const comments = await resolveCommentMentions(roots.length
    ? await commentQuery(postId, viewerId, roots.slice(0, previewLimit).map((root) => root.id)) : []);
  return { startupId: post.startupId, comments, total: counts[0]?.total ?? 0, hasMore: roots.length > previewLimit };
}

async function getCommentPost(tx: CommentTransaction, slug: string, postId: string) {
  const [post] = await tx.select({ startupId: posts.startupId }).from(posts)
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.id, postId), eq(startups.slug, slug), eq(posts.visibility, "public")))
    .for("share", { of: posts });
  return post;
}

export async function createComment(slug: string, postId: string, user: CommentUser, body: string, replyToId: string | null = null, imageUrl: string | null = null): Promise<CommentResult> {
  if (!body.trim() || body.length > 1000) return { status: "error", message: "Write a reply between 1 and 1,000 characters." };
  if (imageUrl !== null && !isReplyImageUrl(imageUrl, user.id)) {
    return { status: "error", message: "Choose an uploaded image for your reply." };
  }
  return db.transaction(async (tx) => {
    const post = await getCommentPost(tx, slug, postId);
    if (!post) return { status: "error", message: "This post couldn't be found." };
    const access = await getCommentAccess(post.startupId, user, tx);
    if (!access.canReply) return { status: "error", message: "Become a fan to reply." };
    let parentId: string | null = null;
    if (replyToId !== null) {
      const [target] = await tx.select({ id: postComments.id, parentId: postComments.parentId }).from(postComments)
        .where(and(eq(postComments.id, replyToId), eq(postComments.postId, postId), isNull(postComments.deletedAt)))
        .for("share");
      if (!target) return { status: "error", message: "This reply couldn't be found." };
      parentId = target.parentId ?? target.id;
      if (target.parentId !== null) {
        const [root] = await tx.select({ id: postComments.id }).from(postComments)
          .where(and(eq(postComments.id, parentId), eq(postComments.postId, postId),
            isNull(postComments.parentId), isNull(postComments.deletedAt))).for("share");
        if (!root) return { status: "error", message: "This reply couldn't be found." };
      }
    }
    if (!await allowRateLimit(`comment-user:${user.id}`, 30, tx)) return { status: "error", message: "Slow down a little." };
    await tx.insert(postComments).values({ postId, parentId, userId: user.id, body: body.trim(), imageUrl });
    return { status: "success", startupId: post.startupId };
  });
}

export async function deleteComment(slug: string, postId: string, commentId: string, user: CommentUser): Promise<CommentResult> {
  return db.transaction(async (tx) => {
    const post = await getCommentPost(tx, slug, postId);
    if (!post) return { status: "error", message: "This post couldn't be found." };
    const access = await getCommentAccess(post.startupId, user, tx);
    const [deleted] = await tx.update(postComments).set({ deletedAt: new Date() }).where(and(
      eq(postComments.id, commentId), eq(postComments.postId, postId), isNull(postComments.deletedAt),
      access.canModerate ? undefined : eq(postComments.userId, user.id),
    )).returning({ id: postComments.id });
    if (!deleted) return { status: "error", message: "Only the author or a team owner can delete this reply." };
    return { status: "success", startupId: post.startupId };
  });
}
