"use client";

import type { ReactNode } from "react";
import { ImageDrop } from "@/app/components/image-drop";

export function AvatarUpload({
  userId, initialUrl, initial, uploadsEnabled, onUrlChange, status,
}: {
  userId: string;
  initialUrl: string;
  initial: string;
  uploadsEnabled: boolean;
  onUrlChange?: (url: string) => void;
  status?: ReactNode;
}) {
  return (
    <ImageDrop name="avatarUrl" label="Avatar" shape="round" initialUrl={initialUrl} initial={initial}
      uploadsEnabled={uploadsEnabled} hint="Images up to 10 MB. A square image fits best."
      buildUploadPath={(extension) => ({ pathname: `users/${userId}/avatar/${crypto.randomUUID()}.${extension}` })}
      onUrlChange={onUrlChange} status={status} />
  );
}
