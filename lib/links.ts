import "server-only";

import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
import { put } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { postLinks } from "@/db/schema";
import { assertPublicHttpUrl, isBlockedIpAddress } from "@/lib/safe-fetch";

const HTML_LIMIT = 1024 * 1024;
const IMAGE_LIMIT = 5 * 1024 * 1024;
const TIMEOUT_MS = 5000;

export type PostLink = typeof postLinks.$inferSelect;

function blockedAddress(address: string): boolean {
  if (isBlockedIpAddress(address)) return true;
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    // Check octets directly: high-bit IPv4 masks in the shared guard are signed.
    return (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || b === 0)) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const normalized = address.toLowerCase();
  if (/^fe[89ab][\da-f]:/.test(normalized)) return true;
  const mapped = /^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(normalized);
  if (mapped) {
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return blockedAddress(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
  }
  return false;
}

/** Reuse the URL/IP guards with a single deadline for DNS, redirects and body. */
export async function fetchLinkResource(input: string, maxBytes: number, kind: "html" | "image" = "html") {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = assertPublicHttpUrl(input);
  for (let hop = 0; hop <= 3; hop += 1) {
    signal.throwIfAborted();
    if (excludedHost(current) || blockedAddressLiteral(current.hostname)) throw new Error("Blocked preview host.");
    const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
      const abort = () => reject(new Error("Link fetch timed out."));
      signal.addEventListener("abort", abort, { once: true });
      lookup(current.hostname, { all: true, verbatim: true }).then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", abort));
    });
    if (!addresses.length || addresses.some(({ address }) => blockedAddress(address))) throw new Error("Private preview host.");
    const response = await fetch(current, {
      redirect: "manual", signal, cache: "no-store",
      headers: { "User-Agent": "StartupFansBot/1.0 (+https://startupfans.co)", Accept: "text/html,application/xhtml+xml,image/*" },
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location || hop === 3) throw new Error("Too many redirects.");
      current = assertPublicHttpUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Link request failed.");
    }
    const contentType = response.headers.get("content-type")?.trim() ?? "";
    const acceptable = kind === "html" ? /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType)
      : /^image\/(jpeg|png|gif|webp|avif)(?:\s*;|$)/i.test(contentType);
    if (!acceptable) {
      await response.body?.cancel();
      return { response, body: Buffer.alloc(0), finalUrl: current.href };
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new Error("Link response is too large.");
        chunks.push(value);
      }
    } finally {
      await reader?.cancel().catch(() => {});
    }
    return { response, body: Buffer.concat(chunks, size), finalUrl: current.href };
  }
  throw new Error("Too many redirects.");
}

function blockedAddressLiteral(host: string) {
  const address = host.replace(/^\[|\]$/g, "");
  return isIP(address) !== 0 && blockedAddress(address);
}

function decodeEntities(value: string) {
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity: string, name: string) => {
    if (!name.startsWith("#")) return entities[name.toLowerCase()] ?? entity;
    const code = name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
  });
}

function excludedHost(url: URL) {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  return host === "startupfans.co" || host.endsWith(".startupfans.co")
    || host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com");
}

/** Pick the first external link, ignoring markdown images and code. */
export function extractPostUrl(body: string) {
  let text = body.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*(?:\n|$)/gm, " ")
    .replace(/(`+)[\s\S]*?\1/g, " ")
    .replace(/!\[[^\]]*\]\([^\n]*?\)|!\[[^\]]*\](?:\[[^\]]*\])?/g, " ");
  const references = new Map<string, string>();
  text = text.replace(/^ {0,3}\[([^\]]+)\]:\s*<?(https?:\/\/[^\s>]+)>?[^\n]*$/gim, (_line: string, label: string, url: string) => {
    references.set(label.trim().toLowerCase(), url);
    return " ";
  });
  for (const match of text.matchAll(/https?:\/\/[^\s<>"`]+|\[([^\]]+)\](?:\[([^\]]*)\])?/gi)) {
    let candidate = match[0].startsWith("[")
      ? references.get((match[2] || match[1]).trim().toLowerCase()) : match[0];
    if (!candidate) continue;
    candidate = decodeEntities(candidate.replace(/\\([()])/g, "$1")).replace(/[.,!?;:]+$/, "");
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (candidate.endsWith(close) && candidate.split(close).length > candidate.split(open).length) candidate = candidate.slice(0, -1);
    }
    try {
      const url = new URL(candidate);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || excludedHost(url)) continue;
      return url.href;
    } catch {
      // A malformed token doesn't prevent a later valid link from being used.
    }
  }
  return null;
}

function attributes(tag: string) {
  const result = new Map<string, string>();
  for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4]));
  }
  return result;
}

function cleanText(value: string | null, limit: number) {
  return value ? decodeEntities(value).replace(/<[^>]*>/g, " ").replace(/[\s\u0000-\u001f]+/g, " ").trim().slice(0, limit) || null : null;
}

function resolveUrl(value: string | null, base: string) {
  if (!value) return null;
  try {
    const url = assertPublicHttpUrl(new URL(value, base).href);
    return excludedHost(url) ? null : url.href;
  } catch {
    return null;
  }
}

export function parseLinkMetadata(html: string, pageUrl: string) {
  const document = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const meta = new Map<string, string>();
  let canonical: string | null = null;
  for (const match of document.matchAll(/<(meta|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = attributes(match[0]);
    if (match[1].toLowerCase() === "link") {
      if (attrs.get("rel")?.toLowerCase().split(/\s+/).includes("canonical")) canonical ??= resolveUrl(attrs.get("href") ?? null, pageUrl);
    } else {
      const key = (attrs.get("property") ?? attrs.get("name"))?.toLowerCase();
      const value = attrs.get("content");
      if (key && value?.trim() && !meta.has(key)) meta.set(key, value);
    }
  }
  const first = (...names: string[]) => names.map((name) => meta.get(name)).find((value) => value?.trim()) ?? null;
  const title = cleanText(first("og:title", "twitter:title"), 300)
    ?? cleanText(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(document)?.[1] ?? null, 300);
  return {
    title,
    description: cleanText(first("og:description", "twitter:description", "description"), 1000),
    siteName: cleanText(first("og:site_name", "twitter:site"), 100) ?? new URL(pageUrl).hostname,
    canonicalUrl: canonical ?? resolveUrl(first("og:url", "twitter:url"), pageUrl) ?? pageUrl,
    image: resolveUrl(first("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"), pageUrl),
  };
}

function decodeHtml(body: Uint8Array, contentType: string) {
  if (body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) return new TextDecoder("utf-8").decode(body);
  if (body[0] === 0xff && body[1] === 0xfe) return new TextDecoder("utf-16le").decode(body);
  if (body[0] === 0xfe && body[1] === 0xff) return new TextDecoder("utf-16be").decode(body);
  const prefix = new TextDecoder("windows-1252").decode(body.slice(0, 1024));
  const charset = /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType)?.[1]
    ?? /<meta\b[^>]*charset\s*=\s*["']?([^\s"'/>;]+)/i.exec(prefix)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

async function copyPreviewImage(url: string, slug: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { body, response } = await fetchLinkResource(url, IMAGE_LIMIT, "image");
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    const bytes = Buffer.from(body);
    const formats = [
      { mime: "image/jpeg", ext: "jpg", valid: bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
      { mime: "image/png", ext: "png", valid: bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
      { mime: "image/gif", ext: "gif", valid: /^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6)) },
      { mime: "image/webp", ext: "webp", valid: bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
      { mime: "image/avif", ext: "avif", valid: bytes.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 32)) },
    ];
    const format = formats.find((format) => format.mime === contentType && format.valid);
    if (!format) return null;
    const blob = await put(`startups/${slug}/links/${randomUUID()}.${format.ext}`, bytes, {
      access: "public", contentType: format.mime, addRandomSuffix: false, abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return blob.url;
  } catch {
    return null;
  }
}

/** Persist a terminal result once; failures never propagate into posting. */
export async function fetchPostLink({ postId, body, slug, actorId }: {
  postId: string; body: string; slug: string; actorId: string;
}) {
  const url = extractPostUrl(body);
  if (!url) return;
  try {
    // Claim before external work so duplicate jobs never fetch the same page twice.
    const claimed = await db.insert(postLinks).values({ postId, url, status: "failed" })
      .onConflictDoNothing().returning({ postId: postLinks.postId });
    if (claimed.length === 0) return;
    let result: Pick<PostLink, "status" | "canonicalUrl" | "title" | "description" | "siteName" | "imageUrl"> = {
      status: "failed", canonicalUrl: null, title: null, description: null, siteName: null, imageUrl: null,
    };
    try {
      const { body: bytes, response, finalUrl } = await fetchLinkResource(url, HTML_LIMIT);
      const contentType = response.headers.get("content-type")?.trim() ?? "";
      if (!/^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType) || excludedHost(new URL(finalUrl))) {
        result.status = "none";
      } else {
        const { image, ...metadata } = parseLinkMetadata(decodeHtml(bytes, contentType), finalUrl);
        result = { ...metadata, status: metadata.title ? "ready" : "none",
          imageUrl: metadata.title && image ? await copyPreviewImage(image, slug) : null };
      }
    } catch {
      // Keep the terminal failure; the author can still publish their post.
    }
    await db.update(postLinks).set({ ...result, fetchedAt: new Date() }).where(eq(postLinks.postId, postId));
    // The private backfill has no Next request context; the job can still store previews.
    if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      const { PostHog } = await import("posthog-node");
      const analytics = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST, flushAt: 1, flushInterval: 0,
      });
      try {
        analytics.capture({ distinctId: actorId, event: "link_preview_fetched",
          properties: { status: result.status, host: new URL(url).hostname } });
        await analytics.shutdown();
      } catch {
        console.error("[startupfans] Could not capture link preview event.");
      }
    }
  } catch {
    console.error("[startupfans] Could not store link preview.");
  }
}

export function schedulePostLink(input: Parameters<typeof fetchPostLink>[0]) {
  if (!extractPostUrl(input.body)) return;
  after(async () => {
    await fetchPostLink(input);
    revalidatePath(`/s/${input.slug}`);
    revalidatePath(`/s/${input.slug}/p/${input.postId}`);
    revalidatePath("/feed");
    revalidatePath("/u/[handle]", "page");
  });
}

export async function hydratePostLinks<T extends { id: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((row) => row.id))];
  const links = ids.length === 0 ? [] : await db.select().from(postLinks)
    .where(and(inArray(postLinks.postId, ids), eq(postLinks.status, "ready")));
  const byId = new Map(links.map((link) => [link.postId, link]));
  return rows.map((row) => ({ ...row, linkPreview: byId.get(row.id) ?? null }));
}
