"use server";

import { revalidatePath } from "next/cache";
import { isValidSessionId, getCurrentUser } from "@/lib/auth";
import { createComment, deleteComment } from "@/lib/comments";
import { captureServerEvent } from "@/lib/posthog-server";

export type CommentActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

function validPost(slug: string, postId: string) {
  return typeof slug === "string" && /^[a-z0-9-]{1,40}$/.test(slug)
    && typeof postId === "string" && isValidSessionId(postId);
}

async function commentChanged(event: "comment_created" | "comment_deleted", userId: string, slug: string, postId: string, startupId: string) {
  revalidatePath(`/s/${slug}/p/${postId}`);
  revalidatePath(`/s/${slug}`);
  revalidatePath("/feed");
  await captureServerEvent({ distinctId: userId, event, properties: { post_id: postId, startup_id: startupId } });
}

export async function replyToPost(slug: string, postId: string, _previousState: CommentActionState, formData: FormData): Promise<CommentActionState> {
  if (!validPost(slug, postId)) return { status: "error", message: "This post couldn't be found." };
  const body = formData.get("body");
  const rawParentId = formData.get("parentId") ?? "";
  if (typeof rawParentId !== "string" || (rawParentId !== "" && !isValidSessionId(rawParentId))) {
    return { status: "error", message: "This reply couldn't be found." };
  }
  const parentId = rawParentId || null;
  if (typeof body !== "string" || !body.trim() || body.length > 1000) {
    return { status: "error", message: "Write a reply between 1 and 1,000 characters." };
  }
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in to reply." };
  let result;
  try {
    result = await createComment(slug, postId, user, body, parentId);
  } catch (error) {
    console.error("[startupfans] Could not create reply.", error);
    return { status: "error", message: "We couldn't save your reply. Try again." };
  }
  if (result.status === "error") return result;
  await commentChanged("comment_created", user.id, slug, postId, result.startupId);
  return { status: "success" };
}

export async function removeComment(slug: string, postId: string, commentId: string, _previousState: CommentActionState, formData: FormData): Promise<CommentActionState> {
  if (!validPost(slug, postId) || typeof commentId !== "string" || !isValidSessionId(commentId)) {
    return { status: "error", message: "This reply couldn't be found." };
  }
  if (formData.get("confirm") !== "delete") return { status: "error", message: "Confirm deletion of this reply." };
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in again to delete this reply." };
  let result;
  try {
    result = await deleteComment(slug, postId, commentId, user);
  } catch (error) {
    console.error("[startupfans] Could not delete reply.", error);
    return { status: "error", message: "We couldn't delete this reply. Try again." };
  }
  if (result.status === "error") return result;
  await commentChanged("comment_deleted", user.id, slug, postId, result.startupId);
  return { status: "success" };
}
