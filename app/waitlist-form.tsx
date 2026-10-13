"use client";

import { useId, useState } from "react";
import posthog from "posthog-js";

function captureWaitlistEvent(
  event: "waitlist_joined" | "waitlist_referral_link_copied" | "waitlist_x_share_clicked",
) {
  if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
    posthog.capture(event);
  }
}

const WAITLIST_ID = 33121;
const SIGNUP_ENDPOINT = "https://api.getwaitlist.com/api/v1/signup";
const SHARE_TEXT =
  "just applied to startupfans, a curated community of early startups. free to join, launching today. apply with my link:";

interface Signup {
  priority: number;
  referral_link: string;
}

interface WaitlistFormProps {
  ctaLabel?: string;
}

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "success"; signup: Signup };

function isSignup(value: unknown): value is Signup {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.priority === "number" && typeof candidate.referral_link === "string";
}

async function createSignup(email: string): Promise<Signup> {
  const response = await fetch(SIGNUP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // referral_link carries the ?ref_id= token (if any) so the referrer gets credit.
    body: JSON.stringify({ email, waitlist_id: WAITLIST_ID, referral_link: window.location.href }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isSignup(data)) {
    throw new Error("Signup request failed");
  }
  return data;
}

function buildXShareUrl(referralLink: string): string {
  const params = new URLSearchParams({
    text: SHARE_TEXT,
    url: referralLink,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function WaitlistForm({ ctaLabel = "Get your startup selected →" }: WaitlistFormProps) {
  const [state, setState] = useState<FormState>({ status: "idle" });
  const emailInputId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    if (typeof email !== "string" || email.trim() === "") return;

    setState({ status: "submitting" });
    try {
      const signup = await createSignup(email.trim());
      captureWaitlistEvent("waitlist_joined");
      setState({ status: "success", signup });
    } catch {
      setState({ status: "error", message: "That didn't go through. Check the email and try again." });
    }
  }

  if (state.status === "success") {
    return <SuccessCard signup={state.signup} />;
  }

  const isSubmitting = state.status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="relative mt-10 max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={emailInputId} className="sr-only">
          Email address
        </label>
        <input
          id={emailInputId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@startup.com"
          disabled={isSubmitting}
          className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-white px-5 py-4 text-lg font-semibold shadow-sticker outline-none placeholder:text-ink/40 focus-visible:bg-cream disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl border-[3px] border-ink bg-sun px-7 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:translate-y-0 disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : ctaLabel}
        </button>
      </div>
      <p role="alert" className="mt-3 min-h-6 font-bold">
        {state.status === "error" ? state.message : null}
      </p>
    </form>
  );
}

function SuccessCard({ signup }: { signup: Signup }) {
  const [isCopied, setIsCopied] = useState(false);
  const xShareUrl = buildXShareUrl(signup.referral_link);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(signup.referral_link);
      captureWaitlistEvent("waitlist_referral_link_copied");
      setIsCopied(true);
    } catch {
      // Clipboard can be blocked; the link stays visible to copy by hand.
    }
  }

  return (
    <div
      role="status"
      className="relative mt-10 max-w-xl rounded-2xl border-[3px] border-ink bg-white p-6 shadow-sticker sm:p-8"
    >
      <p className="font-mono text-xs font-bold tracking-widest uppercase">You&apos;re on the list</p>
      <p className="mt-2 font-display text-5xl leading-none font-extrabold tabular-nums">
        #{signup.priority.toLocaleString("en-GB")} in line
      </p>
      <p className="mt-4 text-lg font-semibold text-ink/80">
        Want to move up? Share your link. Every signup through it bumps your spot.
      </p>

      <a
        href={xShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => captureWaitlistEvent("waitlist_x_share_clicked")}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-ink px-5 py-4 font-display text-lg font-extrabold text-cream shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <XLogo className="size-5" />
        Share on X
      </a>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-xl border-2 border-ink bg-cream px-3 py-2 font-mono text-sm">
          {signup.referral_link}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border-2 border-ink bg-sun px-4 py-2 font-bold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {isCopied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

function XLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.259 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
