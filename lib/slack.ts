import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { put } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { slackConnections, slackPosts, startupMembers, startups, users } from "@/db/schema";
import { decryptSlackToken, getSlackTokenKey } from "@/lib/crypto";
import { createPostForStartup } from "@/lib/posts";
import { captureMentionNotifications, notifyMentions } from "@/lib/notifications";
import { schedulePostLink } from "@/lib/links";

export const SLACK_STATE_COOKIE = "sf_slack_state";
export const SLACK_SCOPES = ["reactions:read", "channels:history", "groups:history", "users:read", "users:read.email", "files:read", "chat:write"];

export function isSlackConfigured() {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET && process.env.SLACK_SIGNING_SECRET && getSlackTokenKey());
}

export function slackAppUrl() {
  return new URL(process.env.APP_URL || "https://www.startupfans.co");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function equalStrings(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifySlackSignature(body: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !/^\d+$/.test(timestamp) || !signature || !/^v0=[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
  return equalStrings(signature, expected);
}

function signState(payload: string) {
  const secret = process.env.SLACK_CLIENT_SECRET;
  if (!secret) throw new Error("Slack isn't configured.");
  return createHmac("sha256", secret).update(`startupfans-slack-state:${payload}`).digest("base64url");
}

export function createSlackState(slug: string, userId: string) {
  const nonce = randomBytes(32).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ slug, userId, nonce, expiresAt: Date.now() + 600000 })).toString("base64url");
  return { nonce, cookie: `${payload}.${signState(payload)}` };
}

export function verifySlackState(cookie: string | undefined, nonce: string | null) {
  if (!cookie || !nonce || cookie.length > 2048) return null;
  const [payload, signature, extra] = cookie.split(".");
  if (!payload || !signature || extra !== undefined || !equalStrings(signature, signState(payload))) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isRecord(value) || typeof value.slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(value.slug)
      || typeof value.userId !== "string" || typeof value.nonce !== "string" || !equalStrings(value.nonce, nonce)
      || typeof value.expiresAt !== "number" || value.expiresAt <= Date.now() || value.expiresAt > Date.now() + 600000) return null;
    return { slug: value.slug, userId: value.userId };
  } catch {
    return null;
  }
}

export async function slackApi(method: string, parameters: Record<string, string>, token?: string) {
  const base = process.env.SLACK_API_BASE || "https://slack.com/api";
  const response = await fetch(`${base.replace(/\/$/, "")}/${method}`, {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: new URLSearchParams(parameters),
  });
  if (!response.ok) throw new Error("Slack API request failed.");
  const result: unknown = await response.json();
  if (!isRecord(result) || result.ok !== true) throw new Error("Slack API request was rejected.");
  return result;
}

export async function getSlackConnection(startupId: string) {
  const [connection] = await db.select({ workspaceName: slackConnections.slackTeamName }).from(slackConnections)
    .where(eq(slackConnections.startupId, startupId)).limit(1);
  return connection ?? null;
}

export function slackMrkdwnToMarkdown(text: string) {
  return text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => {
    if (index % 2 === 1) return part.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return part.replace(/<([^<>]+)>/g, (_match: string, content: string) => {
      const [target, label] = content.split("|", 2);
      if (/^(https?:\/\/|mailto:)/i.test(target)) {
        const href = target.replace(/&amp;/g, "&").replace(/[\s()\\]/g, (character) => encodeURIComponent(character));
        const title = (label || target).replace(/[\[\]\\]/g, "\\$&");
        return `[${title}](${href})`;
      }
      if (target.startsWith("@")) return `@${label || target.slice(1)}`;
      if (target.startsWith("#")) return `#${label || target.slice(1)}`;
      if (target.startsWith("!")) return label || target.slice(1);
      return content;
    }).replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1**$2**")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }).join("");
}

export function parseSlackReaction(value: unknown) {
  if (!isRecord(value) || value.type !== "event_callback" || typeof value.team_id !== "string" || !isRecord(value.event)) return null;
  const event = value.event;
  if (event.type !== "reaction_added" || event.reaction !== "mega" || typeof event.user !== "string" || !isRecord(event.item)) return null;
  const item = event.item;
  if (item.type !== "message" || typeof item.channel !== "string" || typeof item.ts !== "string"
    || !/^[A-Z0-9]+$/.test(value.team_id) || !/^[A-Z0-9]+$/.test(item.channel) || !/^\d+\.\d+$/.test(item.ts)) return null;
  return { teamId: value.team_id, userId: event.user, channelId: item.channel, messageTs: item.ts };
}

type SlackReaction = NonNullable<ReturnType<typeof parseSlackReaction>>;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageExtensions = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);

async function copySlackImage(message: Record<string, unknown>, token: string, slug: string) {
  if (!Array.isArray(message.files)) return null;
  const file = message.files.find((value: unknown) => isRecord(value) && typeof value.mimetype === "string" && imageExtensions.has(value.mimetype));
  if (!isRecord(file) || typeof file.mimetype !== "string" || typeof file.size !== "number"
    || file.size <= 0 || file.size > MAX_IMAGE_BYTES || typeof file.url_private !== "string") return null;
  const extension = imageExtensions.get(file.mimetype);
  if (!extension) return null;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[startupfans Slack] Blob isn't configured; skipping the image.");
    return null;
  }
  const url = new URL(file.url_private);
  if (url.protocol !== "https:" || !["files.slack.com", "slack-files.com"].includes(url.hostname)
    || url.username || url.password || url.port) throw new Error("Invalid Slack image address.");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.body) throw new Error("Could not download Slack image.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) throw new Error("Slack image is too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const blob = await put(`startups/${slug}/slack/${randomBytes(16).toString("hex")}.${extension}`, Buffer.concat(chunks), {
    access: "public", contentType: file.mimetype, addRandomSuffix: true, abortSignal: AbortSignal.timeout(10000),
  });
  return { url: blob.url, type: "image" as const };
}

export async function publishSlackReaction(event: SlackReaction) {
  const [row] = await db.select({ connection: slackConnections, slug: startups.slug }).from(slackConnections)
    .innerJoin(startups, eq(startups.id, slackConnections.startupId))
    .where(eq(slackConnections.slackTeamId, event.teamId)).limit(1);
  if (!row) return;
  const key = and(eq(slackPosts.slackTeamId, event.teamId), eq(slackPosts.channelId, event.channelId), eq(slackPosts.messageTs, event.messageTs));
  const [existing] = await db.select().from(slackPosts).where(key).limit(1);
  if (existing) return;
  const token = decryptSlackToken(row.connection.botToken);
  const history = await slackApi("conversations.history", { channel: event.channelId, latest: event.messageTs, inclusive: "true", limit: "1" }, token);
  let message: unknown = Array.isArray(history.messages) ? history.messages[0] : null;
  if (!isRecord(message) || message.ts !== event.messageTs) {
    // History excludes thread replies; reactions.get returns the exact reacted item.
    const reacted = await slackApi("reactions.get", { channel: event.channelId, timestamp: event.messageTs }, token);
    message = reacted.message;
  }
  if (!isRecord(message) || message.ts !== event.messageTs || message.bot_id || message.bot_profile || message.subtype === "bot_message"
    || typeof message.user !== "string") return;
  const body = slackMrkdwnToMarkdown(typeof message.text === "string" ? message.text : "").trim();
  if (body.length > 5000) return;
  let email: string | null = null;
  try {
    const userInfo = await slackApi("users.info", { user: event.userId }, token);
    const profile = isRecord(userInfo.user) && isRecord(userInfo.user.profile) ? userInfo.user.profile : null;
    if (profile && typeof profile.email === "string") email = profile.email.trim().toLowerCase();
  } catch {
    // An unavailable email falls back to the connecting account.
  }
  const media = await copySlackImage(message, token, row.slug);
  if (!body && !media) return;
  const created = await db.transaction(async (tx) => {
    // Match the lock order used by owner actions, including disconnect and team changes.
    await tx.select({ id: startups.id }).from(startups).where(eq(startups.id, row.connection.startupId)).for("update");
    const [connection] = await tx.select().from(slackConnections).where(eq(slackConnections.id, row.connection.id)).for("update");
    if (!connection || connection.botToken !== row.connection.botToken) return null;
    const [duplicate] = await tx.select().from(slackPosts).where(key).limit(1);
    if (duplicate) return null;
    const [member] = email ? await tx.select({ userId: users.id }).from(users)
      .innerJoin(startupMembers, eq(startupMembers.userId, users.id))
      .where(and(sql`lower(${users.email}) = ${email}`, eq(startupMembers.startupId, connection.startupId))).limit(1) : [];
    const actorId = member?.userId ?? connection.installedBy;
    const post = await createPostForStartup({
      startupId: connection.startupId, authorId: actorId,
      body: body || "Shared an image from Slack.", media, source: "slack",
    }, tx);
    await tx.insert(slackPosts).values({ slackTeamId: event.teamId, channelId: event.channelId, messageTs: event.messageTs, postId: post.id });
    const recipientCount = await notifyMentions({ body, actorId, postId: post.id }, tx);
    return { ...post, actorId, recipientCount };
  });
  if (!created) return;
  schedulePostLink({ postId: created.id, body, slug: row.slug, actorId: created.actorId });
  await captureMentionNotifications({ actorId: created.actorId, postId: created.id,
    startupId: row.connection.startupId, recipientCount: created.recipientCount });
  revalidatePath(`/s/${row.slug}`);
  revalidatePath("/feed");
  await slackApi("chat.postMessage", {
    channel: event.channelId,
    thread_ts: typeof message.thread_ts === "string" ? message.thread_ts : event.messageTs,
    text: `Posted to startupfans: ${new URL(`/s/${row.slug}/p/${created.id}`, slackAppUrl())}`,
    unfurl_links: "false", unfurl_media: "false",
  }, token);
}
