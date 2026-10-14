import "server-only";

import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { notifications, postComments, posts, startups, users } from "@/db/schema";
import { isValidSessionId } from "@/lib/auth";
import { parseMentions } from "@/lib/mentions";
import { captureServerEvent } from "@/lib/posthog-server";

type NotificationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function notifyMentions({ body, actorId, postId, commentId = null }: {
  body: string;
  actorId: string;
  postId: string;
  commentId?: string | null;
}, tx: NotificationTransaction) {
  const handles = [...new Set(parseMentions(body, commentId === null).map((token) => token.handle))];
  if (!handles.length) return 0;
  const recipients = await tx.select({ id: users.id }).from(users)
    .where(and(inArray(users.handle, handles), ne(users.id, actorId)));
  if (!recipients.length) return 0;
  const inserted = await tx.insert(notifications).values(recipients.map((recipient) => ({
    userId: recipient.id, kind: "mention" as const, actorId, postId, commentId,
  }))).onConflictDoNothing().returning({ id: notifications.id });
  return inserted.length;
}

export async function captureMentionNotifications({ actorId, postId, startupId, recipientCount }: {
  actorId: string;
  postId: string;
  startupId: string;
  recipientCount: number;
}) {
  if (recipientCount === 0) return;
  await captureServerEvent({
    distinctId: actorId,
    event: "mention_notified",
    properties: { recipient_count: recipientCount, post_id: postId, startup_id: startupId },
  });
}

function visibleNotification() {
  return and(eq(posts.visibility, "public"), or(isNull(notifications.commentId), isNull(postComments.deletedAt)));
}

export const getUnreadNotificationCount = cache(async (userId: string) => {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(notifications)
    .innerJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(postComments, eq(postComments.id, notifications.commentId))
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), visibleNotification()));
  return row?.count ?? 0;
});

function parseCursor(cursor?: string) {
  if (!cursor || cursor.length > 128) return null;
  const [timestamp, id, extra] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  if (extra !== undefined || !timestamp || !id || !isValidSessionId(id)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(timestamp)) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== timestamp.replace(/(\.\d{3})\d{3}Z$/, "$1Z")) return null;
  return { timestamp, id };
}

export async function listNotifications(userId: string, cursor?: string) {
  const before = parseCursor(cursor);
  const rows = await db.select({
    id: notifications.id,
    commentId: notifications.commentId,
    postId: notifications.postId,
    createdAt: notifications.createdAt,
    readAt: notifications.readAt,
    actorName: users.name,
    actorHandle: users.handle,
    actorAvatarUrl: users.avatarUrl,
    startupName: startups.name,
    startupSlug: startups.slug,
    body: sql<string>`coalesce(${postComments.body}, ${posts.bodyMd})`,
    cursorTimestamp: sql<string>`to_char(${notifications.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(notifications)
    .innerJoin(users, eq(users.id, notifications.actorId))
    .innerJoin(posts, eq(posts.id, notifications.postId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .leftJoin(postComments, eq(postComments.id, notifications.commentId))
    .where(and(eq(notifications.userId, userId), visibleNotification(),
      before ? sql`(${notifications.createdAt}, ${notifications.id}) < (${before.timestamp}::timestamptz, ${before.id}::uuid)` : undefined))
    .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(51);
  const items = rows.slice(0, 50);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > 50 && last
      ? Buffer.from(`${last.cursorTimestamp}|${last.id}`).toString("base64url") : null,
  };
}

export async function markNotificationsRead(userId: string, ids: readonly string[]) {
  if (!ids.length) return;
  await db.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), inArray(notifications.id, [...ids]), isNull(notifications.readAt)));
}

export function mentionExcerpt(body: string, handle: string, markdown: boolean) {
  const token = parseMentions(body, markdown).find((mention) => mention.handle === handle);
  const start = Math.max(0, (token?.start ?? 0) - 50);
  const end = Math.min(body.length, (token?.end ?? 0) + 100);
  return `${start > 0 ? "…" : ""}${body.slice(start, end).replace(/\s+/g, " ").trim()}${end < body.length ? "…" : ""}`;
}
