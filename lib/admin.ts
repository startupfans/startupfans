import "server-only";

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { posts, startups } from "@/db/schema";
import { getCurrentUser, isValidSessionId } from "@/lib/auth";

export function isAdminEmail(email: string, raw: string | undefined) {
  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.indexOf("@");
  const domain = atIndex > 0 ? normalizedEmail.slice(atIndex) : "";
  const entries = (raw ?? "").split(",")
    .map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  return entries.some((entry) => entry.startsWith("@")
    ? entry.length > 1 && entry === domain
    : entry === normalizedEmail);
}

export function isAdmin(user: { email: string } | null | undefined) {
  if (!user) return false;
  return isAdminEmail(user.email, process.env.ADMIN_EMAILS);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}

export async function deletePostAsAdmin(postId: string) {
  await requireAdmin();
  if (typeof postId !== "string" || !isValidSessionId(postId)) notFound();
  return db.transaction(async (tx) => {
    const [post] = await tx.select({ slug: startups.slug }).from(posts)
      .innerJoin(startups, eq(posts.startupId, startups.id))
      .where(eq(posts.id, postId)).for("update", { of: posts });
    if (!post) notFound();
    await tx.delete(posts).where(eq(posts.id, postId));
    return post;
  });
}

export async function deleteStartupAsAdmin(slug: string) {
  await requireAdmin();
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(slug)) notFound();
  const [startup] = await db.delete(startups).where(eq(startups.slug, slug))
    .returning({ slug: startups.slug });
  if (!startup) notFound();
  return startup;
}
