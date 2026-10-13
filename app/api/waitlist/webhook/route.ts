import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

// GetWaitlist calls this URL on every signup and offboarding (Automations → Webhook URL).
// It can't sign requests, so the URL carries a shared secret: /api/waitlist/webhook?secret=...
// The payload shape isn't documented, so the message is built from whichever fields arrive.

const MAX_BODY_BYTES = 64 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function pickString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(payload: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return undefined;
}

function formatWaitlistEvent(payload: unknown): string {
  if (!isRecord(payload)) return "🌟 New waitlist event (payload wasn't an object).";

  const event = pickString(payload, ["event", "event_type", "type"])?.toLowerCase();
  const email = pickString(payload, ["email"]) ?? "someone";
  const priority = pickNumber(payload, ["priority", "current_priority", "position"]);
  const referrals = pickNumber(payload, ["amount_referred", "referral_count", "referrals"]);
  const total = pickNumber(payload, ["total_signups", "total_users", "total"]);
  const referredBy = pickString(payload, ["referred_by", "referrer_email"]);

  if (event?.includes("offboard")) return `👋 ${email} was offboarded from the fan list.`;

  const parts = [`🌟 New fan: ${email}`];
  if (priority !== undefined) parts.push(`#${priority.toLocaleString("en-GB")} in line`);
  if (referredBy) parts.push(`referred by ${referredBy}`);
  if (referrals) parts.push(`${referrals} referral${referrals === 1 ? "" : "s"}`);
  if (total !== undefined) parts.push(`${total.toLocaleString("en-GB")} fans total`);
  return parts.join(" · ");
}

export async function POST(request: Request) {
  const slackUrl = process.env.SLACK_WAITLIST_WEBHOOK_URL;
  const secret = process.env.WAITLIST_WEBHOOK_SECRET;
  if (!slackUrl || !secret) return new Response("Waitlist webhook isn't configured", { status: 503 });

  if (!secretMatches(new URL(request.url).searchParams.get("secret"), secret)) {
    return new Response("Invalid secret", { status: 401 });
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const text = formatWaitlistEvent(payload);
  try {
    const response = await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      console.error(`[startupfans waitlist] Slack webhook responded ${response.status}.`);
      return new Response("Slack rejected the message", { status: 502 });
    }
  } catch {
    console.error("[startupfans waitlist] Could not reach the Slack webhook.");
    return new Response("Could not reach Slack", { status: 502 });
  }

  return new Response("OK");
}
