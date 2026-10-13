import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { suggestMentions } from "@/lib/mentions";
import { allowRateLimit } from "@/lib/ratelimit";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in to mention someone." }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim();
  const slug = params.get("startup") ?? "";
  if (!/^[a-z0-9_]{1,24}$/i.test(query) || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    return Response.json({ message: "Use a handle prefix and startup page address." }, { status: 400, headers });
  }
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  if (!await allowRateLimit(`mention-user:${user.id}`, 30, db, windowStart)) {
    return Response.json({ message: "Slow down a little." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }
  return Response.json(await suggestMentions(user.id, slug, query), { headers });
}
