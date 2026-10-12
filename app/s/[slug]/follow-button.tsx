"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, type ReactNode } from "react";
import { createStartupAction, type CreateStartupState } from "@/app/start/actions";
import { slugify } from "@/lib/slug";
import { updateFollow, type FollowState } from "./actions";

const buttonClass = "inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl border-[3px] border-ink bg-pink px-5 py-3 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-60 sm:w-auto";
const initialFollowState: FollowState = { status: "idle" };
const initialCreateState: CreateStartupState = { status: "idle" };

export function FollowButton({ slug, signedIn, memberNo }: {
  slug: string;
  signedIn: boolean;
  memberNo: number | null;
}) {
  const [state, action, pending] = useActionState(updateFollow.bind(null, slug), initialFollowState);

  if (!signedIn) {
    return <Link href={`/login?next=/s/${slug}`} className={buttonClass}>Become a fan</Link>;
  }

  return (
    <form action={action} className="flex w-full min-w-0 flex-wrap items-center gap-4" aria-busy={pending}>
      {memberNo !== null && (
        <span className="min-h-11 w-full rounded-xl border-[3px] border-ink bg-lime px-4 py-3 text-center font-mono font-bold shadow-sticker sm:w-auto">
          Fan #{String(memberNo).padStart(4, "0")}
        </span>
      )}
      <button type="submit" name="intent" value={memberNo === null ? "follow" : "unfollow"}
        disabled={pending} className={memberNo === null ? buttonClass : "min-h-11 w-full rounded-xl border-2 border-ink bg-white px-4 py-3 font-bold disabled:cursor-wait disabled:opacity-60 sm:w-auto"}>
        {pending ? "Updating…" : memberNo === null ? "Become a fan" : "Unfollow"}
      </button>
      {state.status === "error" && <p role="alert" className="w-full text-sm font-semibold">{state.message}</p>}
    </form>
  );
}

export function StartupForm({ children }: { children: ReactNode }) {
  const [state, action, pending] = useActionState(createStartupAction, initialCreateState);
  const customSlug = useRef(false);

  return (
    <form action={action} className="mt-8 space-y-5" aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      onChange={(event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (input.name === "slug") customSlug.current = input.value.length > 0;
        if (input.name === "name" && !customSlug.current) {
          const slugInput = event.currentTarget.elements.namedItem("slug");
          if (slugInput instanceof HTMLInputElement) slugInput.value = slugify(input.value);
        }
      }}>
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        {children}
      </fieldset>
      {state.status === "error" && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-sun p-4 font-semibold">{state.message}</p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass} sm:w-full`}>
        {pending ? "Creating…" : "Create your page"}
      </button>
    </form>
  );
}
