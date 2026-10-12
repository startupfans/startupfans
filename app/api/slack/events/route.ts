import { after } from "next/server";
import { isRecord, isSlackConfigured, parseSlackReaction, publishSlackReaction, verifySlackSignature } from "@/lib/slack";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSlackConfigured()) return new Response("Slack isn't configured", { status: 503 });
  const body = await request.text();
  if (!verifySlackSignature(body, request.headers.get("x-slack-request-timestamp"), request.headers.get("x-slack-signature"))) {
    return new Response("Invalid Slack signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("OK");
  }
  if (isRecord(payload) && payload.type === "url_verification" && typeof payload.challenge === "string") {
    return Response.json({ challenge: payload.challenge });
  }
  const event = parseSlackReaction(payload);
  if (event) after(async () => {
    try {
      await publishSlackReaction(event);
    } catch {
      console.error("[startupfans Slack] Could not publish a reaction.");
    }
  });
  return new Response("OK");
}
