"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { posts, startupMembers, startups } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser, isValidSessionId } from "@/lib/auth";
import { isStartupMediaUrl } from "@/lib/posts";
import { submitPostReport } from "@/lib/reports";
import { captureServerEvent } from "@/lib/posthog-server";
import { emitPostHogLog } from "@/lib/posthog-logs";

export type PostActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function createPost(
  slug: string,
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const body = formData.get("body");
  const mediaUrl = formData.get("mediaUrl") ?? "";
  const mediaType = formData.get("mediaType") ?? "";
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(slug)) {
    return { status: "error", message: "This startup couldn't be found." };
  }
  if (typeof body !== "string" || !body.trim() || body.length > 5000) {
    return { status: "error", message: "Write an update between 1 and 5,000 characters." };
  }
  if (typeof mediaUrl !== "string" || typeof mediaType !== "string"
    || (mediaUrl === "" ? mediaType !== "" : !isStartupMediaUrl(mediaUrl, slug)
      || (mediaType !== "image" && mediaType !== "video"))) {
    return { status: "error", message: "Remove the attachment and upload it again." };
  }
  const attachmentType = mediaType === "image" || mediaType === "video" ? mediaType : null;
  if (mediaUrl && !(attachmentType === "image" ? /\.(jpe?g|png|webp|gif)$/i : /\.(mp4|webm)$/i).test(mediaUrl)) {
    return { status: "error", message: "The attachment doesn't match its media type. Upload it again." };
  }
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in again to post your update." };

  let postId: string;
  try {
    const post = await db.transaction(async (tx) => {
      const [member] = await tx.select({ startupId: startups.id }).from(startupMembers)
        .innerJoin(startups, eq(startups.id, startupMembers.startupId))
        .where(and(eq(startups.slug, slug), eq(startupMembers.userId, user.id)))
        .for("share", { of: startupMembers });
      if (!member) return null;
      const [created] = await tx.insert(posts).values({
        startupId: member.startupId,
        authorId: user.id,
        bodyMd: body.trim(),
        visibility: "public",
        source: "web",
        mediaUrl: mediaUrl || null,
        mediaType: attachmentType,
      }).returning({ id: posts.id });
      return created;
    });
    if (!post) return { status: "error", message: "Only team members can post here." };
    postId = post.id;
  } catch (error) {
    console.error("[startupfans] Could not create post.", error);
    return { status: "error", message: "We couldn't publish your update. Try again." };
  }
  await captureServerEvent({
    distinctId: user.id,
    event: "post_created",
    properties: {
      attachment_type: attachmentType,
      has_attachment: Boolean(mediaUrl),
    },
  });
  await emitPostHogLog("post_created");
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/p/${postId}`);
  return { status: "success" };
}

export async function deletePost(
  slug: string,
  postId: string,
): Promise<PostActionState> {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(slug)
    || typeof postId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
    return { status: "error", message: "This post couldn't be found." };
  }
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in again to delete this post." };
  try {
    const deleted = await db.transaction(async (tx) => {
      if (isAdmin(user)) {
        const [startup] = await tx.select({ id: startups.id }).from(startups)
          .where(eq(startups.slug, slug));
        if (!startup) return false;
        const [post] = await tx.delete(posts)
          .where(and(eq(posts.id, postId), eq(posts.startupId, startup.id)))
          .returning({ id: posts.id });
        return Boolean(post);
      }
      const [member] = await tx.select({ startupId: startups.id, role: startupMembers.role })
        .from(startupMembers).innerJoin(startups, eq(startups.id, startupMembers.startupId))
        .where(and(eq(startups.slug, slug), eq(startupMembers.userId, user.id)))
        .for("share", { of: startupMembers });
      if (!member) return false;
      const [post] = await tx.delete(posts).where(and(
        eq(posts.id, postId), eq(posts.startupId, member.startupId),
        member.role === "owner" ? undefined : eq(posts.authorId, user.id),
      )).returning({ id: posts.id });
      return Boolean(post);
    });
    if (!deleted) return { status: "error", message: "Only the author or a team owner can delete this post." };
  } catch (error) {
    console.error("[startupfans] Could not delete post.", error);
    return { status: "error", message: "We couldn't delete this post. Try again." };
  }
  await captureServerEvent({
    distinctId: user.id,
    event: "post_deleted",
    properties: { deleted_by_admin: isAdmin(user) },
  });
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/p/${postId}`);
  revalidatePath("/feed");
  revalidatePath("/admin");
  return { status: "success" };
}

export async function reportPost(slug: string, postId: string, formData: FormData) {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(slug)
    || typeof postId !== "string" || !isValidSessionId(postId)) notFound();
  const path = `/s/${slug}/p/${postId}`;
  const reason = formData.get("reason") ?? "";
  if (typeof reason !== "string" || reason.length > 500) redirect(`${path}?report=invalid`);
  let reported = false;
  try {
    reported = await submitPostReport(slug, postId, reason);
  } catch {
    console.error("[startupfans] Could not save post report.");
  }
  if (!reported) redirect(`${path}?report=failed`);
  revalidatePath("/admin");
  redirect(`${path}?report=thanks`);
}
