import "server-only";

import { createHash } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, loginAttempts, postComments, posts, startupMembers, startups, users } from "@/db/schema";
import { isAdmin } from "@/lib/admin";

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

export async function getPublicComments(postId: string) {
  return db.select({
    id: postComments.id,
    parentId: postComments.parentId,
    userId: postComments.userId,
    body: postComments.body,
    createdAt: postComments.createdAt,
    avatarUrl: users.avatarUrl,
    // Keep the existing public author-name fallback, without shipping an email address.
    displayName: sql<string>`coalesce(nullif(trim(${users.name}), ''), split_part(${users.email}, '@', 1))`,
  }).from(postComments)
    .innerJoin(users, eq(users.id, postComments.userId))
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(eq(postComments.postId, postId), eq(posts.visibility, "public"), isNull(postComments.deletedAt)))
    .orderBy(asc(postComments.createdAt), asc(postComments.id));
}

export type PublicComment = Awaited<ReturnType<typeof getPublicComments>>[number];

async function getCommentPost(tx: CommentTransaction, slug: string, postId: string) {
  const [post] = await tx.select({ startupId: posts.startupId }).from(posts)
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(and(eq(posts.id, postId), eq(startups.slug, slug), eq(posts.visibility, "public")))
    .for("share", { of: posts });
  return post;
}

async function allowReply(tx: CommentTransaction, userId: string) {
  const windowMs = 15 * 60 * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const hash = createHash("sha256").update(`comment-user:${userId}`).digest("hex");
  const [attempt] = await tx.insert(loginAttempts).values({ email: hash, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [loginAttempts.email, loginAttempts.windowStart],
      set: { count: sql`least(${loginAttempts.count} + 1, 31)` },
    }).returning({ count: loginAttempts.count });
  return Boolean(attempt && attempt.count <= 30);
}

export async function createComment(slug: string, postId: string, user: CommentUser, body: string, replyToId: string | null = null): Promise<CommentResult> {
  if (!body.trim() || body.length > 1000) return { status: "error", message: "Write a reply between 1 and 1,000 characters." };
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
    if (!await allowReply(tx, user.id)) return { status: "error", message: "Slow down a little." };
    await tx.insert(postComments).values({ postId, parentId, userId: user.id, body: body.trim() });
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
