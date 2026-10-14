"use client";

import Link from "next/link";
import { memo, useCallback, useId, useRef, useState, type ReactNode } from "react";
import { ReplyIcon, postIconButtonClass } from "@/app/components/icons";
import type { RepliesPreview, ReplyComment } from "@/lib/comments";
import { CommentList, ReplyComposer } from "./p/[postId]/comments";
import type { PostReactionState } from "@/lib/reactions";

const PreviewCommentList = memo(CommentList);

function isReactionCounts(value: unknown): value is PostReactionState["counts"] {
  return typeof value === "object" && value !== null
    && "heart" in value && typeof value.heart === "number" && Number.isInteger(value.heart) && value.heart >= 0
    && "tomato" in value && typeof value.tomato === "number" && Number.isInteger(value.tomato) && value.tomato >= 0;
}

function isComment(value: unknown): value is ReplyComment {
  return typeof value === "object" && value !== null
    && "id" in value && typeof value.id === "string"
    && "parentId" in value && (value.parentId === null || typeof value.parentId === "string")
    && "userId" in value && typeof value.userId === "string"
    && "body" in value && typeof value.body === "string"
    && "createdAt" in value && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    && "avatarUrl" in value && (value.avatarUrl === null || typeof value.avatarUrl === "string")
    && "displayName" in value && typeof value.displayName === "string"
    && "imageUrl" in value && (value.imageUrl === null || typeof value.imageUrl === "string")
    && "viewerReaction" in value && (value.viewerReaction === null || value.viewerReaction === "heart" || value.viewerReaction === "tomato")
    && "reactionCounts" in value && isReactionCounts(value.reactionCounts)
    && "mentions" in value && Array.isArray(value.mentions) && value.mentions.every((segment: unknown) =>
      typeof segment === "object" && segment !== null && "text" in segment && typeof segment.text === "string"
      && "handle" in segment && (segment.handle === null || typeof segment.handle === "string"));
}

function isPreview(value: unknown): value is RepliesPreview {
  return typeof value === "object" && value !== null
    && "comments" in value && Array.isArray(value.comments) && value.comments.every(isComment)
    && "total" in value && typeof value.total === "number" && Number.isInteger(value.total) && value.total >= 0
    && "hasMore" in value && typeof value.hasMore === "boolean"
    && "viewerId" in value && (value.viewerId === null || typeof value.viewerId === "string")
    && "canReply" in value && typeof value.canReply === "boolean"
    && "canModerate" in value && typeof value.canModerate === "boolean";
}

export function RepliesPanel({ slug, postId, snapshot, onPostPage, children }: {
  slug: string;
  postId: string;
  snapshot: { replyCount: number; preview: RepliesPreview | null };
  onPostPage: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(snapshot.preview);
  const [source, setSource] = useState(snapshot);
  const [count, setCount] = useState(snapshot.replyCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const panelId = useId();
  const headingId = `${panelId}-heading`;
  const postUrl = `/s/${slug}/p/${postId}`;

  if (source !== snapshot) {
    setSource(snapshot);
    setPreview(snapshot.preview);
    setCount(snapshot.replyCount);
  }

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}/replies?limit=10`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Replies unavailable");
      const data: unknown = await response.json();
      if (!isPreview(data)) throw new Error("Invalid replies");
      if (id === requestId.current && !signal?.aborted) {
        setError("");
        const nestedCounts = new Map<string, number>();
        const comments = data.comments.filter((comment) => {
          if (comment.parentId === null) return true;
          const shown = nestedCounts.get(comment.parentId) ?? 0;
          nestedCounts.set(comment.parentId, shown + 1);
          return shown < 10;
        });
        setPreview({ ...data, comments, hasMore: data.total > comments.length });
        setCount(data.total);
      }
    } catch {
      if (id === requestId.current && !signal?.aborted) setError("We couldn't load replies. Try again.");
    } finally {
      if (id === requestId.current && !signal?.aborted) setLoading(false);
    }
  }, [postId]);

  const replied = useCallback(() => {
    setCount((current) => current + 1);
    void refresh();
  }, [refresh]);

  const deleted = useCallback(() => {
    setCount((current) => Math.max(0, current - 1));
    void refresh();
  }, [refresh]);

  const reacted = useCallback((commentId: string, result: PostReactionState) => {
    setPreview((current) => current && {
      ...current,
      comments: current.comments.map((comment) => comment.id === commentId
        ? { ...comment, viewerReaction: result.kind, reactionCounts: result.counts }
        : comment),
    });
  }, []);

  const shownCount = onPostPage || !open ? snapshot.replyCount : count;
  const label = shownCount ? `${shownCount} ${shownCount === 1 ? "reply" : "replies"}` : "Reply";
  const buttonClass = `${postIconButtonClass} ${shownCount ? "w-auto gap-1.5 px-3" : ""}`;
  const bubble = <><ReplyIcon />{shownCount > 0 && <span className="text-sm font-semibold tabular-nums">{shownCount}</span>}</>;

  return <>
    <footer className="relative mt-3 flex items-start justify-between gap-2">
      {onPostPage ? <Link href={`${postUrl}#replies`} title={label} aria-label={label} className={buttonClass}>{bubble}</Link> : (
        <button type="button" title={label} aria-label={label} aria-expanded={open} aria-controls={panelId}
          className={buttonClass} onClick={() => {
            if (open) { requestId.current++; setLoading(false); }
            setError("");
            setOpen((current) => !current);
          }}>{bubble}</button>
      )}
      <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-2">{children}</div>
    </footer>
    {!onPostPage && <section id={panelId} hidden={!open} aria-labelledby={headingId} aria-busy={open && loading}
      className="mt-5 min-w-0 border-t-2 border-ink/20 pt-4">
      {open && <>
        <h2 id={headingId} className="font-display text-xl font-extrabold">Replies <span className="text-ink/60">({count})</span></h2>
        {error && <div role="alert" className="mt-4 text-sm">
          <p>{error}</p>
          <button type="button" onClick={() => { setError(""); void refresh(); }} className="min-h-11 py-2 font-semibold underline">Try again</button>
        </div>}
        {preview && <>
          <PreviewCommentList comments={preview.comments} slug={slug} postId={postId} viewerId={preview.viewerId}
            canReply={preview.canReply} canModerate={preview.canModerate} onReplied={replied} onDeleted={deleted} onReacted={reacted} />
          {count > preview.comments.length && <Link href={`${postUrl}#replies`} className="mt-4 inline-flex min-h-11 items-center py-2 font-semibold underline underline-offset-4">
            View all {count} replies
          </Link>}
          <ReplyComposer slug={slug} postId={postId} canReply={preview.canReply} viewerId={preview.viewerId}
            onReplied={replied} onBecameFan={() => { void refresh(); }} />
        </>}
      </>}
    </section>}
  </>;
}
