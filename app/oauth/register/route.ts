import { registerOauthClient } from "@/lib/mcp/oauth";

export function POST(request: Request) {
  return registerOauthClient(request);
}
