import "server-only";

import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentReactions, follows, postComments, posts, startupMembers, startups, users } from "@/db/schema";
import { mentionSegments, parseMentions, resolveMentionHandles } from "@/lib/mentions";
import { isAdmin } from "@/lib/admin";
import { commentReactionFields, type PostReactionCounts, type PostReactionKind } from "@/lib/reactions";
import { isReplyImageUrl } from "@/lib/media";
import { allowRateLimit } from "@/lib/ratelimit";
import { captureMentionNotifications, notifyActivity, notifyMentions } from "@/lib/notifications";

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

async function resolveCommentMentions<T extends { body: string }>(comments: T[], mentionHandles: readonly string[] = []) {
  const parsed = comments.map((comment) => ({ comment, tokens: parseMentions(comment.body, false) }));
  const handles = [...new Set([
    ...parsed.flatMap(({ tokens }) => tokens.map((token) => token.handle)),
    ...mentionHandles,
  ])];
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

export async function getRepliesPreviews(postIds: string[], viewerId: string | null, limit = 10, mentionHandles: readonly string[] = []) {
  const previews = new Map<string, ReplyComment[]>();
  if (!postIds.length) return previews;
  const previewLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.trunc(limit))) : 10;
  const fields = {
    id: postComments.id, postId: postComments.postId, parentId: postComments.parentId,
    userId: postComments.userId, body: postComments.body, imageUrl: postComments.imageUrl,
    createdAt: postComments.createdAt, avatarUrl: users.avatarUrl,
    displayName: sql<string>`coalesce(nullif(trim(${users.name}), ''), split_part(${users.email}, '@', 1))`.as("display_name"),
  };
  const rootsQuery = db.select({
    ...fields,
    deletedAt: postComments.deletedAt,
    rank: sql<number>`row_number() over (partition by ${postComments.postId} order by ${postComments.createdAt} desc, ${postComments.id} desc)`.as("thread_rank"),
  }).from(postComments).innerJoin(users, eq(users.id, postComments.userId))
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(inArray(postComments.postId, postIds), eq(posts.visibility, "public"), isNull(postComments.parentId),
      or(isNull(postComments.deletedAt), sql`exists (
        select 1 from post_comments child where child.parent_id = ${postComments.id}
        and child.post_id = ${postComments.postId} and child.deleted_at is null
      )`))).as("ranked_threads");
  const roots = await db.select().from(rootsQuery).where(lte(rootsQuery.rank, previewLimit))
    .orderBy(asc(rootsQuery.createdAt), asc(rootsQuery.id));
  const nestedQuery = db.select({
    ...fields,
    rank: sql<number>`row_number() over (partition by ${postComments.parentId} order by ${postComments.createdAt}, ${postComments.id})`.as("reply_rank"),
  }).from(postComments).innerJoin(users, eq(users.id, postComments.userId))
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(inArray(postComments.parentId, roots.map((root) => root.id)),
      inArray(postComments.postId, postIds), eq(posts.visibility, "public"), isNull(postComments.deletedAt))).as("ranked_replies");
  const nested = roots.length ? await db.select().from(nestedQuery).where(lte(nestedQuery.rank, 10))
    .orderBy(asc(nestedQuery.createdAt), asc(nestedQuery.id)) : [];
  const children = new Map<string, typeof nested>();
  for (const reply of nested) {
    if (reply.parentId !== null) {
      const siblings = children.get(reply.parentId) ?? [];
      siblings.push(reply);
      children.set(reply.parentId, siblings);
    }
  }
  const comments = roots.flatMap((root) => [
    ...(root.deletedAt === null ? [root] : []), ...(children.get(root.id) ?? []),
  ]);
  const reactions = comments.length ? await db.select({
    commentId: commentReactions.commentId,
    reactionCounts: sql<PostReactionCounts>`json_build_object(
      'heart', count(*) filter (where ${commentReactions.kind} = 'heart')::int,
      'tomato', count(*) filter (where ${commentReactions.kind} = 'tomato')::int
    )`,
    viewerReaction: sql<PostReactionKind | null>`max(${commentReactions.kind}) filter (where ${commentReactions.userId} = ${viewerId})`,
  }).from(commentReactions).where(inArray(commentReactions.commentId, comments.map((comment) => comment.id)))
    .groupBy(commentReactions.commentId) : [];
  const reactionById = new Map(reactions.map((reaction) => [reaction.commentId, reaction]));
  const resolved = await resolveCommentMentions(comments, mentionHandles);
  for (const comment of resolved) {
    const reaction = reactionById.get(comment.id);
    const preview = previews.get(comment.postId) ?? [];
    preview.push({
      id: comment.id, parentId: comment.parentId, userId: comment.userId, body: comment.body,
      imageUrl: comment.imageUrl, createdAt: comment.createdAt.toISOString(), avatarUrl: comment.avatarUrl,
      displayName: comment.displayName, mentions: comment.mentions,
      reactionCounts: reaction?.reactionCounts ?? { heart: 0, tomato: 0 },
      viewerReaction: reaction?.viewerReaction ?? null,
    });
    previews.set(comment.postId, preview);
  }
  return previews;
}

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
  const result = await db.transaction(async (tx): Promise<Extract<CommentResult, { status: "error" }> | {
    status: "success"; startupId: string; recipientCount: number; commentId: string; nested: boolean;
  }> => {
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
    const [comment] = await tx.insert(postComments).values({ postId, parentId, userId: user.id, body: body.trim(), imageUrl })
      .returning({ id: postComments.id });
    const recipientCount = await notifyMentions({ body: body.trim(), actorId: user.id, postId, commentId: comment.id }, tx);
    return { status: "success", startupId: post.startupId, recipientCount, commentId: comment.id, nested: parentId !== null };
  });
  if (result.status === "error") return result;
  notifyActivity({ kind: "reply", actorId: user.id, postId, startupId: result.startupId, commentId: result.commentId });
  if (result.nested) notifyActivity({ kind: "reply_to_reply", actorId: user.id, postId, startupId: result.startupId, commentId: result.commentId });
  await captureMentionNotifications({ actorId: user.id, postId, startupId: result.startupId, recipientCount: result.recipientCount });
  return { status: "success", startupId: result.startupId };
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
