import { cookies } from "next/headers";
import { PostHog } from "posthog-node";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

type EventProperties = Record<string, boolean | number | string | null | undefined>;

type ServerEvent = {
  distinctId: string;
  event: string;
  properties?: EventProperties;
  sessionId?: string;
};

function configuredValue(key: "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN" | "NEXT_PUBLIC_POSTHOG_HOST") {
  const value = process.env[key];
  if (value) return value;

  if (process.env.NODE_ENV !== "production") {
    throw new Error(`${key} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${key} is configured`);
  }
  return null;
}

export async function captureServerEvent({ distinctId, event, properties, sessionId }: ServerEvent) {
  const token = configuredValue("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN");
  const host = configuredValue("NEXT_PUBLIC_POSTHOG_HOST");
  if (!token || !host) return;

  const requestSessionId = sessionId ?? (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const posthog = new PostHog(token, {
    host,
    enableExceptionAutocapture: true,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    posthog.capture({
      distinctId,
      event,
      properties: requestSessionId ? { ...properties, $session_id: requestSessionId } : properties,
    });
    await posthog.shutdown();
  } catch (error) {
    console.error("[startupfans] Could not capture PostHog event.", error);
  }
}
