import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentReactions, postComments, postReactions, posts, startups } from "@/db/schema";
import { allowRateLimit } from "@/lib/ratelimit";

export type PostReactionKind = typeof postReactions.$inferSelect.kind;
export type PostReactionCounts = Record<PostReactionKind, number>;
export type PostReactionState = { kind: PostReactionKind | null; counts: PostReactionCounts };

function reactionCounts() {
  return sql<PostReactionCounts>`json_build_object(
    'like', count(*) filter (where ${postReactions.kind} = 'like')::int,
    'heart', count(*) filter (where ${postReactions.kind} = 'heart')::int,
    'tomato', count(*) filter (where ${postReactions.kind} = 'tomato')::int
  )`;
}

export function postReactionFields(viewerId: string | null) {
  return {
    reactionCounts: sql<PostReactionCounts>`(select ${reactionCounts()} from ${postReactions}
      where ${postReactions.postId} = ${posts.id})`,
    viewerReaction: viewerId === null ? sql<PostReactionKind | null>`null`
      : sql<PostReactionKind | null>`(select ${postReactions.kind} from ${postReactions}
        where ${postReactions.postId} = ${posts.id} and ${postReactions.userId} = ${viewerId})`,
  };
}

export async function savePostReaction(postId: string, userId: string, kind: PostReactionKind | null) {
  return db.transaction(async (tx) => {
    const [post] = await tx.select({ startupId: posts.startupId, slug: startups.slug })
      .from(posts).innerJoin(startups, eq(startups.id, posts.startupId))
      .where(and(eq(posts.id, postId), eq(posts.visibility, "public"))).for("update", { of: posts });
    if (!post) return { status: "error", message: "This post couldn't be found." } as const;
    if (!await allowRateLimit(`post-reaction-user:${userId}`, 60, tx)) {
      return { status: "error", message: "Slow down a little." } as const;
    }
    const condition = and(eq(postReactions.postId, postId), eq(postReactions.userId, userId));
    const [existing] = await tx.select({ kind: postReactions.kind }).from(postReactions).where(condition);
    if (kind === null) {
      await tx.delete(postReactions).where(condition);
    } else {
      await tx.insert(postReactions).values({ postId, userId, kind }).onConflictDoUpdate({
        target: [postReactions.postId, postReactions.userId], set: { kind },
      });
    }
    const [total] = await tx.select({ counts: reactionCounts() }).from(postReactions)
      .where(eq(postReactions.postId, postId));
    return { status: "success", ...post, kind, counts: total.counts,
      previousKind: existing?.kind ?? null, changed: (existing?.kind ?? null) !== kind } as const;
  });
}

function commentReactionCounts() {
  return sql<PostReactionCounts>`json_build_object(
    'like', count(*) filter (where ${commentReactions.kind} = 'like')::int,
    'heart', count(*) filter (where ${commentReactions.kind} = 'heart')::int,
    'tomato', count(*) filter (where ${commentReactions.kind} = 'tomato')::int
  )`;
}

export function commentReactionFields(viewerId: string | null) {
  return {
    reactionCounts: sql<PostReactionCounts>`(select ${commentReactionCounts()} from ${commentReactions}
      where ${commentReactions.commentId} = ${postComments.id})`,
    viewerReaction: viewerId === null ? sql<PostReactionKind | null>`null`
      : sql<PostReactionKind | null>`(select ${commentReactions.kind} from ${commentReactions}
        where ${commentReactions.commentId} = ${postComments.id} and ${commentReactions.userId} = ${viewerId})`,
  };
}

export async function saveCommentReaction(commentId: string, userId: string, kind: PostReactionKind | null) {
  return db.transaction(async (tx) => {
    const [comment] = await tx.select({ postId: posts.id, startupId: posts.startupId, slug: startups.slug })
      .from(postComments).innerJoin(posts, eq(posts.id, postComments.postId))
      .innerJoin(startups, eq(startups.id, posts.startupId))
      .where(and(eq(postComments.id, commentId), isNull(postComments.deletedAt), eq(posts.visibility, "public")))
      .for("update", { of: [postComments, posts] });
    if (!comment) return { status: "error", message: "This reply couldn't be found." } as const;
    if (!await allowRateLimit(`comment-reaction-user:${userId}`, 60, tx)) {
      return { status: "error", message: "Slow down a little." } as const;
    }
    const condition = and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId));
    const [existing] = await tx.select({ kind: commentReactions.kind }).from(commentReactions).where(condition);
    if (kind === null) {
      await tx.delete(commentReactions).where(condition);
    } else {
      await tx.insert(commentReactions).values({ commentId, userId, kind }).onConflictDoUpdate({
        target: [commentReactions.commentId, commentReactions.userId], set: { kind },
      });
    }
    const [total] = await tx.select({ counts: commentReactionCounts() }).from(commentReactions)
      .where(eq(commentReactions.commentId, commentId));
    return { status: "success", ...comment, kind, counts: total.counts,
      previousKind: existing?.kind ?? null, changed: (existing?.kind ?? null) !== kind } as const;
  });
}
