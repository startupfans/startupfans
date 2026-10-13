import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE_NAME = "sf_session";

export function isValidSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function getSafeNextPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  ) {
    return "/me";
  }

  const url = new URL(value, "http://localhost");
  if (url.origin !== "http://localhost" || url.pathname.startsWith("//")) {
    return "/me";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export const getCurrentUser = cache(async () => {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId || !isValidSessionId(sessionId)) return null;

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row?.user ?? null;
});

export async function requireUser(next = "/me") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?${new URLSearchParams({ next: getSafeNextPath(next) })}`);
  }
  return user;
}

export async function signOut() {
  "use server";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId && isValidSessionId(sessionId)) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
