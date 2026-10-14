import "server-only";

import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { oauthClients, oauthCodes, oauthTokens, users } from "@/db/schema";
import { allowRateLimit } from "@/lib/ratelimit";
import {
  type McpActor,
  type McpScope,
  authorizationServerMetadata,
  cleanClientName,
  clientIp,
  formatScopes,
  hashToken,
  isAccessToken,
  isAuthCode,
  isClientId,
  isCodeChallenge,
  isMcpResource,
  isRefreshToken,
  isValidState,
  jsonResponse,
  mcpResource,
  newToken,
  parseScopes,
  pkceMatches,
  protectedResourceMetadata,
  publicOrigin,
  redirectUriError,
  unauthorizedResponse,
} from "@/lib/mcp/policy";

const ACCESS_SECONDS = 60 * 60;
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_MS = 60 * 1000;

type OauthTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Grant = "authorization_code" | "refresh_token";

function oauthError(status: number, error: string, description: string) {
  return jsonResponse({ error, error_description: description }, status);
}

export function metadataResponse(request: Request, kind: "authorization" | "resource") {
  const origin = publicOrigin(request);
  const body = kind === "authorization" ? authorizationServerMetadata(origin) : protectedResourceMetadata(origin);
  return jsonResponse(body, 200, { "cache-control": "public, max-age=300" });
}

export function missingTokenResponse(request: Request) {
  return unauthorizedResponse(publicOrigin(request));
}

export async function verifyAccessToken(token: string, origin: string): Promise<McpActor | null> {
  if (!isAccessToken(token)) return null;
  const [row] = await db.select({
    id: users.id,
    handle: users.handle,
    name: users.name,
    email: users.email,
    scope: oauthTokens.scope,
    clientId: oauthTokens.clientId,
    resource: oauthTokens.resource,
  }).from(oauthTokens)
    .innerJoin(users, eq(users.id, oauthTokens.userId))
    .where(and(
      eq(oauthTokens.accessTokenHash, hashToken(token)),
      isNull(oauthTokens.revokedAt),
      gt(oauthTokens.expiresAt, new Date()),
      eq(oauthTokens.resource, mcpResource(origin)),
    ))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    email: row.email,
    origin,
    scopes: row.scope.split(" "),
    clientId: row.clientId,
  };
}

export async function getOauthClient(clientId: string) {
  if (!isClientId(clientId)) return null;
  const [client] = await db.select({
    id: oauthClients.id,
    name: oauthClients.name,
    redirectUris: oauthClients.redirectUris,
  }).from(oauthClients).where(eq(oauthClients.id, clientId)).limit(1);
  return client ?? null;
}

export async function registerOauthClient(request: Request) {
  if (!await allowRateLimit(`oauth-register:${clientIp(request)}`, 20)) {
    return oauthError(429, "too_many_requests", "Try again in a few minutes.");
  }
  const text = await request.text();
  if (text.length > 8000 || !request.headers.get("content-type")?.includes("application/json")) {
    return oauthError(400, "invalid_client_metadata", "Send client metadata as JSON.");
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return oauthError(400, "invalid_client_metadata", "Send client metadata as JSON.");
  }
  if (!body || typeof body !== "object") return oauthError(400, "invalid_client_metadata", "Send a client metadata object.");
  const record = body as Record<string, unknown>;
  const name = record.client_name === undefined ? "MCP client" : cleanClientName(record.client_name);
  if (!name) return oauthError(400, "invalid_client_metadata", "Use a client name of 1 to 80 characters.");
  if (!Array.isArray(record.redirect_uris) || record.redirect_uris.length < 1 || record.redirect_uris.length > 5) {
    return oauthError(400, "invalid_redirect_uri", "Include 1 to 5 redirect URIs.");
  }
  const redirectUris: string[] = [];
  for (const value of record.redirect_uris) {
    if (typeof value !== "string") return oauthError(400, "invalid_redirect_uri", "Redirect URIs must be strings.");
    const error = redirectUriError(value);
    if (error) return oauthError(400, "invalid_redirect_uri", error);
    if (!redirectUris.includes(value)) redirectUris.push(value);
  }
  const method = record.token_endpoint_auth_method;
  if (method !== undefined && method !== "none") {
    return oauthError(400, "invalid_client_metadata", "This server accepts public clients only.");
  }
  if (!acceptedList(record.grant_types, ["authorization_code", "refresh_token"])
    || !acceptedList(record.response_types, ["code"])) {
    return oauthError(400, "invalid_client_metadata", "Use the authorization code grant.");
  }
  const id = newToken("client");
  await db.insert(oauthClients).values({ id, name, redirectUris });
  return jsonResponse({
    client_id: id,
    client_name: name,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }, 201);
}

function acceptedList(value: unknown, allowed: readonly string[]) {
  if (value === undefined) return true;
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && allowed.includes(item));
}

export interface OauthDecisionInput {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  responseType: string;
  scope: string;
  resource: string;
  decision: string;
}

export async function decideOauthConnection(userId: string, origin: string, input: OauthDecisionInput) {
  if (!await allowRateLimit(`oauth-authorize:${userId}`, 30)) {
    return { type: "reject", message: "Too many connection attempts. Try again in a few minutes." } as const;
  }
  const client = await getOauthClient(input.clientId);
  const redirectError = redirectUriError(input.redirectUri);
  const registered = Boolean(client && !redirectError && client.redirectUris.includes(input.redirectUri));
  if (!client || !registered || !isValidState(input.state) || !isCodeChallenge(input.codeChallenge)) {
    return { type: "reject", message: "This connection link is not valid. Ask the app to start again." } as const;
  }
  const denied = new URL(input.redirectUri);
  denied.searchParams.set("state", input.state);
  if (input.decision === "deny") {
    denied.searchParams.set("error", "access_denied");
    return { type: "redirect", url: denied.toString() } as const;
  }
  if (input.decision !== "allow") {
    return { type: "reject", message: "Choose allow or cancel." } as const;
  }
  if (input.responseType !== "code" || input.codeChallengeMethod !== "S256") {
    denied.searchParams.set("error", "unsupported_response_type");
    return { type: "redirect", url: denied.toString() } as const;
  }
  const scopes = parseScopes(input.scope);
  if (!scopes) {
    denied.searchParams.set("error", "invalid_scope");
    return { type: "redirect", url: denied.toString() } as const;
  }
  const resource = input.resource || mcpResource(origin);
  if (!isMcpResource(resource, origin)) {
    denied.searchParams.set("error", "invalid_target");
    return { type: "redirect", url: denied.toString() } as const;
  }
  const code = newToken("code");
  await db.insert(oauthCodes).values({
    tokenHash: hashToken(code),
    clientId: client.id,
    userId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    scope: formatScopes(scopes),
    resource,
    expiresAt: new Date(Date.now() + CODE_MS),
  });
  denied.searchParams.set("code", code);
  return { type: "redirect", url: denied.toString() } as const;
}

export async function oauthToken(request: Request) {
  if (!await allowRateLimit(`oauth-token:${clientIp(request)}`, 60)) {
    return oauthError(429, "too_many_requests", "Try again in a few minutes.");
  }
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/x-www-form-urlencoded")) {
    return oauthError(400, "invalid_request", "Send the token request as a form.");
  }
  const text = await request.text();
  if (text.length > 16000) return oauthError(400, "invalid_request", "That token request is too large.");
  const params = new URLSearchParams(text);
  const grant = params.get("grant_type");
  if (grant !== "authorization_code" && grant !== "refresh_token") {
    return grant === null
      ? oauthError(400, "invalid_request", "Include grant_type.")
      : oauthError(400, "unsupported_grant_type", "Use authorization_code or refresh_token.");
  }
  const selected: Grant = grant;
  const origin = publicOrigin(request);
  switch (selected) {
    case "authorization_code":
      return exchangeCode(params, origin);
    case "refresh_token":
      return exchangeRefresh(params, origin);
    default: {
      const unexpected: never = selected;
      return unexpected;
    }
  }
}

async function exchangeCode(params: URLSearchParams, origin: string) {
  const clientId = params.get("client_id") ?? "";
  const code = params.get("code") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const verifier = params.get("code_verifier") ?? "";
  const resource = params.get("resource");
  if (!isClientId(clientId) || !isAuthCode(code) || !redirectUri || !verifier) {
    return oauthError(400, "invalid_request", "Include client_id, code, redirect_uri and code_verifier.");
  }
  if (resource !== null && !isMcpResource(resource, origin)) {
    return oauthError(400, "invalid_target", "The resource must be this StartupFans connection.");
  }
  const hash = hashToken(code);
  return db.transaction(async (tx) => {
    await tx.delete(oauthCodes).where(lt(oauthCodes.expiresAt, new Date(Date.now() - CODE_MS)));
    const [row] = await tx.select().from(oauthCodes).where(eq(oauthCodes.tokenHash, hash)).for("update");
    const mismatch = !row || row.usedAt !== null || row.expiresAt <= new Date() || row.clientId !== clientId
      || row.redirectUri !== redirectUri || (resource !== null && resource !== row.resource)
      || !pkceMatches(verifier, row.codeChallenge);
    if (!row || mismatch) {
      if (row && row.usedAt === null) {
        await tx.update(oauthCodes).set({ usedAt: new Date() }).where(eq(oauthCodes.tokenHash, hash));
      }
      return oauthError(400, "invalid_grant", "That code is invalid or expired.");
    }
    await tx.update(oauthCodes).set({ usedAt: new Date() }).where(eq(oauthCodes.tokenHash, hash));
    return issueTokenPair(tx, {
      userId: row.userId,
      clientId: row.clientId,
      scope: row.scope,
      resource: row.resource,
      familyId: crypto.randomUUID(),
    });
  });
}

async function exchangeRefresh(params: URLSearchParams, origin: string) {
  const clientId = params.get("client_id") ?? "";
  const refresh = params.get("refresh_token") ?? "";
  const resource = params.get("resource");
  if (!isClientId(clientId) || !isRefreshToken(refresh)) {
    return oauthError(400, "invalid_request", "Include client_id and refresh_token.");
  }
  if (resource !== null && !isMcpResource(resource, origin)) {
    return oauthError(400, "invalid_target", "The resource must be this StartupFans connection.");
  }
  const hash = hashToken(refresh);
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(oauthTokens).where(eq(oauthTokens.refreshTokenHash, hash)).for("update");
    if (!row || row.clientId !== clientId || (resource !== null && resource !== row.resource)) {
      return oauthError(400, "invalid_grant", "That refresh token is invalid.");
    }
    const requested = narrowedScopes(params.get("scope"), row.scope);
    if (!requested) return oauthError(400, "invalid_scope", "Ask only for scopes this connection already has.");
    if (row.revokedAt || row.refreshExpiresAt <= new Date()) {
      await tx.update(oauthTokens).set({ revokedAt: new Date() })
        .where(and(eq(oauthTokens.familyId, row.familyId), isNull(oauthTokens.revokedAt)));
      return oauthError(400, "invalid_grant", "That refresh token is invalid.");
    }
    await tx.update(oauthTokens).set({ revokedAt: new Date() }).where(eq(oauthTokens.id, row.id));
    return issueTokenPair(tx, {
      userId: row.userId,
      clientId: row.clientId,
      scope: formatScopes(requested),
      resource: row.resource,
      familyId: row.familyId,
    });
  });
}

function narrowedScopes(requested: string | null, granted: string): McpScope[] | null {
  const current = granted.split(" ");
  if (requested === null || requested.trim() === "") return parseScopes(granted);
  const parsed = parseScopes(requested);
  if (!parsed || parsed.some((scope) => !current.includes(scope))) return null;
  return parsed;
}

async function issueTokenPair(tx: OauthTransaction, input: {
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
  familyId: string;
}) {
  const access = newToken("access");
  const refresh = newToken("refresh");
  await tx.insert(oauthTokens).values({
    familyId: input.familyId,
    userId: input.userId,
    clientId: input.clientId,
    accessTokenHash: hashToken(access),
    refreshTokenHash: hashToken(refresh),
    scope: input.scope,
    resource: input.resource,
    expiresAt: new Date(Date.now() + ACCESS_SECONDS * 1000),
    refreshExpiresAt: new Date(Date.now() + REFRESH_MS),
  });
  return jsonResponse({
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_SECONDS,
    refresh_token: refresh,
    scope: input.scope,
  });
}
