import { metadataResponse } from "@/lib/mcp/oauth";

export function GET(request: Request) {
  return metadataResponse(request, "resource");
}
