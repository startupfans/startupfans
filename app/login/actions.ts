"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { magicLinks } from "@/db/schema";
import { getSafeNextPath } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function requestMagicLink(formData: FormData) {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const next = getSafeNextPath(formData.get("next"));
  const query = new URLSearchParams({ next });

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

  try {
    const token = randomBytes(32).toString("hex");
    const link = new URL("/auth/verify", process.env.APP_URL || "http://localhost:3000");
    link.search = new URLSearchParams({ token, next }).toString();

    await db.insert(magicLinks).values({
      tokenHash: createHash("sha256").update(token).digest("hex"),
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const href = link.toString()
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const delivery = await sendEmail({
      to: email,
      subject: "Your startupfans sign-in link",
      html: `<p>Sign in to startupfans:</p><p><a href="${href}">Sign in</a></p><p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>`,
      text: `Sign in to startupfans:\n${link}\n\nThis link expires in 15 minutes. If you did not request it, you can ignore this email.`,
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
