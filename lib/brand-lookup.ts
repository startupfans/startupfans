import "server-only";

import { rewriteBrandCopy, type BrandCopySource } from "@/lib/brand-copy";
import { assertPublicHttpUrl, safeFetch } from "@/lib/safe-fetch";
import { normalizeWebsiteUrl } from "@/lib/startups";

const HTML_LIMIT = 512_000;
const TAGLINE_MAX = 120;
const BIO_MAX = 280;
const DESCRIPTION_MAX = 2000;
const PAGE_TEXT_MAX = 4_000;

export type BrandLogoCandidate = {
  url: string;
  source: "apple-touch-icon" | "og-image" | "icon" | "favicon" | "favicon-proxy";
};

export type BrandCoverCandidate = {
  url: string;
  source: "og-image" | "twitter-image";
};

export type BrandLookupResult = {
  website: string;
  host: string;
  logos: BrandLogoCandidate[];
  covers: BrandCoverCandidate[];
  tagline: string | null;
  bio: string | null;
  description: string | null;
  copySource: BrandCopySource;
};

function decodeHtmlAttr(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function resolveAgainst(base: string, href: string) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function parseSizeScore(sizes: string | undefined) {
  if (!sizes || sizes === "any") return 0;
  let best = 0;
  for (const part of sizes.split(/\s+/)) {
    const match = /^(\d+)x(\d+)$/i.exec(part);
    if (!match) continue;
    best = Math.max(best, Number(match[1]) * Number(match[2]));
  }
  return best;
}

function cleanText(value: string) {
  return decodeHtmlAttr(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const boundary = slice.lastIndexOf(" ");
  const trimmed = boundary > Math.floor(max * 0.6) ? slice.slice(0, boundary) : slice;
  return `${trimmed.trimEnd()}…`;
}

function firstSentence(value: string) {
  const match = /^(.+?[.!?])(?:\s|$)/.exec(value);
  return match?.[1]?.trim() || value;
}

function metaContent(html: string, names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property = (/property\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      ?? /name\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      ?? "").toLowerCase();
    if (!wanted.has(property)) continue;
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content == null) continue;
    const cleaned = cleanText(content);
    if (cleaned) return cleaned;
  }
  return null;
}

function documentTitle(html: string) {
  const match = /<title\b[^>]*>([^<]*)<\/title>/i.exec(html);
  return match ? cleanText(match[1]) : null;
}

function extractPageText(html: string) {
  const withoutNoise = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(withoutNoise)?.[1] ?? withoutNoise;
  const text = cleanText(body);
  if (!text) return null;
  return text.length <= PAGE_TEXT_MAX ? text : `${text.slice(0, PAGE_TEXT_MAX).trimEnd()}…`;
}

function extractCopy(html: string) {
  const description = metaContent(html, ["og:description", "twitter:description", "description"]);
  const title = metaContent(html, ["og:title", "twitter:title"]) ?? documentTitle(html);
  const taglineSource = title && title.length <= TAGLINE_MAX
    ? title
    : description
      ? firstSentence(description)
      : title;
  return {
    title,
    pageText: extractPageText(html),
    tagline: taglineSource ? truncateText(taglineSource, TAGLINE_MAX) : null,
    bio: description ? truncateText(description, BIO_MAX) : null,
    description: description ? truncateText(description, DESCRIPTION_MAX) : null,
  };
}

function extractBrandAssets(html: string, pageUrl: string) {
  const logos: Array<BrandLogoCandidate & { score: number }> = [];
  const covers: Array<BrandCoverCandidate & { score: number }> = [];
  const seenLogos = new Set<string>();
  const seenCovers = new Set<string>();

  function addLogo(url: string | null, source: BrandLogoCandidate["source"], score: number) {
    if (!url || seenLogos.has(url)) return;
    try {
      assertPublicHttpUrl(url);
    } catch {
      return;
    }
    seenLogos.add(url);
    logos.push({ url, source, score });
  }

  function addCover(url: string | null, source: BrandCoverCandidate["source"], score: number) {
    if (!url || seenCovers.has(url)) return;
    try {
      assertPublicHttpUrl(url);
    } catch {
      return;
    }
    seenCovers.add(url);
    covers.push({ url, source, score });
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const absolute = resolveAgainst(pageUrl, decodeHtmlAttr(href));
    const sizes = /sizes\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const sizeScore = parseSizeScore(sizes);
    if (rel.includes("apple-touch-icon")) addLogo(absolute, "apple-touch-icon", 3000 + sizeScore);
    else if (rel.split(/\s+/).includes("icon") || rel.includes("shortcut")) {
      addLogo(absolute, "icon", 1000 + sizeScore);
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property = (/property\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      ?? /name\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      ?? "").toLowerCase();
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!content) continue;
    const absolute = resolveAgainst(pageUrl, decodeHtmlAttr(content));
    if (property === "og:image" || property === "og:image:url") {
      addCover(absolute, "og-image", 2000);
      // Wide social images are a weak logo fallback when nothing square exists.
      addLogo(absolute, "og-image", 500);
    } else if (property === "twitter:image" || property === "twitter:image:src") {
      addCover(absolute, "twitter-image", 1900);
      addLogo(absolute, "og-image", 400);
    }
  }

  // Same-origin /favicon.ico only when the page didn't declare icons.
  if (logos.filter((logo) => logo.source !== "og-image").length === 0) {
    addLogo(resolveAgainst(pageUrl, "/favicon.ico"), "favicon", 100);
  }
  logos.sort((left, right) => right.score - left.score);
  covers.sort((left, right) => right.score - left.score);
  return {
    logos: logos.map(({ url, source }) => ({ url, source })),
    covers: covers.map(({ url, source }) => ({ url, source })),
  };
}

function googleFavicon(host: string): BrandLogoCandidate {
  return {
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
    source: "favicon-proxy",
  };
}

export async function lookupBrandFromWebsite(input: string): Promise<BrandLookupResult | null> {
  const normalized = normalizeWebsiteUrl(input);
  if (normalized.status !== "valid" || !normalized.value) return null;
  const websiteUrl = assertPublicHttpUrl(normalized.value);
  const host = websiteUrl.hostname.replace(/\.$/, "").toLowerCase();
  const website = websiteUrl.href;

  let logos: BrandLogoCandidate[] = [];
  let covers: BrandCoverCandidate[] = [];
  let tagline: string | null = null;
  let bio: string | null = null;
  let description: string | null = null;
  let title: string | null = null;
  let pageText: string | null = null;
  let copySource: BrandCopySource = "meta";
  try {
    const { body, finalUrl } = await safeFetch(website, {
      maxBytes: HTML_LIMIT,
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" },
    });
    const html = new TextDecoder("utf-8", { fatal: false }).decode(body);
    const assets = extractBrandAssets(html, finalUrl);
    logos = assets.logos.slice(0, 3);
    covers = assets.covers.slice(0, 2);
    const scraped = extractCopy(html);
    title = scraped.title;
    pageText = scraped.pageText;
    tagline = scraped.tagline;
    bio = scraped.bio;
    description = scraped.description;
  } catch {
    logos = [];
    covers = [];
  }

  if (logos.length === 0) logos = [googleFavicon(host)];
  // Prefer real icons over the weak og:image logo fallback when both exist.
  const iconLogos = logos.filter((logo) => logo.source !== "og-image");
  if (iconLogos.length > 0) logos = iconLogos.slice(0, 3);

  const rewritten = await rewriteBrandCopy({
    host, website, title, pageText, tagline, bio, description,
  });
  ({ tagline, bio, description } = rewritten.copy);
  copySource = rewritten.source;

  return { website, host, logos, covers, tagline, bio, description, copySource };
}
