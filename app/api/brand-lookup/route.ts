import { db } from "@/db";
import { lookupBrandFromWebsite } from "@/lib/brand-lookup";
import { getCurrentUser } from "@/lib/auth";
import { allowRateLimit } from "@/lib/ratelimit";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in to look up a website." }, { status: 401, headers });

  const website = new URL(request.url).searchParams.get("website") ?? "";
  if (!website.trim() || website.length > 500) {
    return Response.json({ message: "Enter a website like yourstartup.com." }, { status: 400, headers });
  }

  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  if (!await allowRateLimit(`brand-lookup:${user.id}`, 20, db, windowStart)) {
    return Response.json({ message: "Slow down a little." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }

  try {
    const result = await lookupBrandFromWebsite(website);
    if (!result) {
      return Response.json({ message: "Use a website address like yourstartup.com." }, { status: 400, headers });
    }
    return Response.json(result, { headers });
  } catch (error) {
    console.error("[startupfans] Brand lookup failed.", error);
    return Response.json({ message: "We couldn't look that website up. Try again or skip." }, { status: 502, headers });
  }
}
