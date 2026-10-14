"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImageDrop } from "@/app/components/image-drop";
import { isValidSlug } from "@/lib/slug";

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

export function ImageUpload({ name, label, slug, initialUrl = "", creatorId }: {
  name: "logoUrl" | "coverUrl";
  label: string;
  slug?: string;
  initialUrl?: string;
  creatorId: string;
}) {
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/upload", { cache: "no-store", signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setUploadsEnabled(response.status !== 503); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <ImageDrop name={name} label={label} shape={name === "coverUrl" ? "wide" : "square"}
      initialUrl={initialUrl} uploadsEnabled={uploadsEnabled} maxUrlLength={500}
      hint={`Images up to 10 MB. ${name === "coverUrl" ? "A 3:1 image fits best." : "A square image fits best."}`}
      uploadScope={{ field: "slug", value: slug }}
      buildUploadPath={(extension, form) => {
        const input = form?.elements.namedItem("slug");
        const targetSlug = slug ?? (input instanceof HTMLInputElement ? input.value.trim() : "");
        if (!targetSlug || (!slug && !isValidSlug(targetSlug))) {
          throw new Error("Choose a valid page address before uploading a logo.");
        }
        return {
          pathname: `startups/${targetSlug}/profile/${creatorId}-${crypto.randomUUID()}.${extension}`,
          clientPayload: JSON.stringify({ slug: targetSlug }),
        };
      }} />
  );
}

export function BioField({ initialBio = "", error }: { initialBio?: string; error?: string }) {
  const [bio, setBio] = useState(initialBio);
  const { pending } = useFormStatus();
  const describedBy = error ? "bio-error bio-count" : "bio-count";
  return (
    <div>
      <label htmlFor="bio" className="block font-bold">Bio <span className="font-normal">(optional)</span>
        <textarea id="bio" name="bio" value={bio} onChange={(event) => setBio(event.target.value)} disabled={pending}
          maxLength={280} rows={3} aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          className={`${inputClass} resize-y`} />
      </label>
      {error && <p id="bio-error" role="alert" className="mt-1 text-sm font-semibold">{error}</p>}
      <p id="bio-count" className="mt-1 text-right text-xs tabular-nums text-ink/70">{bio.length}/280</p>
    </div>
  );
}
