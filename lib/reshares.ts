import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postReshares, posts, startups } from "@/db/schema";
import { notifyActivity, notifyMentions } from "@/lib/notifications";
import { allowRateLimit } from "@/lib/ratelimit";
import { isReshareImageUrl } from "@/lib/media";

export function postReshareFields(viewerId: string | null) {
  return {
    reshareCount: sql<number>`(select count(*)::integer from ${postReshares} where ${postReshares.postId} = ${posts.id})`,
    viewerReshared: viewerId === null ? sql<boolean>`false` : sql<boolean>`exists (
      select 1 from ${postReshares} where ${postReshares.postId} = ${posts.id} and ${postReshares.userId} = ${viewerId})`,
  };
}

export function validateReshareNote(value: unknown) {
  if (typeof value !== "string" || value.length > 280 || /[\r\n\u0000]/.test(value)) {
    return { status: "error", message: "Keep your note to one line and 280 characters." } as const;
  }
  return { status: "success", note: value.trim() || null } as const;
}

export async function savePostReshare(postId: string, userId: string, reshare: boolean, note: string | null, imageUrl: string | null = null) {
  const validation = validateReshareNote(note ?? "");
  if (validation.status === "error") return validation;
  if (imageUrl !== null && (typeof imageUrl !== "string" || !isReshareImageUrl(imageUrl, userId))) {
    return { status: "error", message: "Choose an image uploaded for your reshare." } as const;
  }
  const result = await db.transaction(async (tx) => {
    const [post] = await tx.select({ startupId: posts.startupId, slug: startups.slug })
      .from(posts).innerJoin(startups, eq(startups.id, posts.startupId))
      .where(and(eq(posts.id, postId), eq(posts.visibility, "public"))).for("update", { of: posts });
    if (!post) return { status: "error", message: "This post couldn't be found." } as const;
    if (!await allowRateLimit(`post-reshare-user:${userId}`, 30, tx)) {
      return { status: "error", message: "Slow down a little. Try again in a few minutes." } as const;
    }
    const condition = and(eq(postReshares.postId, postId), eq(postReshares.userId, userId));
    const changed = reshare
      ? await tx.insert(postReshares).values({ postId, userId, note: validation.note, imageUrl }).onConflictDoNothing().returning({ note: postReshares.note, imageUrl: postReshares.imageUrl })
      : await tx.delete(postReshares).where(condition).returning({ note: postReshares.note, imageUrl: postReshares.imageUrl });
    const recipientCount = reshare && changed.length > 0 && validation.note
      ? await notifyMentions({ body: validation.note, actorId: userId, postId, markdown: false }, tx) : 0;
    return { status: "success", ...post, changed: changed.length > 0, hasNote: changed[0]?.note != null, hasImage: changed[0]?.imageUrl != null, recipientCount } as const;
  });
  if (reshare && result.status === "success" && result.changed) notifyActivity({ kind: "reshare", actorId: userId, startupId: result.startupId, postId });
  return result;
}
