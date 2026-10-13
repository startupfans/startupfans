"use client";

import Link from "next/link";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type CSSProperties } from "react";
import { postIconButtonBaseClass } from "@/app/components/icons";
import type { PostReactionKind, PostReactionState } from "@/lib/reactions";
import { setPostReaction } from "./reaction-actions";

const reactions = {
  like: { glyph: "👍", label: "Like post", fill: "bg-sun" },
  heart: { glyph: "❤️", label: "Heart post", fill: "bg-pink" },
  tomato: { glyph: "🍅", label: "Tomato post", fill: "bg-tangerine" },
} satisfies Record<PostReactionKind, { glyph: string; label: string; fill: string }>;
const kinds: PostReactionKind[] = ["like", "heart", "tomato"];
type BurstGlyph = { style: CSSProperties & { "--heart-x": string; "--heart-y": string; "--heart-rotation": string } };

function sameState(left: PostReactionState, right: PostReactionState) {
  return left.kind === right.kind && kinds.every((kind) => left.counts[kind] === right.counts[kind]);
}

export function ReactionBar({ postId, postUrl, signedIn, snapshot }: {
  postId: string;
  postUrl: string;
  signedIn: boolean;
  snapshot: PostReactionState;
}) {
  const [committed, setCommitted] = useState(snapshot);
  const [previousSnapshot, setPreviousSnapshot] = useState(snapshot);
  if (!sameState(previousSnapshot, snapshot)) {
    setPreviousSnapshot(snapshot);
    setCommitted(snapshot);
  }
  const [optimistic, setOptimistic] = useOptimistic(committed, (_current: PostReactionState, next: PostReactionState) => next);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const errorId = useId();
  const [burst, setBurst] = useState<{ id: number; kind: PostReactionKind } | null>(null);
  const [glyphs, setGlyphs] = useState<BurstGlyph[]>([]);

  useEffect(() => {
    if (!burst || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = requestAnimationFrame(() => {
      setGlyphs(Array.from({ length: 6 }, () => ({ style: {
        fontSize: `${10 + Math.random() * 4}px`,
        animationDelay: `${Math.random() * 70}ms`,
        "--heart-x": `${(Math.random() - 0.5) * 52}px`,
        "--heart-y": `${-28 - Math.random() * 24}px`,
        "--heart-rotation": `${(Math.random() - 0.5) * 90}deg`,
      } })));
    });
    const timeout = setTimeout(() => setGlyphs([]), 850);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [burst]);

  function react(kind: PostReactionKind) {
    if (inFlight.current) return;
    inFlight.current = true;
    const nextKind = optimistic.kind === kind ? null : kind;
    const counts = { ...optimistic.counts };
    if (optimistic.kind) counts[optimistic.kind] = Math.max(0, counts[optimistic.kind] - 1);
    if (nextKind) counts[nextKind] += 1;
    setError("");
    if (nextKind && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBurst((current) => ({ id: (current?.id ?? 0) + 1, kind: nextKind }));
    } else { setBurst(null); setGlyphs([]); }
    startTransition(async () => {
      setOptimistic({ kind: nextKind, counts });
      try {
        setCommitted(await setPostReaction(postId, nextKind));
      } catch {
        setError("We couldn't update your reaction. Try again in a little while.");
        setBurst(null);
        setGlyphs([]);
      } finally {
        inFlight.current = false;
      }
    });
  }

  return <div className="mr-auto min-w-0" role="group" aria-label="Post reactions" aria-busy={pending}>
    <div className="flex items-center gap-1">
      {kinds.map((kind) => {
        const reaction = reactions[kind];
        const active = optimistic.kind === kind;
        const count = optimistic.counts[kind];
        const label = active ? `Remove ${kind} reaction` : reaction.label;
        const className = `${postIconButtonBaseClass} relative text-ink motion-reduce:transition-none ${active ? reaction.fill : "bg-white"}`;
        const content = <>
          <span aria-hidden="true" className="text-[18px] leading-none">{reaction.glyph}</span>
          {count > 0 && <span className="absolute -top-1 -right-1 rounded-full border border-ink bg-cream px-1 text-[10px] leading-3 font-semibold">
            {count}<span className="sr-only"> {kind} reactions</span>
          </span>}
        </>;
        return <div key={kind} className="relative">
          {signedIn ? <button type="button" onClick={() => react(kind)} disabled={pending} className={className}
            aria-pressed={active} aria-label={`${label}, ${count} reactions`} title={label} aria-describedby={error ? errorId : undefined}>
            {content}
          </button> : <Link href={`/login?${new URLSearchParams({ next: postUrl })}`} className={className}
            aria-label={`${reaction.label}, ${count} reactions`} title={reaction.label}>{content}</Link>}
          {burst?.kind === kind && glyphs.map((glyph, index) => <span key={`${burst.id}-${index}`} aria-hidden="true"
            className="comment-like-heart pointer-events-none absolute top-1/2 left-1/2 leading-none" style={glyph.style}>
            {reaction.glyph}
          </span>)}
        </div>;
      })}
    </div>
    {error && <p id={errorId} role="alert" className="mt-2 text-sm">{error}</p>}
  </div>;
}
