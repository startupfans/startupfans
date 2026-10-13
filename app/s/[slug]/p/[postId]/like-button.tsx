"use client";

import Link from "next/link";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type CSSProperties } from "react";
import { HeartIcon } from "@/app/components/icons";
import { toggleCommentLike } from "./comment-actions";

export type LikeState = { liked: boolean; count: number };
type BurstHeart = {
  color: string;
  style: CSSProperties & { "--heart-x": string; "--heart-y": string; "--heart-rotation": string };
};

const buttonClass = "group relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait";

export function LikeButton({ commentId, count, liked, signedIn, postUrl, onLiked }: {
  commentId: string;
  count: number;
  liked: boolean;
  signedIn: boolean;
  postUrl: string;
  onLiked?: (commentId: string, result: LikeState) => void;
}) {
  const [committed, setCommitted] = useState({ liked, count });
  const [previousProps, setPreviousProps] = useState({ liked, count });
  if (previousProps.liked !== liked || previousProps.count !== count) {
    setPreviousProps({ liked, count });
    setCommitted({ liked, count });
  }
  const [optimistic, setOptimistic] = useOptimistic(committed, (_current: LikeState, next: LikeState) => next);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const errorId = useId();
  const [burst, setBurst] = useState(0);
  const [hearts, setHearts] = useState<BurstHeart[]>([]);

  useEffect(() => {
    if (burst === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = requestAnimationFrame(() => {
      setHearts(Array.from({ length: 6 }, (_, index) => ({
        color: index % 2 === 0 ? "text-pink" : "text-sun",
        style: {
          width: `${10 + Math.random() * 4}px`,
          height: `${10 + Math.random() * 4}px`,
          animationDelay: `${Math.random() * 70}ms`,
          "--heart-x": `${(Math.random() - 0.5) * 52}px`,
          "--heart-y": `${-28 - Math.random() * 24}px`,
          "--heart-rotation": `${(Math.random() - 0.5) * 90}deg`,
        },
      })));
    });
    const timeout = setTimeout(() => setHearts([]), 850);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [burst]);

  function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    const nextLiked = !optimistic.liked;
    setError("");
    if (nextLiked && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setBurst((value) => value + 1);
    else { setBurst(0); setHearts([]); }
    startTransition(async () => {
      setOptimistic({ liked: nextLiked, count: Math.max(0, optimistic.count + (nextLiked ? 1 : -1)) });
      try {
        const result = await toggleCommentLike(commentId, nextLiked);
        setCommitted(result);
        onLiked?.(commentId, result);
      } catch {
        setError("We couldn't update your like. Try again in a little while.");
        setBurst(0);
        setHearts([]);
      } finally {
        inFlight.current = false;
      }
    });
  }

  const content = <>
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white transition-transform group-hover:-translate-y-0.5 group-hover:shadow-sticker motion-reduce:transition-none ${optimistic.liked ? "text-pink" : "text-ink"}`}>
      <HeartIcon filled={optimistic.liked} />
    </span>
    {optimistic.count > 0 && <span>{optimistic.count}<span className="sr-only"> {optimistic.count === 1 ? "like" : "likes"}</span></span>}
  </>;

  return (
    <div className="relative inline-flex flex-wrap items-center">
      {signedIn ? <button type="button" onClick={toggle} disabled={pending} className={buttonClass}
        aria-pressed={optimistic.liked} aria-label={optimistic.liked ? "Unlike reply" : "Like reply"}
        aria-describedby={error ? errorId : undefined}>
        {content}
      </button> : <Link href={`/login?${new URLSearchParams({ next: postUrl })}`} className={buttonClass} aria-label="Like reply">
        {content}
      </Link>}
      {hearts.map((heart, index) => <span key={`${burst}-${index}`} aria-hidden="true"
        className={`comment-like-heart pointer-events-none absolute left-[22px] top-1/2 [&>svg]:h-full [&>svg]:w-full ${heart.color}`}
        style={heart.style}><HeartIcon filled /></span>)}
      {error && <p id={errorId} role="alert" className="w-full text-sm">{error}</p>}
    </div>
  );
}
