"use client";

import { SubmitButton } from "@/app/components/submit-button";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";

type PostHogIdentifyProps = {
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

type SignOutButtonProps = {
  action: () => Promise<void>;
};

export function PostHogIdentify({ user }: PostHogIdentifyProps) {
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      identifiedUserId.current = null;
      return;
    }
    if (identifiedUserId.current === user.id) return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) return;

    posthog.identify(user.id, {
      email: user.email,
      name: user.name ?? undefined,
    });
    identifiedUserId.current = user.id;
  }, [user]);

  return null;
}

export function SignOutButton({ action }: SignOutButtonProps) {
  return (
    <form
      action={action}
      className="mt-10"
      onSubmit={() => {
        if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
          posthog.reset();
        }
      }}
    >
      <SubmitButton
        pendingLabel="Signing out…"
        className="min-h-11 px-1 py-2 text-sm font-bold text-ink/70 underline underline-offset-4 transition hover:text-ink"
      >
        Sign out
      </SubmitButton>
    </form>
  );
}

export function CopyMagicLinkButton({ link }: { link: string }) {
  const [message, setMessage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Copied!");
    } catch {
      setMessage("Couldn't copy. Select the link above and copy it manually.");
    }
  }

  return (
    <div className="w-full min-w-0 sm:max-w-48">
      <button
        type="button"
        onClick={copyLink}
        className="min-h-11 w-full rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
      >
        Copy
      </button>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </div>
  );
}
