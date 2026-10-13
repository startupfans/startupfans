import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { postReports, posts, startups } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { getCurrentUser, isValidSessionId } from "@/lib/auth";

export async function submitPostReport(slug: string, postId: string, reason: string) {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(slug)
    || typeof postId !== "string" || !isValidSessionId(postId)
    || typeof reason !== "string" || reason.length > 500) return false;
  const user = await getCurrentUser();
  return db.transaction(async (tx) => {
    const [post] = await tx.select({ id: posts.id }).from(posts)
      .innerJoin(startups, eq(posts.startupId, startups.id))
      .where(and(eq(posts.id, postId), eq(startups.slug, slug), eq(posts.visibility, "public")))
      .for("share", { of: posts });
    if (!post) return false;
    await tx.insert(postReports).values({
      postId: post.id,
      reporterId: user?.id ?? null,
      reason: reason.trim(),
    }).onConflictDoNothing({ target: [postReports.postId, postReports.reporterId] });
    return true;
  });
}

export async function listOpenReports() {
  await requireAdmin();
  return db.select({
    postId: posts.id,
    excerpt: sql<string>`left(${posts.bodyMd}, 280)`,
    startupName: startups.name,
    startupSlug: startups.slug,
    count: sql<number>`count(*)::integer`,
    reasons: sql<string[] | null>`array_agg(distinct ${postReports.reason}) filter (where ${postReports.reason} <> '')`,
  }).from(postReports)
    .innerJoin(posts, eq(posts.id, postReports.postId))
    .innerJoin(startups, eq(startups.id, posts.startupId))
    .where(isNull(postReports.resolvedAt))
    .groupBy(posts.id, startups.id)
    .orderBy(desc(sql`max(${postReports.createdAt})`));
}

export async function resolvePostReports(postId: string) {
  await requireAdmin();
  if (typeof postId !== "string" || !isValidSessionId(postId)) return false;
  await db.update(postReports).set({ resolvedAt: new Date() })
    .where(and(eq(postReports.postId, postId), isNull(postReports.resolvedAt)));
  return true;
}
