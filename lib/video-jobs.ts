import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { db } from "@/db";
import { posts, startups } from "@/db/schema";
import { isStartupRawVideoUrl } from "@/lib/media";

function jobSecret() {
  const secret = process.env.MEDIA_JOB_SECRET;
  if (!secret || secret.length < 32) throw new Error("MEDIA_JOB_SECRET must have at least 32 characters.");
  return secret;
}

export function createMediaJobToken(postId: string) {
  return createHmac("sha256", jobSecret()).update(`video:${postId}`).digest("hex");
}

export function verifyMediaJobToken(postId: string, token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(createMediaJobToken(postId), "hex"));
  } catch {
    return false;
  }
}

export async function prepareVideoJob() {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
    if (!host || (protocol !== "http" && protocol !== "https")) return null;
    const origin = new URL(`${protocol}://${host}`);
    if (origin.host !== host || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return null;
    return { url: new URL("/api/media/transcode", origin).href };
  } catch {
    return null;
  }
}

export async function failVideoJob(postId: string, status: "processing" | "encoding" = "processing") {
  await db.update(posts).set({ mediaStatus: "failed", mediaUrl: sql`${posts.mediaRawUrl}` })
    .where(and(eq(posts.id, postId), eq(posts.mediaStatus, status)));
}

export function scheduleVideoJob(postId: string, job: { url: string } | null) {
  after(async () => {
    let statusCode: number | null = null;
    try {
      if (!job) throw new Error("Video job origin is unavailable.");
      const requestHeaders = new Headers({
        "Content-Type": "application/json", Authorization: `Bearer ${createMediaJobToken(postId)}`,
      });
      const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (bypass) requestHeaders.set("x-vercel-protection-bypass", bypass);
      const response = await fetch(job.url, {
        method: "POST", headers: requestHeaders, body: JSON.stringify({ postId }),
        signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store",
      });
      statusCode = response.status;
      if (!response.ok) throw new Error("Video job was rejected.");
    } catch {
      console.error("[startupfans video] Job dispatch failed.", { postId, statusCode });
      try { await failVideoJob(postId); }
      catch { console.error("[startupfans video] Could not save dispatch fallback.", { postId, statusCode }); }
    }
  });
}

export async function claimVideoJob(postId: string) {
  const [post] = await db.update(posts).set({ mediaStatus: "encoding" }).from(startups)
    .where(and(eq(posts.id, postId), eq(posts.startupId, startups.id),
      eq(posts.mediaStatus, "processing"), isNotNull(posts.mediaRawUrl)))
    .returning({ raw: posts.mediaRawUrl, slug: startups.slug });
  return post;
}

export function validateVideoJobSource(raw: string, slug: string) {
  if (!isStartupRawVideoUrl(raw, slug)) throw new Error("Invalid raw video URL.");
}

export async function completeVideoJob(postId: string, videoUrl: string, posterUrl: string) {
  const [saved] = await db.update(posts).set({ mediaUrl: videoUrl, mediaPosterUrl: posterUrl,
    mediaStatus: "ready", mediaProcessedAt: new Date(), mediaRawUrl: null })
    .where(and(eq(posts.id, postId), eq(posts.mediaStatus, "encoding"))).returning({ id: posts.id });
  return saved;
}
