"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { magicLinks } from "@/db/schema";
import { getSafeNextPath } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { magicLinkEmail } from "@/lib/emails/magic-link";
import { allowMagicLinkRequest } from "@/lib/ratelimit";
import { isInviteToken } from "@/lib/invites";
import { canSignUp } from "@/lib/signup";

export async function requestMagicLink(formData: FormData) {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const rawInvite = formData.get("invite");
  const inviteToken = typeof rawInvite === "string" && isInviteToken(rawInvite) ? rawInvite : undefined;
  const next = inviteToken ? `/join/${inviteToken}` : getSafeNextPath(formData.get("next"));
  const query = new URLSearchParams({ next });
  if (inviteToken) query.set("invite", inviteToken);

  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ||
    email.startsWith(".") ||
    email.includes("..") ||
    email.includes(".@") ||
    email.split("@")[0].length > 64
  ) {
    query.set("error", "invalid");
    redirect(`/login?${query}`);
  }

  let allowed: boolean;
  try {
    allowed = await allowMagicLinkRequest(email, (await headers()).get("x-forwarded-for"));
  } catch (error) {
    console.error("[startupfans auth] Could not check sign-in limit.", error);
    query.set("error", "sending");
    redirect(`/login?${query}`);
  }
  if (!allowed) {
    query.set("error", "rate-limit");
    redirect(`/login?${query}`);
  }

  let canReceiveLink: boolean;
  try {
    canReceiveLink = await canSignUp(email, { inviteToken });
  } catch (error) {
    console.error("[startupfans auth] Could not check sign-up eligibility.", error);
    query.set("error", "sending");
    redirect(`/login?${query}`);
  }
  if (!canReceiveLink) redirect("/login?error=invite-only");

  try {
    const token = randomBytes(32).toString("hex");
    const link = new URL("/auth/verify", process.env.APP_URL || "http://localhost:3000");
    link.search = new URLSearchParams({ token, next }).toString();

    await db.insert(magicLinks).values({
      tokenHash: createHash("sha256").update(token).digest("hex"),
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const delivery = await sendEmail({
      to: email,
      ...magicLinkEmail(link.toString()),
    });
    if (!delivery.delivered && process.env.NODE_ENV !== "production") {
      query.set("dev_link", link.toString());
    }
  } catch (error) {
    console.error("[startupfans auth] Could not send a sign-in link.", error);
    query.set("error", "sending");
    redirect(`/login?${query}`);
  }

  query.set("sent", email);
  redirect(`/login?${query}`);
}
