import "server-only";

import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { cache } from "react";
import { db } from "@/db";
import { notificationKinds, notificationSettings, notifications, postComments, posts, startupMembers, startups, users } from "@/db/schema";
import { isValidSessionId } from "@/lib/auth";
import { parseMentions } from "@/lib/mentions";
import { captureServerEvent } from "@/lib/posthog-server";
import { sendEmail } from "@/lib/email";
import { mentionEmail } from "@/lib/emails/mention";
import { replyEmail } from "@/lib/emails/reply";
import { newFanEmail } from "@/lib/emails/new-fan";
import { reshareEmail } from "@/lib/emails/reshare";
import { teamJoinedEmail } from "@/lib/emails/team-joined";

type NotificationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NotificationKind = typeof notificationKinds[number];
export const notificationLabels = {
  mention: "mentions", reply: "replies to your posts", reply_to_reply: "replies to your replies",
  new_fan: "new fans", reshare: "reshares", team_joined: "team joins",
} satisfies Record<NotificationKind, string>;

export function isNotificationKind(value: string): value is NotificationKind {
  return notificationKinds.some((kind) => kind === value);
}

function unsubscribeSignature(userId: string, kind: NotificationKind) {
  const secret = process.env.NOTIFY_EMAIL_SECRET;
  if (!secret || secret.length < 32) throw new Error("Notification email signing is not configured.");
  return createHmac("sha256", secret).update(`${userId}|${kind}`).digest("hex");
}

export function notificationUnsubscribeUrl(userId: string, kind: NotificationKind) {
  const origin = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/notifications/unsubscribe?${new URLSearchParams({ user: userId, kind, token: unsubscribeSignature(userId, kind) })}`;
}

export async function unsubscribeNotificationEmail(userId: string, kind: string, token: string) {
  if (!isValidSessionId(userId) || !isNotificationKind(kind) || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    if (!timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(unsubscribeSignature(userId, kind), "hex"))) return false;
  } catch { return false; }
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) return false;
  await db.insert(notificationSettings).values({ userId, kind, email: false })
    .onConflictDoUpdate({ target: [notificationSettings.userId, notificationSettings.kind], set: { email: false } });
  return true;
}

export async function getNotificationSettings(userId: string) {
  const [rows, [user]] = await Promise.all([
    db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId)),
    db.select({ emailPaused: users.emailPaused }).from(users).where(eq(users.id, userId)),
  ]);
  return { emailPaused: user?.emailPaused ?? false, kinds: notificationKinds.map((kind) => {
    const setting = rows.find((row) => row.kind === kind);
    return { kind, label: notificationLabels[kind], inApp: setting?.inApp ?? true, email: setting?.email ?? true };
  }) };
}

type NotificationSource = {
  kind: NotificationKind; actorId: string; postId: string | null; commentId: string | null;
  startupId: string | null; actorStartupId: string | null;
};

async function insertNotifications(source: NotificationSource, recipientIds: string[], tx: NotificationTransaction) {
  const ids = [...new Set(recipientIds)].filter((id) => id !== source.actorId);
  if (!ids.length) return { count: 0, deliveries: [] };
  const settings = await tx.select().from(notificationSettings)
    .where(and(inArray(notificationSettings.userId, ids), eq(notificationSettings.kind, source.kind)));
  const deliveries: { userId: string; notificationId: string | null }[] = [];
  let count = 0;
  for (const userId of ids) {
    const setting = settings.find((row) => row.userId === userId);
    if (setting?.inApp === false) {
      if (setting.email) deliveries.push({ userId, notificationId: null });
      continue;
    }
    const [row] = await tx.insert(notifications).values({ ...source, userId })
      .onConflictDoNothing().returning({ id: notifications.id });
    if (row) {
      count++;
      deliveries.push({ userId, notificationId: row.id });
    }
  }
  return { count, deliveries };
}

async function deliverNotificationEmail(source: NotificationSource, userId: string, notificationId: string | null) {
  const delivery = await db.transaction(async (tx) => {
    // Serialize the coalescing reservation, including email-only preferences, before sending.
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user || user.emailPaused) return;
    const [setting] = await tx.select().from(notificationSettings)
      .where(and(eq(notificationSettings.userId, userId), eq(notificationSettings.kind, source.kind)));
    if (setting?.email === false || (setting?.lastEmailedAt && Date.now() - setting.lastEmailedAt.getTime() < 600_000)) return;
    const actorStartup = alias(startups, "email_actor_startup");
    const [detail] = await tx.select({
      actorName: users.name, actorHandle: users.handle, actorStartupName: actorStartup.name,
      startupName: startups.name, startupSlug: startups.slug, body: sql<string>`coalesce(${postComments.body}, ${posts.bodyMd}, '')`,
    }).from(users)
      .leftJoin(posts, eq(posts.id, source.postId ?? "00000000-0000-0000-0000-000000000000"))
      .innerJoin(startups, eq(startups.id, sql`coalesce(${source.startupId}::uuid, ${posts.startupId})`))
      .leftJoin(postComments, eq(postComments.id, source.commentId ?? "00000000-0000-0000-0000-000000000000"))
      .leftJoin(actorStartup, eq(actorStartup.id, source.actorStartupId ?? "00000000-0000-0000-0000-000000000000"))
      .where(and(eq(users.id, source.actorId),
        source.postId ? eq(posts.visibility, "public") : undefined,
        source.commentId ? and(sql`${postComments.id} is not null`, isNull(postComments.deletedAt)) : undefined));
    if (!detail) return;
    const [unread] = await tx.select({ count: sql<number>`count(*)::int` }).from(notifications)
      .leftJoin(posts, eq(posts.id, notifications.postId))
      .leftJoin(postComments, eq(postComments.id, notifications.commentId))
      .where(and(eq(notifications.userId, userId), eq(notifications.kind, source.kind), isNull(notifications.readAt),
        isNull(notifications.emailedAt), visibleNotification(),
        notificationId ? ne(notifications.id, notificationId) : undefined,
        setting?.lastEmailedAt ? gt(notifications.createdAt, setting.lastEmailedAt) : undefined));
    const origin = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const content = {
      actor: detail.actorStartupName ?? (detail.actorName?.trim() || detail.actorHandle),
      startup: detail.startupName,
      url: `${origin}${notificationTarget({ ...source, startupSlug: detail.startupSlug, actorHandle: detail.actorHandle })}`,
      settingsUrl: `${origin}/me/notifications`, unsubscribeUrl: notificationUnsubscribeUrl(userId, source.kind),
      excerpt: source.kind === "mention" ? mentionExcerpt(detail.body, user.handle, source.commentId === null)
        : source.kind === "reply" || source.kind === "reply_to_reply" ? detail.body.slice(0, 160) : "",
      more: unread?.count ?? 0,
    };
    const renderers = {
      mention: () => mentionEmail(content), reply: () => replyEmail(content), reply_to_reply: () => replyEmail(content, true),
      new_fan: () => newFanEmail(content), reshare: () => reshareEmail(content), team_joined: () => teamJoinedEmail(content),
    } satisfies Record<NotificationKind, () => ReturnType<typeof mentionEmail>>;
    const email = { to: user.email, ...renderers[source.kind](),
      fallbackLog: `[startupfans notification email: dev fallback] kind=${source.kind}` };
    const now = new Date();
    if (notificationId) {
      const [reserved] = await tx.update(notifications).set({ emailedAt: now })
        .where(and(eq(notifications.id, notificationId), isNull(notifications.emailedAt)))
        .returning({ id: notifications.id });
      if (!reserved) return;
    }
    await tx.insert(notificationSettings).values({ userId, kind: source.kind, lastEmailedAt: now })
      .onConflictDoUpdate({ target: [notificationSettings.userId, notificationSettings.kind], set: { lastEmailedAt: now } });
    return { email, now, lastEmailedAt: setting?.lastEmailedAt ?? null };
  });
  if (!delivery) return;
  try {
    await sendEmail(delivery.email);
  } catch (error) {
    // Restore only this reservation; a newer delivery must retain its coalescing clock.
    await db.execute(sql`
      with cleared_notification as (
        update ${notifications} set emailed_at = null
        where id = ${notificationId}::uuid and emailed_at = ${delivery.now.toISOString()}::timestamptz
      )
      update ${notificationSettings} set last_emailed_at = ${delivery.lastEmailedAt?.toISOString() ?? null}::timestamptz
      where user_id = ${userId}::uuid and kind = ${source.kind}
        and last_emailed_at = ${delivery.now.toISOString()}::timestamptz
    `);
    throw error;
  }
}

function scheduleEmails(source: NotificationSource, deliveries: { userId: string; notificationId: string | null }[]) {
  if (!deliveries.length) return;
  after(async () => {
    for (const delivery of deliveries) {
      try { await deliverNotificationEmail(source, delivery.userId, delivery.notificationId); }
      catch { console.error("[startupfans notifications] email delivery failed"); }
    }
  });
}

export async function notifyMentions({ body, actorId, postId, commentId = null, markdown = commentId === null }: {
  body: string; actorId: string; postId: string; commentId?: string | null; markdown?: boolean;
}, tx: NotificationTransaction) {
  try {
    const handles = [...new Set(parseMentions(body, markdown).map((token) => token.handle))];
    if (!handles.length) return 0;
    const source = { kind: "mention", actorId, postId, commentId, startupId: null, actorStartupId: null } as const;
    // A savepoint lets a notification failure leave the content transaction intact.
    const result = await tx.transaction(async (savepoint) => {
      const recipients = await savepoint.select({ id: users.id }).from(users).where(inArray(users.handle, handles));
      return insertNotifications(source, recipients.map((recipient) => recipient.id), savepoint);
    });
    scheduleEmails(source, result.deliveries);
    return result.count;
  } catch { console.error("[startupfans notifications] mention creation failed"); return 0; }
}

export function notifyActivity(input: {
  kind: Exclude<NotificationKind, "mention">; actorId: string; startupId: string;
  postId?: string; commentId?: string; actorStartupId?: string;
}) {
  after(async () => {
    try {
      const source = { ...input, postId: input.postId ?? null, commentId: input.commentId ?? null, actorStartupId: input.actorStartupId ?? null };
      const recipients = await db.transaction(async (tx) => {
        if (source.kind === "reply" || source.kind === "reply_to_reply") {
          if (!source.postId || !source.commentId) return [];
          const [comment] = await tx.select().from(postComments).where(eq(postComments.id, source.commentId));
          if (!comment || comment.deletedAt) return [];
          if (source.kind === "reply_to_reply") {
            if (!comment.parentId) return [];
            const [parent] = await tx.select({ userId: postComments.userId }).from(postComments)
              .where(and(eq(postComments.id, comment.parentId), isNull(postComments.deletedAt)));
            return parent ? [parent.userId] : [];
          }
          const [post] = await tx.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, source.postId));
          if (post && comment.parentId) {
            const [parent] = await tx.select({ userId: postComments.userId }).from(postComments)
              .where(and(eq(postComments.id, comment.parentId), isNull(postComments.deletedAt)));
            if (parent?.userId === post.authorId) return [];
          }
          return post ? [post.authorId] : [];
        }
        const members = await tx.select({ userId: startupMembers.userId }).from(startupMembers)
          .where(and(eq(startupMembers.startupId, source.startupId), source.kind === "new_fan" ? undefined : eq(startupMembers.role, "owner")));
        const ids = members.map((member) => member.userId);
        if (source.kind === "reshare" && source.postId) {
          const [post] = await tx.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, source.postId));
          if (post) ids.push(post.authorId);
        }
        return ids;
      });
      const result = await db.transaction((tx) => insertNotifications(source, recipients, tx));
      scheduleEmails(source, result.deliveries);
      if (result.count) await captureServerEvent({ distinctId: input.actorId, event: "notification_created",
        properties: { kind: input.kind, recipient_count: result.count, startup_id: input.startupId } });
    } catch { console.error("[startupfans notifications] activity creation failed"); }
  });
}

export function notificationTarget(item: {
  kind: NotificationKind; startupSlug: string; postId: string | null; commentId: string | null; actorHandle: string;
}) {
  switch (item.kind) {
    case "mention": case "reply": case "reply_to_reply":
      return `/s/${item.startupSlug}/p/${item.postId}${item.commentId ? `#comment-${item.commentId}` : ""}`;
    case "new_fan": return `/s/${item.startupSlug}/fans`;
    case "reshare": return `/u/${item.actorHandle}`;
    case "team_joined": return `/s/${item.startupSlug}/settings`;
    default: { const unknownKind: never = item.kind; throw new Error(`Unknown notification kind: ${unknownKind}`); }
  }
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
  return and(or(isNull(notifications.postId), eq(posts.visibility, "public")), or(isNull(notifications.commentId), isNull(postComments.deletedAt)));
}

export const getUnreadNotificationCount = cache(async (userId: string) => {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(notifications)
    .leftJoin(posts, eq(posts.id, notifications.postId))
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
  const actorStartup = alias(startups, "notification_actor_startup");
  const rows = await db.select({
    id: notifications.id,
    kind: notifications.kind,
    actorStartupName: actorStartup.name,
    actorStartupSlug: actorStartup.slug,
    actorStartupLogoUrl: actorStartup.logoUrl,
    commentId: notifications.commentId,
    postId: notifications.postId,
    createdAt: notifications.createdAt,
    readAt: notifications.readAt,
    actorName: users.name,
    actorHandle: users.handle,
    actorAvatarUrl: users.avatarUrl,
    startupName: startups.name,
    startupSlug: startups.slug,
    body: sql<string>`coalesce(${postComments.body}, ${posts.bodyMd}, '')`,
    cursorTimestamp: sql<string>`to_char(${notifications.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(notifications)
    .innerJoin(users, eq(users.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .innerJoin(startups, eq(startups.id, sql`coalesce(${notifications.startupId}, ${posts.startupId})`))
    .leftJoin(actorStartup, eq(actorStartup.id, notifications.actorStartupId))
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
