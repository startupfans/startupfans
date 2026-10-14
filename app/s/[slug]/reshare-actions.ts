"use server";

import { refresh, revalidatePath } from "next/cache";
import { getCurrentUser, isValidSessionId } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { savePostReshare, validateReshareNote } from "@/lib/reshares";
import { captureMentionNotifications } from "@/lib/notifications";

export type ReshareState = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

export async function getReshareImageUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function updateReshare(postId: string, _previous: ReshareState, formData: FormData): Promise<ReshareState> {
  const intent = formData.get("intent");
  if (typeof postId !== "string" || !isValidSessionId(postId) || (intent !== "reshare" && intent !== "remove")) {
    return { status: "error", message: "This reshare couldn't be saved." };
  }
  const validation = validateReshareNote(intent === "remove" ? "" : formData.get("note") ?? "");
  if (validation.status === "error") return validation;
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in to reshare a post." };
  const imageUrl = intent === "remove" ? null : formData.get("imageUrl") || null;
  if (imageUrl !== null && typeof imageUrl !== "string") {
    return { status: "error", message: "Choose an image uploaded for your reshare." };
  }
  try {
    const result = await savePostReshare(postId, user.id, intent === "reshare", validation.note, imageUrl);
    if (result.status === "error") return result;
    revalidatePath(`/s/${result.slug}`);
    revalidatePath(`/s/${result.slug}/p/${postId}`);
    revalidatePath("/feed");
    revalidatePath("/u/[handle]", "page");
    refresh();
    if (result.changed) {
      await captureMentionNotifications({ actorId: user.id, postId, startupId: result.startupId, recipientCount: result.recipientCount });
      await captureServerEvent({ distinctId: user.id, event: intent === "reshare" ? "post_reshared" : "post_unreshared",
        properties: { post_id: postId, startup_id: result.startupId, has_note: result.hasNote, has_image: result.hasImage } });
    }
    return { status: "success" };
  } catch {
    return { status: "error", message: "We couldn't update your reshare. Try again." };
  }
}
