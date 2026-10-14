"use client";

import { useState, type ReactNode } from "react";
import { ImageDrop } from "@/app/components/image-drop";
import { SubmitButton } from "@/app/components/submit-button";

export function AvatarUpload({ userId, initialUrl, initial, uploadsEnabled, children }: {
  userId: string;
  initialUrl: string;
  initial: string;
  uploadsEnabled: boolean;
  children?: ReactNode;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <ImageDrop name="avatarUrl" label="Avatar" shape="round" initialUrl={initialUrl} initial={initial}
        uploadsEnabled={uploadsEnabled} hint="Images up to 10 MB. A square image fits best."
        buildUploadPath={(extension) => ({ pathname: `users/${userId}/avatar/${crypto.randomUUID()}.${extension}` })}
        onUploadingChange={setUploading} />
      {children}
      <SubmitButton pendingLabel="Saving…" disabled={uploading}
        className="min-h-11 w-full rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-bold shadow-sticker disabled:opacity-50 sm:w-auto">
        Save profile
      </SubmitButton>
    </>
  );
}
