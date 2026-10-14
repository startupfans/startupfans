"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ProfileImage } from "@/app/components/profile-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicComment, ReplyComment } from "@/lib/comments";
import { CommentReactionBar } from "./like-button";
import type { PostReactionState } from "@/lib/reactions";
import { ReplyImagePicker, ReplyMedia, useReplyImage } from "@/app/components/reply-image";
import { relativeDate } from "@/lib/relative-date";
import { MentionAutocomplete } from "@/app/components/mention-autocomplete";
import { SubmitButton } from "@/app/components/submit-button";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import { postIconButtonClass, TrashIcon } from "@/app/components/icons";
import { updateFollow, type FollowState } from "../../actions";
import { removeComment, replyToPost, type CommentActionState } from "./comment-actions";

const initialState: CommentActionState = { status: "idle" };
const initialFollowState: FollowState = { status: "idle" };

export function CommentComposer({ slug, postId, userId, parentId = null, onReplied }: {
  slug: string;
  postId: string;
  userId: string | null;
  parentId?: string | null;
  onReplied?: () => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [body, setBody] = useState("");
  const image = useReplyImage(userId);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [state, action, pending] = useActionState(async (previous: CommentActionState, formData: FormData) => {
    const result = await replyToPost(slug, postId, previous, formData);
    if (result.status === "success") {
      setBody("");
      image.removeAttachment();
      onReplied?.();
    }
    return result;
  }, initialState);
  return (
    <form action={action} onSubmit={(event) => { if (pending || image.uploading) event.preventDefault(); }}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current += 1;
        if (!pending) setDragging(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = pending ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void image.attachFile(file, pending);
      }}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.items).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
        if (!file || pending) return;
        event.preventDefault();
        void image.attachFile(file, pending);
      }} aria-label={parentId ? "Reply to comment" : "Reply to post"} className={`relative mt-6 min-w-0 rounded-2xl border-[3px] border-ink bg-cream p-4 shadow-sticker ${dragging ? "outline-2 outline-offset-4 outline-dashed outline-ink" : ""}`} aria-busy={pending || image.uploading}>
      {dragging && <div role="status" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-cream/95 font-bold">Drop to attach</div>}
      <input type="hidden" name="parentId" value={parentId ?? ""} />
      <label htmlFor={inputId} className="block font-semibold">Your reply</label>
      <MentionAutocomplete startup={slug} id={inputId} name="body" rows={3} required maxLength={1000} value={body}
        onValueChange={setBody} disabled={pending}
        aria-describedby={state.status === "error" ? errorId : undefined}
        className="mt-2 block w-full min-w-0 resize-y rounded-xl border-2 border-ink bg-white p-3 disabled:opacity-60" />
      <ReplyImagePicker image={image} pending={pending} />
      <SubmitButton pending={pending} pendingLabel="Replying…" disabled={image.uploading || !body.trim()}
        className="mt-3 min-h-11 rounded-xl border-2 border-ink bg-pink px-4 py-2 font-semibold shadow-sticker disabled:opacity-60">Reply</SubmitButton>
      {state.status === "error" && <p id={errorId} role="alert" className="mt-3 text-sm">{state.message}</p>}
      {state.status === "success" && <p role="status" className="sr-only">Reply posted.</p>}
    </form>
  );
}

export function InlineReply({ slug, postId, userId, commentId, onReplied }: { slug: string; postId: string; userId: string | null; commentId: string; onReplied?: () => void }) {
  const [open, setOpen] = useState(false);
  const composerId = useId();
  return (
    <div className={`min-w-0 ${open ? "basis-full" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={composerId} onClick={() => setOpen(!open)}
        className="min-h-11 py-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        {open ? "Cancel reply" : "Reply"}
      </button>
      <div id={composerId}>
        {open && <CommentComposer slug={slug} postId={postId} userId={userId} parentId={commentId} onReplied={() => { setOpen(false); onReplied?.(); }} />}
      </div>
    </div>
  );
}

export function DeleteCommentButton({ slug, postId, commentId, onDeleted }: { slug: string; postId: string; commentId: string; onDeleted?: () => void }) {
  const [state, action, pending] = useActionState(async (previous: CommentActionState, formData: FormData) => {
    const result = await removeComment(slug, postId, commentId, previous, formData);
    if (result.status === "success") onDeleted?.();
    return result;
  }, initialState);
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

export function CommentTime({ dateTime }: { dateTime: string }) {
  const [label, setLabel] = useState<string | null>(null);
  const absoluteDate = new Date(dateTime).toLocaleString("en-GB", { timeZone: "UTC" });
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLabel(relativeDate(new Date(dateTime))));
    return () => cancelAnimationFrame(frame);
  }, [dateTime]);
  return <time dateTime={dateTime} title={absoluteDate}>{label ?? absoluteDate}</time>;
}

export function CommentContent({ comment, slug, postId, canDelete, canReply, viewerId, onReplied, onDeleted, onReacted }: {
  comment: PublicComment | ReplyComment;
  slug: string;
  postId: string;
  canDelete: boolean;
  canReply: boolean;
  viewerId: string | null;
  onReplied?: () => void;
  onDeleted?: () => void;
  onReacted?: (commentId: string, result: PostReactionState) => void;
}) {
  const createdAt = new Date(comment.createdAt);
  return (
    <article id={`comment-${comment.id}`} className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink/60">
        {comment.avatarUrl ? <ProfileImage src={comment.avatarUrl} alt="" width={32} height={32} sizes="32px" referrerPolicy="no-referrer"
          className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" /> : (
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold text-ink">
            {comment.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 max-w-full break-words font-bold text-ink">{comment.displayName}</span>
        <CommentTime key={createdAt.toISOString()} dateTime={createdAt.toISOString()} />
        {canDelete && <div className="ml-auto">
          <DeleteCommentButton slug={slug} postId={postId} commentId={comment.id} onDeleted={onDeleted} />
        </div>}
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.mentions.map((segment, index) => segment.handle === null ? segment.text : (
        <Link key={index} href={`/u/${segment.handle}`} className="font-bold text-ink underline decoration-transparent decoration-4 underline-offset-4 hover:decoration-sun">{segment.text}</Link>
      ))}</p>
      <ReplyMedia imageUrl={comment.imageUrl} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <CommentReactionBar commentId={comment.id} snapshot={{ kind: comment.viewerReaction, counts: comment.reactionCounts }}
          signedIn={viewerId !== null} postUrl={`/s/${slug}/p/${postId}`} onReacted={onReacted} />
        {canReply && <InlineReply slug={slug} postId={postId} userId={viewerId} commentId={comment.id} onReplied={onReplied} />}
      </div>
    </article>
  );
}

export function CommentList({ comments, slug, postId, viewerId, canReply, canModerate, onReplied, onDeleted, onReacted }: {
  comments: (PublicComment | ReplyComment)[];
  slug: string;
  postId: string;
  viewerId: string | null;
  canReply: boolean;
  canModerate: boolean;
  onReplied?: () => void;
  onDeleted?: () => void;
  onReacted?: (commentId: string, result: PostReactionState) => void;
}) {
  const threads = new Map<string, { parent: PublicComment | ReplyComment | null; replies: (PublicComment | ReplyComment)[] }>();
  for (const comment of comments) {
    const threadId = comment.parentId ?? comment.id;
    const thread = threads.get(threadId) ?? { parent: null, replies: [] };
    if (comment.parentId === null) thread.parent = comment;
    else thread.replies.push(comment);
    threads.set(threadId, thread);
  }
  const shared = { slug, postId, viewerId, onReplied, onDeleted, onReacted };
  const canDelete = (comment: PublicComment | ReplyComment) => canModerate || viewerId === comment.userId;
  return comments.length === 0 ? <p className="mt-4 text-ink/60">No replies yet.</p> : (
    <ol className="mt-4 space-y-4">
      {Array.from(threads, ([threadId, thread]) => (
        <li key={threadId} className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-sticker">
          {thread.parent && <CommentContent comment={thread.parent} {...shared}
            canDelete={canDelete(thread.parent)} canReply={canReply} />}
          {thread.replies.length > 0 && <ol aria-label="Thread replies"
            className={`${thread.parent ? "mt-4" : ""} ml-2 min-w-0 space-y-4 border-l-2 border-ink pl-3 sm:ml-4 sm:pl-4`}>
            {thread.replies.map((reply) => (
              <li key={reply.id} className="min-w-0">
                <CommentContent comment={reply} {...shared}
                  canDelete={canDelete(reply)} canReply={Boolean(thread.parent && canReply)} />
              </li>
            ))}
          </ol>}
        </li>
      ))}
    </ol>
  );
}

export function ReplyComposer({ slug, postId, canReply, viewerId, onReplied, onBecameFan }: {
  slug: string;
  postId: string;
  canReply: boolean;
  viewerId: string | null;
  onReplied?: () => void;
  onBecameFan?: () => void;
}) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [followState, followAction, followPending] = useActionState(async (previous: FollowState, formData: FormData) => {
    const result = await updateFollow(slug, previous, formData);
    if (result.status === "success") {
      setUnlocked(true);
      onBecameFan?.();
      router.refresh();
    }
    return result;
  }, initialFollowState);

  if (canReply || unlocked) {
    return <CommentComposer slug={slug} postId={postId} userId={viewerId} onReplied={onReplied} />;
  }

  if (viewerId === null) {
    return (
      <Link href={`/login?${new URLSearchParams({ next: `/s/${slug}/p/${postId}#replies` })}`}
        className="mt-6 inline-flex min-h-11 items-center rounded-xl border-2 border-ink bg-sun px-4 py-2 font-semibold shadow-sticker">
        Sign in to reply
      </Link>
    );
  }

  return (
    <form action={followAction} className="mt-6" aria-busy={followPending}>
      <SubmitButton name="intent" value="follow" pending={followPending} pendingLabel="Joining…"
        className="inline-flex min-h-11 items-center rounded-xl border-2 border-ink bg-sun px-4 py-2 font-semibold shadow-sticker">
        Become a fan to reply
      </SubmitButton>
      {followState.status === "error" && <p role="alert" className="mt-3 text-sm">{followState.message}</p>}
    </form>
  );
}
