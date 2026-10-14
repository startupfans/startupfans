"use client";

import { useState } from "react";
import { ProfileImage } from "@/app/components/profile-image";

export function NotificationAvatar({ src, name }: { src: string | null; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) return <ProfileImage src={src} alt="" width={44} height={44} sizes="44px"
    referrerPolicy="no-referrer" onError={() => setFailedSrc(src)}
    className="h-11 w-11 rounded-full border-2 border-ink object-cover" />;
  return <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-sky font-display text-lg font-extrabold">{name.charAt(0).toUpperCase()}</span>;
}
