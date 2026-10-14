import "server-only";

import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { commentReactions, postComments, postReactions, posts, startups, sessions, loginAttempts } from "@/db/schema";

export type PostReactionKind = typeof postReactions.$inferSelect.kind;
export type PostReactionCounts = Record<PostReactionKind, number>;
export type PostReactionState = { kind: PostReactionKind | null; counts: PostReactionCounts };

function reactionCounts() {
  return sql<PostReactionCounts>`json_build_object(
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

async function saveReaction({ target, table, targetColumn, targetId, sessionId, kind, namespace, missingMessage, signInMessage }: {
  target: SQL;
  table: typeof postReactions | typeof commentReactions;
  targetColumn: typeof postReactions.postId | typeof commentReactions.commentId;
  targetId: string;
  sessionId: string;
  kind: PostReactionKind | null;
  namespace: "post-reaction-user:" | "comment-reaction-user:";
  missingMessage: string;
  signInMessage: string;
}) {
  const column = sql.identifier(targetColumn.name);
  const windowStart = new Date(Math.floor(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000)).toISOString();
  const mutation = kind === null
    ? sql`delete from ${table} where ${targetColumn} = ${targetId}
        and ${table.userId} = (select user_id from viewer)
        and exists (select 1 from rate where count <= 60) returning kind`
    : sql`insert into ${table} (${column}, user_id, kind)
        select ${targetId}::uuid, viewer.user_id, ${kind} from viewer, rate where rate.count <= 60
        on conflict (${column}, user_id) do update set kind = excluded.kind returning kind`;
  // Match lib/ratelimit's namespaced SHA-256 counter and 15-minute window in this statement.
  // CTE reads share the pre-write snapshot. Exclude this viewer and add the returned row.
  const [result] = await db.execute<PostReactionState & {
    userId: string | null; startupId: string | null; slug: string | null; postId: string | null;
    previousKind: PostReactionKind | null; limited: boolean;
  }>(sql`
    with viewer as (select ${sessions.userId} as user_id from ${sessions}
      where ${sessions.id} = ${sessionId} and ${sessions.expiresAt} > now() for share of ${sessions}),
    target as (${target}),
    rate as (insert into ${loginAttempts} (email, window_start, count)
      select encode(sha256(convert_to(${namespace} || viewer.user_id::text, 'UTF8')), 'hex'),
        ${windowStart}::timestamptz, 1 from viewer, target
      on conflict (email, window_start) do update set count = least(${loginAttempts.count} + 1, 61)
      returning count),
    previous as (select ${table.kind} as kind from ${table}
      where ${targetColumn} = ${targetId} and ${table.userId} = (select user_id from viewer)),
    saved as (${mutation}),
    remaining as (select ${table.kind} as kind from ${table}
      where ${targetColumn} = ${targetId} and ${table.userId} <> (select user_id from viewer)
      ${kind === null ? sql`` : sql`union all select kind from saved`})
    select viewer.user_id as "userId", target.*, ${kind}::text as kind,
      coalesce(rate.count > 60, false) as limited, (select kind from previous) as "previousKind",
      (select json_build_object(
        'heart', count(*) filter (where kind = 'heart')::int,
        'tomato', count(*) filter (where kind = 'tomato')::int
      ) from remaining) as counts
    from (select 1) response left join viewer on true left join target on true left join rate on true
  `);
  if (!result?.userId) return { status: "error", message: signInMessage } as const;
  if (!result.startupId || !result.postId || !result.slug) return { status: "error", message: missingMessage } as const;
  if (result.limited) return { status: "error", message: "Slow down a little." } as const;
  return { status: "success", userId: result.userId, startupId: result.startupId, postId: result.postId,
    slug: result.slug, kind: result.kind, counts: result.counts, previousKind: result.previousKind,
    changed: result.previousKind !== kind } as const;
}

export async function savePostReaction(postId: string, sessionId: string, kind: PostReactionKind | null) {
  return saveReaction({
    target: sql`select ${posts.startupId} as "startupId", ${startups.slug} as slug, ${posts.id} as "postId"
      from ${posts} inner join ${startups} on ${startups.id} = ${posts.startupId}
      where ${posts.id} = ${postId} and ${posts.visibility} = 'public' for share of ${posts}`,
    table: postReactions, targetColumn: postReactions.postId, targetId: postId, sessionId, kind,
    namespace: "post-reaction-user:", missingMessage: "This post couldn't be found.", signInMessage: "Sign in to react to a post.",
  });
}

function commentReactionCounts() {
  return sql<PostReactionCounts>`json_build_object(
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

export async function saveCommentReaction(commentId: string, sessionId: string, kind: PostReactionKind | null) {
  return saveReaction({
    target: sql`select ${posts.id} as "postId", ${posts.startupId} as "startupId", ${startups.slug} as slug
      from ${postComments} inner join ${posts} on ${posts.id} = ${postComments.postId}
      inner join ${startups} on ${startups.id} = ${posts.startupId}
      where ${postComments.id} = ${commentId} and ${postComments.deletedAt} is null
        and ${posts.visibility} = 'public' for share of ${postComments}, ${posts}`,
    table: commentReactions, targetColumn: commentReactions.commentId, targetId: commentId, sessionId, kind,
    namespace: "comment-reaction-user:", missingMessage: "This reply couldn't be found.", signInMessage: "Sign in to react to a reply.",
  });
}
