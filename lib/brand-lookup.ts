import "server-only";

import { assertPublicHttpUrl, safeFetch } from "@/lib/safe-fetch";
import { normalizeWebsiteUrl } from "@/lib/startups";

const HTML_LIMIT = 512_000;

export type BrandLogoCandidate = {
  url: string;
  source: "apple-touch-icon" | "og-image" | "icon" | "favicon" | "favicon-proxy";
};

export type BrandLookupResult = {
  website: string;
  host: string;
  logos: BrandLogoCandidate[];
};

function decodeHtmlAttr(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
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

function extractLogoCandidates(html: string, pageUrl: string) {
  const candidates: Array<BrandLogoCandidate & { score: number }> = [];
  const seen = new Set<string>();

  function add(url: string | null, source: BrandLogoCandidate["source"], score: number) {
    if (!url || seen.has(url)) return;
    try {
      assertPublicHttpUrl(url);
    } catch {
      return;
    }
    seen.add(url);
    candidates.push({ url, source, score });
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const absolute = resolveAgainst(pageUrl, decodeHtmlAttr(href));
    const sizes = /sizes\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const sizeScore = parseSizeScore(sizes);
    if (rel.includes("apple-touch-icon")) add(absolute, "apple-touch-icon", 3000 + sizeScore);
    else if (rel.split(/\s+/).includes("icon") || rel.includes("shortcut")) {
      add(absolute, "icon", 1000 + sizeScore);
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property = (/property\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      ?? /name\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      ?? "").toLowerCase();
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!content) continue;
    if (property === "og:image" || property === "og:image:url") {
      add(resolveAgainst(pageUrl, decodeHtmlAttr(content)), "og-image", 2000);
    } else if (property === "twitter:image" || property === "twitter:image:src") {
      add(resolveAgainst(pageUrl, decodeHtmlAttr(content)), "og-image", 1900);
    }
  }

  // Same-origin /favicon.ico only when the page didn't declare icons.
  if (candidates.length === 0) add(resolveAgainst(pageUrl, "/favicon.ico"), "favicon", 100);
  candidates.sort((left, right) => right.score - left.score);
  return candidates.map(({ url, source }) => ({ url, source }));
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
  try {
    const { body, finalUrl } = await safeFetch(website, {
      maxBytes: HTML_LIMIT,
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" },
    });
    const html = new TextDecoder("utf-8", { fatal: false }).decode(body);
    logos = extractLogoCandidates(html, finalUrl).slice(0, 3);
  } catch {
    logos = [];
  }

  if (logos.length === 0) logos = [googleFavicon(host)];
  return { website, host, logos };
}
