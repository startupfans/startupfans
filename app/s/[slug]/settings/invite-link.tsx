"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "./actions";

const buttonClass = "rounded-xl border-[3px] border-ink bg-lime px-4 py-2 font-bold shadow-sticker disabled:opacity-50";

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
    <div className="mt-5 space-y-4">
      <button type="button" onClick={createLink} disabled={pending} className={buttonClass}>
        {pending ? "Creating link…" : "Invite a teammate"}
      </button>
      {error && <p role="alert" className="text-sm">{error}</p>}
      {url && (
        <div className="space-y-3">
          <label className="block font-bold" htmlFor="invite-link">Your invite link
            <input id="invite-link" readOnly value={url} onFocus={(event) => event.currentTarget.select()}
              className="mt-2 w-full rounded-xl border-2 border-ink bg-white px-4 py-3 font-mono text-sm" />
          </label>
          <button type="button" className={buttonClass} onClick={() => copyLink(url)}>Copy link</button>
          <p role="status" className="text-sm">{copyMessage}</p>
          <p className="text-sm text-ink/70">Save this link now. It can be used once and expires in 7 days.</p>
        </div>
      )}
    </div>
  );
}
