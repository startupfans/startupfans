"use server";

import { refresh, revalidatePath } from "next/cache";
import { getCurrentUser, isValidSessionId } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { savePostReshare, validateReshareNote } from "@/lib/reshares";

export type ReshareState = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

export async function updateReshare(postId: string, _previous: ReshareState, formData: FormData): Promise<ReshareState> {
  const intent = formData.get("intent");
  if (typeof postId !== "string" || !isValidSessionId(postId) || (intent !== "reshare" && intent !== "remove")) {
    return { status: "error", message: "This reshare couldn't be saved." };
  }
  const validation = validateReshareNote(intent === "remove" ? "" : formData.get("note") ?? "");
  if (validation.status === "error") return validation;
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in to reshare a post." };
  try {
    const result = await savePostReshare(postId, user.id, intent === "reshare", validation.note);
    if (result.status === "error") return result;
    revalidatePath(`/s/${result.slug}`);
    revalidatePath(`/s/${result.slug}/p/${postId}`);
    revalidatePath("/feed");
    revalidatePath("/u/[handle]", "page");
    refresh();
    if (result.changed) {
      await captureServerEvent({ distinctId: user.id, event: intent === "reshare" ? "post_reshared" : "post_unreshared",
        properties: { post_id: postId, startup_id: result.startupId, has_note: result.hasNote } });
    }
    return { status: "success" };
  } catch {
    return { status: "error", message: "We couldn't update your reshare. Try again." };
  }
}
