"use client";

import { useState } from "react";

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
    <div className="max-w-48">
      <button
        type="button"
        onClick={copyLink}
        className="rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
      >
        Copy
      </button>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </div>
  );
}
