import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireStartupOwner } from "@/lib/members";
import { createSlackState, isSlackConfigured, SLACK_SCOPES, SLACK_STATE_COOKIE, slackAppUrl } from "@/lib/slack";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSlackConfigured()) return new Response("Slack isn't configured", { status: 503 });
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || !/^[a-z0-9-]{1,40}$/.test(slug)) return new Response("Invalid startup", { status: 400 });
  const { user } = await requireStartupOwner(slug, { allowSiteAdmin: false });
  const state = createSlackState(slug, user.id);
  (await cookies()).set(SLACK_STATE_COOKIE, state.cookie, {
    httpOnly: true, secure: slackAppUrl().protocol === "https:", sameSite: "lax", path: "/api/slack", maxAge: 600,
  });
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.search = new URLSearchParams({ client_id: process.env.SLACK_CLIENT_ID || "", scope: SLACK_SCOPES.join(","),
    redirect_uri: new URL("/api/slack/oauth", slackAppUrl()).toString(), state: state.nonce }).toString();
  return NextResponse.redirect(url);
}
