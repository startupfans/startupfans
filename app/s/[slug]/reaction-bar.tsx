"use client";

import { StickerReactions } from "@/app/components/sticker-reactions";
import type { PostReactionState } from "@/lib/reactions";
import { setPostReaction } from "./reaction-actions";

export function ReactionBar({ postId, postUrl, signedIn, snapshot }: {
  postId: string;
  postUrl: string;
  signedIn: boolean;
  snapshot: PostReactionState;
}) {
  return <StickerReactions subject="post" postUrl={postUrl} signedIn={signedIn} snapshot={snapshot}
    saveReaction={(kind) => setPostReaction(postId, kind)} />;
}
