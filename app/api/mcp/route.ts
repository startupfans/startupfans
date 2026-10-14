import { actorAuth, mcpHandler } from "@/lib/mcp/handler";
import { missingTokenResponse, verifyAccessToken } from "@/lib/mcp/oauth";
import { publicOrigin } from "@/lib/mcp/policy";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-expose-headers": "www-authenticate",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function handle(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/.exec(header)?.[1] ?? "";
  const actor = token ? await verifyAccessToken(token, publicOrigin(request)) : null;
  if (!actor) return missingTokenResponse(request);
  return withCors(await mcpHandler.fetch(request, { authInfo: actorAuth(actor) }));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export { handle as GET, handle as POST, handle as DELETE };
