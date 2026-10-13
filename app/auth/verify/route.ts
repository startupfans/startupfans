import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { magicLinks, sessions } from "@/db/schema";
import { getSafeNextPath, SESSION_COOKIE_NAME } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { emitPostHogLog } from "@/lib/posthog-logs";
import { canSignUp, existingUser } from "@/lib/signup";
import { allocateHandle } from "@/lib/handles";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeNextPath(url.searchParams.get("next"));
  const inviteToken = /^\/join\/([0-9a-f]{64})(?:[?#]|$)/.exec(next)?.[1];
  const expiredLoginUrl = `/login?${new URLSearchParams({ error: "expired", next })}`;
  const retryLoginUrl = inviteToken ? `${expiredLoginUrl}&invite=${inviteToken}` : expiredLoginUrl;
  const token = url.searchParams.get("token");
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    redirect(retryLoginUrl);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sessionId = await db.transaction(async (tx) => {
    // Claim the token atomically so concurrent requests cannot reuse it.
    const [link] = await tx
      .update(magicLinks)
      .set({ usedAt: now })
      .where(and(eq(magicLinks.tokenHash, tokenHash), isNull(magicLinks.usedAt), gt(magicLinks.expiresAt, now)))
      .returning({ email: magicLinks.email });
    if (!link) return null;

    if (!await canSignUp(link.email, { inviteToken })) return { status: "invite-only" } as const;
    const email = link.email.trim().toLowerCase();
    const existing = await existingUser(email);
    const user = existing ?? await allocateHandle(tx, email);

    const id = randomUUID();
    await tx.insert(sessions).values({ id, userId: user.id, expiresAt });
    return { status: "signed-in", id, userId: user.id } as const;
  });

  if (!sessionId) redirect(retryLoginUrl);
  if (sessionId.status === "invite-only") redirect("/login?error=invite-only");

  await captureServerEvent({
    distinctId: sessionId.userId,
    event: "magic_link_verified",
    sessionId: sessionId.id,
  });
  await emitPostHogLog("magic_link_verified");

  (await cookies()).set(SESSION_COOKIE_NAME, sessionId.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  redirect(next);
}
