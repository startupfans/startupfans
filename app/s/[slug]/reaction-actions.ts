"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isValidSessionId } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { savePostReaction, type PostReactionKind, type PostReactionState } from "@/lib/reactions";

export async function setPostReaction(postId: string, kind: PostReactionKind | null): Promise<PostReactionState> {
  if (typeof postId !== "string" || !isValidSessionId(postId)
    || (kind !== null && kind !== "heart" && kind !== "tomato")) {
    throw new Error("This reaction couldn't be saved.");
  }
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to react to a post.");
  const result = await savePostReaction(postId, user.id, kind);
  if (result.status === "error") throw new Error(result.message);
  revalidatePath(`/s/${result.slug}/p/${postId}`);
  revalidatePath(`/s/${result.slug}`);
  revalidatePath("/feed");
  revalidatePath(`/u/${user.handle}`);
  if (result.changed) {
    await captureServerEvent({ distinctId: user.id, event: kind === null ? "post_unreacted" : "post_reacted",
      properties: { post_id: postId, startup_id: result.startupId, kind: kind ?? result.previousKind } });
  }
  return { kind: result.kind, counts: result.counts };
}
