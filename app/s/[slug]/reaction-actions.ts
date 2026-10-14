"use server";

import { after } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, isValidSessionId } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { savePostReaction, type PostReactionKind, type PostReactionState } from "@/lib/reactions";

export async function setPostReaction(postId: string, kind: PostReactionKind | null): Promise<PostReactionState> {
  if (typeof postId !== "string" || !isValidSessionId(postId)
    || (kind !== null && kind !== "heart" && kind !== "tomato")) {
    throw new Error("This reaction couldn't be saved.");
  }
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId || !isValidSessionId(sessionId)) throw new Error("Sign in to react to a post.");
  const result = await savePostReaction(postId, sessionId, kind);
  if (result.status === "error") throw new Error(result.message);
  if (result.changed) {
    after(() => captureServerEvent({ distinctId: result.userId, event: kind === null ? "post_unreacted" : "post_reacted",
      properties: { post_id: postId, startup_id: result.startupId, kind: kind ?? result.previousKind } }));
  }
  return { kind: result.kind, counts: result.counts };
}
