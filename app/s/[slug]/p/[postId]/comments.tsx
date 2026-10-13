"use client";

import { useActionState, useId, useState } from "react";
import { SubmitButton } from "@/app/components/submit-button";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import { postIconButtonClass, TrashIcon } from "@/app/components/icons";
import { removeComment, replyToPost, type CommentActionState } from "./comment-actions";

const initialState: CommentActionState = { status: "idle" };

export function CommentComposer({ slug, postId, parentId = null, onReplied }: {
  slug: string;
  postId: string;
  parentId?: string | null;
  onReplied?: () => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (previous: CommentActionState, formData: FormData) => {
    const result = await replyToPost(slug, postId, previous, formData);
    if (result.status === "success") {
      setBody("");
      onReplied?.();
    }
    return result;
  }, initialState);
  return (
    <form action={action} aria-label={parentId ? "Reply to comment" : "Reply to post"} className="mt-6 min-w-0 rounded-2xl border-[3px] border-ink bg-cream p-4 shadow-sticker" aria-busy={pending}>
      <input type="hidden" name="parentId" value={parentId ?? ""} />
      <label htmlFor={inputId} className="block font-semibold">Your reply</label>
      <textarea id={inputId} name="body" rows={3} required maxLength={1000} value={body}
        onChange={(event) => setBody(event.target.value)} disabled={pending}
        aria-describedby={state.status === "error" ? errorId : undefined}
        className="mt-2 block w-full min-w-0 resize-y rounded-xl border-2 border-ink bg-white p-3 disabled:opacity-60" />
      <SubmitButton pending={pending} pendingLabel="Replying…" disabled={!body.trim()}
        className="mt-3 min-h-11 rounded-xl border-2 border-ink bg-pink px-4 py-2 font-semibold shadow-sticker disabled:opacity-60">Reply</SubmitButton>
      {state.status === "error" && <p id={errorId} role="alert" className="mt-3 text-sm">{state.message}</p>}
      {state.status === "success" && <p role="status" className="sr-only">Reply posted.</p>}
    </form>
  );
}

export function InlineReply({ slug, postId, commentId }: { slug: string; postId: string; commentId: string }) {
  const [open, setOpen] = useState(false);
  const composerId = useId();
  return (
    <div className={`min-w-0 ${open ? "basis-full" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={composerId} onClick={() => setOpen(!open)}
        className="min-h-11 py-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        {open ? "Cancel reply" : "Reply"}
      </button>
      <div id={composerId}>
        {open && <CommentComposer slug={slug} postId={postId} parentId={commentId} onReplied={() => setOpen(false)} />}
      </div>
    </div>
  );
}

export function DeleteCommentButton({ slug, postId, commentId }: { slug: string; postId: string; commentId: string }) {
  const [state, action, pending] = useActionState(removeComment.bind(null, slug, postId, commentId), initialState);
  return (
    <form action={action} className="min-w-0 max-w-full" aria-busy={pending}>
      <input type="hidden" name="confirm" value="delete" />
      <ConfirmSubmit icon pending={pending} pendingLabel="Deleting…" title="Delete reply" aria-label="Delete reply"
        dialogTitle="Delete this reply?" description="This reply will be removed. Replies to it will stay visible."
        confirmLabel="Delete reply" className={postIconButtonClass}>
        <TrashIcon />
      </ConfirmSubmit>
      {state.status === "error" && <p role="alert" className="mt-2 text-sm">{state.message}</p>}
    </form>
  );
}
