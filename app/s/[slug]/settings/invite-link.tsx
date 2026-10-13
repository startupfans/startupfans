"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/app/components/submit-button";
import { createInviteAction, sendInviteAction } from "./actions";

const buttonClass = "inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl border-[3px] border-ink bg-lime px-4 py-2 font-bold shadow-sticker disabled:opacity-50 sm:w-auto";

export function InviteByEmail({ slug }: { slug: string }) {
  return (
    <form action={sendInviteAction.bind(null, slug)} className="min-w-0 space-y-4">
      <h3 className="font-display text-xl font-extrabold">Invite by email</h3>
      <label htmlFor="invite-email" className="block font-bold">Email address
        <input id="invite-email" name="email" type="email" autoComplete="email" required maxLength={254}
          placeholder="teammate@example.com"
          className="mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink" />
      </label>
      <SubmitButton pendingLabel="Sending invite…" className={`${buttonClass} bg-pink`}>Send invite</SubmitButton>
      <p className="text-sm text-ink/70">They can join your team with a single-use link that expires in 7 days.</p>
    </form>
  );
}

export function InviteLink({ slug }: { slug: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  function createLink() {
    setError("");
    setCopyMessage("");
    startTransition(async () => {
      try {
        setUrl(await createInviteAction(slug));
      } catch {
        setError("We couldn't create an invite. Refresh the page and try again.");
      }
    });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Copied.");
    } catch {
      setCopyMessage("Select the link and copy it manually.");
    }
  }

  return (
    <div className="mt-5 min-w-0 space-y-4" aria-busy={pending}>
      <SubmitButton type="button" onClick={createLink} pending={pending} pendingLabel="Creating link…" className={buttonClass}>
        Create invite link
      </SubmitButton>
      <p className="text-sm text-ink/70">Anyone with this link can join your team until it expires in 7 days. Don&apos;t post it publicly.</p>
      {error && <p role="alert" className="text-sm">{error}</p>}
      {url && (
        <div className="space-y-3">
          <label className="block font-bold" htmlFor="invite-link">Your invite link
            <input id="invite-link" readOnly value={url} onFocus={(event) => event.currentTarget.select()}
              className="mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 font-mono text-sm" />
          </label>
          <button type="button" className={buttonClass} onClick={() => copyLink(url)}>Copy link</button>
          <p role="status" className="text-sm">{copyMessage}</p>
          <p className="text-sm text-ink/70">Save this link now so you can share it with your team.</p>
        </div>
      )}
    </div>
  );
}
