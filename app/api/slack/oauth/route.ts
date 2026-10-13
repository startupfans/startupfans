import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { slackConnections } from "@/db/schema";
import { encryptSlackToken } from "@/lib/crypto";
import { requireStartupOwner, withOwnedStartup } from "@/lib/members";
import { isRecord, isSlackConfigured, slackApi, slackAppUrl, SLACK_STATE_COOKIE, verifySlackState } from "@/lib/slack";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSlackConfigured()) return new Response("Slack isn't configured", { status: 503 });
  const query = new URL(request.url).searchParams;
  const cookieStore = await cookies();
  const state = verifySlackState(cookieStore.get(SLACK_STATE_COOKIE)?.value, query.get("state"));
  cookieStore.set(SLACK_STATE_COOKIE, "", { path: "/api/slack", maxAge: 0 });
  if (!state) return new Response("Invalid Slack state", { status: 401 });
  const { user } = await requireStartupOwner(state.slug, { allowSiteAdmin: false });
  if (user.id !== state.userId) return new Response("Invalid Slack state", { status: 401 });
  const settings = new URL(`/s/${state.slug}/settings`, slackAppUrl());
  let message = "slack-connect-failed";
  const code = query.get("code");
  if (code && !query.has("error")) {
    try {
      const result = await slackApi("oauth.v2.access", {
        client_id: process.env.SLACK_CLIENT_ID || "", client_secret: process.env.SLACK_CLIENT_SECRET || "", code,
        redirect_uri: new URL("/api/slack/oauth", slackAppUrl()).toString(),
      });
      const team = result.team;
      if (typeof result.access_token !== "string" || !isRecord(team) || typeof team.id !== "string" || typeof team.name !== "string") {
        throw new Error("Invalid Slack installation.");
      }
      const connection = { slackTeamId: team.id, slackTeamName: team.name, botToken: encryptSlackToken(result.access_token), installedBy: user.id };
      await withOwnedStartup(state.slug, user.id, async (tx, startup) => {
        await tx.insert(slackConnections).values({ startupId: startup.id, ...connection })
          .onConflictDoUpdate({ target: slackConnections.startupId, set: connection });
      }, { allowSiteAdmin: false });
      message = "slack-connected";
    } catch {
      console.error("[startupfans Slack] Could not connect a workspace.");
    }
  }
  settings.searchParams.set("message", message);
  return NextResponse.redirect(settings);
}
