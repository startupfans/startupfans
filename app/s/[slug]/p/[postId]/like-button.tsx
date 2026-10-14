"use client";

import { StickerReactions } from "@/app/components/sticker-reactions";
import type { PostReactionState } from "@/lib/reactions";
import { setCommentReaction } from "./comment-actions";

export function CommentReactionBar({ commentId, snapshot, signedIn, postUrl, onReacted }: {
  commentId: string;
  snapshot: PostReactionState;
  signedIn: boolean;
  postUrl: string;
  onReacted?: (commentId: string, result: PostReactionState) => void;
}) {
  return <StickerReactions subject="reply" snapshot={snapshot} signedIn={signedIn} postUrl={postUrl}
    saveReaction={(kind) => setCommentReaction(commentId, kind)} onReacted={(result) => onReacted?.(commentId, result)} />;
}
