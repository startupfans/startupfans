import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

function ipv4ToInt(address: string) {
  return address.split(".").reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function isPrivateIpv4(address: string) {
  const value = ipv4ToInt(address);
  return (
    (value & 0xff000000) === 0x00000000 // 0.0.0.0/8
    || (value & 0xff000000) === 0x0a000000 // 10.0.0.0/8
    || (value & 0xff000000) === 0x7f000000 // 127.0.0.0/8
    || (value & 0xfff00000) === 0xac100000 // 172.16.0.0/12
    || (value & 0xffff0000) === 0xc0a80000 // 192.168.0.0/16
    || (value & 0xffff0000) === 0xa9fe0000 // 169.254.0.0/16
    || (value & 0xffc00000) === 0x64400000 // 100.64.0.0/10
    || (value & 0xffffff00) === 0xc0000000 // 192.0.0.0/24
    || (value & 0xfffe0000) === 0xc6120000 // 198.18.0.0/15
    || (value & 0xf0000000) === 0xe0000000 // 224.0.0.0/4 multicast
    || (value & 0xf0000000) === 0xf0000000 // 240.0.0.0/4 reserved
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("ff")) return true; // multicast
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) === 4 && isPrivateIpv4(mapped);
  }
  return false;
}

export function isBlockedIpAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export function assertPublicHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid address.");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error("Only plain http(s) addresses are allowed.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Only standard web ports are allowed.");
  }
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Local addresses are not allowed.");
  }
  const version = isIP(host);
  if (version !== 0) {
    if (isBlockedIpAddress(host)) throw new Error("Private addresses are not allowed.");
    return url;
  }
  if (!host.includes(".")) throw new Error("Use a full website address.");
  return url;
}

async function assertPublicHostname(hostname: string) {
  const version = isIP(hostname);
  if (version !== 0) {
    if (isBlockedIpAddress(hostname)) throw new Error("Private addresses are not allowed.");
    return;
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) throw new Error("Could not resolve that website.");
  if (addresses.some((entry) => isBlockedIpAddress(entry.address))) {
    throw new Error("Private addresses are not allowed.");
  }
}

async function readLimitedBody(response: Response, maxBytes: number) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Response is too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Fetch a user-influenced http(s) URL with private-IP checks and manual redirects. */
export async function safeFetch(input: string, init: {
  timeoutMs?: number;
  maxBytes: number;
  headers?: HeadersInit;
  method?: "GET" | "HEAD";
} = { maxBytes: 512_000 }) {
  let current = assertPublicHttpUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHostname(current.hostname);
    const response = await fetch(current, {
      method: init.method ?? "GET",
      headers: {
        "User-Agent": "StartupFansBot/1.0 (+https://startupfans.co)",
        Accept: "*/*",
        ...init.headers,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(init.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) throw new Error("Too many redirects.");
      current = assertPublicHttpUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    if ((init.method ?? "GET") === "HEAD") {
      return { response, body: new Uint8Array(), finalUrl: current.href };
    }
    const body = await readLimitedBody(response, init.maxBytes);
    return { response, body, finalUrl: current.href };
  }
  throw new Error("Too many redirects.");
}
