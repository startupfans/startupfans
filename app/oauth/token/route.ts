import { oauthToken } from "@/lib/mcp/oauth";

export function POST(request: Request) {
  return oauthToken(request);
}
