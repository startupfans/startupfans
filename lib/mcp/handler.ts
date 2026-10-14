import "server-only";

import { createMcpHandler, type AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { type McpActor } from "@/lib/mcp/policy";
import { registerStartupFansTools } from "@/lib/mcp/tools";

const INSTRUCTIONS = [
  "You are connected to StartupFans as one member.",
  "Read tools need the read scope. Posting, replying, following, unfollowing and deleting need the write scope.",
  "Post only on startups this member belongs to.",
  "create_post publishes a new public update every time it succeeds.",
  "Do not invent fan counts, emails or startups that the tools did not return.",
].join(" ");

function readActor(authInfo: AuthInfo | undefined): McpActor | null {
  const extra = authInfo?.extra;
  if (!authInfo || !extra) return null;
  const { id, handle, name, email, origin } = extra;
  if (typeof id !== "string" || typeof handle !== "string" || typeof email !== "string" || typeof origin !== "string") {
    return null;
  }
  if (name !== null && typeof name !== "string") return null;
  return { id, handle, name, email, origin, scopes: authInfo.scopes, clientId: authInfo.clientId };
}

export const mcpHandler = createMcpHandler(({ authInfo }) => {
  const server = new McpServer({ name: "startupfans", version: "1.0.0" }, { instructions: INSTRUCTIONS });
  const actor = readActor(authInfo);
  if (actor) registerStartupFansTools(server, actor);
  return server;
}, {
  responseMode: "json",
  onerror(error) {
    console.error("[startupfans] MCP request failed.", error.message);
  },
});

export function actorAuth(actor: McpActor): AuthInfo {
  return {
    token: "redacted",
    clientId: actor.clientId,
    scopes: actor.scopes,
    resource: new URL(`${actor.origin}/api/mcp`),
    extra: {
      id: actor.id,
      handle: actor.handle,
      name: actor.name,
      email: actor.email,
      origin: actor.origin,
    },
  };
}
