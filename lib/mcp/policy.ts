import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/app/site";

export const MCP_SCOPES = ["read", "write"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export interface McpActor {
  id: string;
  handle: string;
  name: string | null;
  email: string;
  origin: string;
  scopes: string[];
  clientId: string;
}

const TOKEN_PREFIX = {
  client: "sfo",
  code: "sfk",
  access: "sfm",
  refresh: "sfr",
} as const;

export function newToken(kind: keyof typeof TOKEN_PREFIX) {
  return `${TOKEN_PREFIX[kind]}_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isClientId(value: string) {
  return /^sfo_[A-Za-z0-9_-]{43}$/.test(value);
}

export function isAccessToken(value: string) {
  return /^sfm_[A-Za-z0-9_-]{43}$/.test(value);
}

export function isRefreshToken(value: string) {
  return /^sfr_[A-Za-z0-9_-]{43}$/.test(value);
}

export function isAuthCode(value: string) {
  return /^sfk_[A-Za-z0-9_-]{43}$/.test(value);
}

export function pkceMatches(verifier: string, challenge: string) {
  if (!/^[\w.-]{43,128}$/.test(verifier) || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) return false;
  const digest = createHash("sha256").update(verifier).digest("base64url");
  const left = Buffer.from(digest);
  const right = Buffer.from(challenge);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isValidState(value: unknown): value is string {
  return typeof value === "string" && /^[\x21-\x7E]{1,512}$/.test(value);
}

export function isCodeChallenge(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
}

export function cleanClientName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

export function parseScopes(value: string | null | undefined): McpScope[] | null {
  if (value === undefined || value === null || value.trim() === "") return [...MCP_SCOPES];
  const scopes = [...new Set(value.trim().split(/\s+/))];
  if (scopes.some((scope) => !MCP_SCOPES.includes(scope as McpScope))) return null;
  return MCP_SCOPES.filter((scope) => scopes.includes(scope));
}

export function formatScopes(scopes: readonly string[]) {
  return MCP_SCOPES.filter((scope) => scopes.includes(scope)).join(" ");
}

export function configuredOrigin() {
  return (process.env.APP_URL || SITE_URL).replace(/\/$/, "");
}

export function publicOrigin(request: Request) {
  const configured = configuredOrigin();
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0]?.trim() ?? "";
  if (!host || /[\s/\\]/.test(host)) return configured;
  let configuredHost = "";
  try {
    configuredHost = new URL(configured).host;
  } catch {
    configuredHost = "";
  }
  const local = host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
  if (host !== configuredHost && host !== "startupfans.co" && host !== "www.startupfans.co" && !local) return configured;
  const https = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
  return `${local && !https ? "http" : "https"}://${host}`;
}

export function mcpResource(origin: string) {
  return `${origin}/api/mcp`;
}

export function isMcpResource(value: string, origin: string) {
  try {
    const url = new URL(value);
    return url.origin === origin && url.pathname === "/api/mcp" && url.search === "" && url.hash === ""
      && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

function isPrivateHost(hostname: string) {
  if (hostname.includes(":") || hostname.endsWith(".local") || hostname.endsWith(".localhost")) return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function ourHosts() {
  const hosts = new Set(["startupfans.co", "www.startupfans.co"]);
  try {
    hosts.add(new URL(configuredOrigin()).host);
  } catch {
    hosts.add("startupfans.co");
  }
  return hosts;
}

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isCursorAppCallback(url: URL) {
  return url.protocol === "cursor:"
    && url.hostname === "anysphere.cursor-mcp"
    && url.pathname === "/oauth/callback"
    && url.search === "";
}

export function redirectUriError(value: string) {
  if (value.length > 500) return "Redirect URI is too long.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Redirect URI must be an absolute URL.";
  }
  if (url.username || url.password || url.hash) return "Redirect URI cannot include a username, password or fragment.";
  if (isCursorAppCallback(url)) return null;
  if (url.protocol === "http:" && isLoopback(url.hostname)) return null;
  if (url.protocol !== "https:") return "Redirect URI must use https.";
  if (isLoopback(url.hostname) || isPrivateHost(url.hostname) || ourHosts().has(url.host)) {
    return "Redirect URI must be a public https address.";
  }
  return null;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...MCP_SCOPES],
  };
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResource(origin),
    authorization_servers: [origin],
    scopes_supported: [...MCP_SCOPES],
    bearer_methods_supported: ["header"],
  };
}

export function unauthorizedResponse(origin: string, error = "invalid_token", description = "Sign in to use StartupFans.") {
  const metadata = `${origin}/.well-known/oauth-protected-resource/api/mcp`;
  return new Response(JSON.stringify({ error, error_description: description }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "www-authenticate": `Bearer error="${error}", resource_metadata="${metadata}"`,
      "access-control-allow-origin": "*",
    },
  });
}

export function jsonResponse(body: unknown, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      ...Object.fromEntries(new Headers(extra)),
    },
  });
}
