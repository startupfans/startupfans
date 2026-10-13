"use client";

import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { getFileMediaFormat, getMediaAccept, mediaLimits } from "@/lib/media";
import { isValidSlug } from "@/lib/slug";

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

function previewUrl(value: string) {
  try { return new URL(value).protocol === "https:" ? value : null; }
  catch { return null; }
}

export function ImageUpload({ name, label, slug, initialUrl = "", creatorId }: {
  name: "logoUrl" | "coverUrl";
  label: string;
  slug?: string;
  initialUrl?: string;
  creatorId: string;
}) {
  const { pending } = useFormStatus();
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const uploadedSlug = useRef<string | null>(null);

  function currentSlug() {
    if (slug) return slug;
    const input = fileInput.current?.form?.elements.namedItem("slug");
    return input instanceof HTMLInputElement ? input.value.trim() : "";
  }

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const form = fileInput.current?.form;
    function blockIncompleteUpload(event: SubmitEvent) {
      if (!controller.current) return;
      event.preventDefault();
      event.stopPropagation();
      setError("Wait for the image upload to finish or remove it before saving.");
    }
    function addressChanged(event: Event) {
      if (slug || !(event.target instanceof HTMLInputElement)
        || !["name", "slug"].includes(event.target.name)) return;
      queueMicrotask(() => {
        const input = form?.elements.namedItem("slug");
        if (input instanceof HTMLInputElement && uploadedSlug.current && input.value.trim() !== uploadedSlug.current) {
          controller.current?.abort();
          controller.current = null;
          uploadedSlug.current = null;
          setUploading(false);
          setConverting(false);
          setUrl("");
          setPreview(null);
          setError("Your page address changed. Upload the logo again for this address.");
        }
      });
    }
    form?.addEventListener("submit", blockIncompleteUpload, true);
    form?.addEventListener("input", addressChanged);
    return () => {
      form?.removeEventListener("submit", blockIncompleteUpload, true);
      form?.removeEventListener("input", addressChanged);
    };
  }, [slug]);

  function removeImage() {
    controller.current?.abort();
    controller.current = null;
    uploadedSlug.current = null;
    setUrl("");
    setPreview(null);
    setUploading(false);
    setConverting(false);
    setProgress(0);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function uploadImage(file: File) {
    if (pending) return;
    if (fileInput.current) fileInput.current.value = "";
    const targetSlug = currentSlug();
    const format = getFileMediaFormat(file);
    if (!targetSlug || (!slug && !isValidSlug(targetSlug))) {
      setError("Choose a valid page address before uploading a logo.");
      return;
    }
    if (!format || format.type !== "image") {
      setError("Choose a JPEG, PNG, WebP, GIF, AVIF, HEIC or HEIF image.");
      return;
    }
    if (file.size > mediaLimits.image) {
      setError("Images must be 10 MB or smaller.");
      return;
    }
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    uploadedSlug.current = targetSlug;
    setUploading(true);
    setProgress(0);
    setError("");
    setPreview(null);
    const needsConversion = ["image/heic", "image/heif"].includes(format.contentType);
    setConverting(needsConversion);
    try {
      let image = file;
      let contentType = format.contentType;
      let extension = format.extensions[0];
      if (needsConversion) {
        const { default: heic2any } = await import("heic2any");
        if (active.signal.aborted) return;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        if (active.signal.aborted) return;
        const jpeg = Array.isArray(converted) ? converted[0] : converted;
        if (!jpeg) throw new Error("Couldn't convert this photo. Try a JPEG image.");
        image = new File([jpeg], "profile.jpg", { type: "image/jpeg" });
        contentType = "image/jpeg";
        extension = "jpg";
      }
      if (active.signal.aborted) return;
      if (image.size > mediaLimits.image) throw new Error("The converted photo must be 10 MB or smaller.");
      setConverting(false);
      setPreview(URL.createObjectURL(image));
      const availability = await fetch("/api/upload", { cache: "no-store", signal: active.signal });
      if (!availability.ok) throw new Error("Image uploads are unavailable right now. You can paste an image URL instead.");
      const blob = await upload(`startups/${targetSlug}/profile/${creatorId}-${crypto.randomUUID()}.${extension}`, image, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ slug: targetSlug }),
        contentType,
        abortSignal: active.signal,
        onUploadProgress: ({ percentage }) => {
          if (!active.signal.aborted) setProgress(Math.round(percentage));
        },
      });
      if (!active.signal.aborted) {
        setUrl(blob.url);
        setPreview(null);
        setError("");
      }
    } catch (cause) {
      if (!active.signal.aborted) {
        setPreview(null);
        setError(cause instanceof Error ? cause.message : "Couldn't upload this image. Try a JPEG image.");
      }
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setUploading(false);
        setConverting(false);
        if (fileInput.current) fileInput.current.value = "";
      }
    }
  }

  const visibleUrl = preview ?? previewUrl(url);
  return (
    <div className="min-w-0" aria-busy={uploading}>
      <p className="font-bold">{label}</p>
      {visibleUrl && <div className={`relative mt-3 overflow-hidden rounded-xl border-2 border-ink bg-white ${name === "coverUrl" ? "aspect-[3/1] w-full" : "h-28 w-28"}`}>
        <Image src={visibleUrl} alt={`${label} preview`} fill unoptimized sizes={name === "coverUrl" ? "600px" : "112px"}
          className={name === "coverUrl" ? "object-cover" : "object-contain p-2"} />
      </div>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={pending || uploading} className={buttonClass} onClick={() => fileInput.current?.click()}>Upload {label.toLowerCase()}</button>
        {(url || preview || uploading) && <button type="button" disabled={pending} className={buttonClass} onClick={removeImage}>Remove {label.toLowerCase()}</button>}
      </div>
      <input ref={fileInput} type="file" accept={getMediaAccept("image")} hidden disabled={pending}
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
      <p className="mt-2 text-xs text-ink/70">Images up to 10 MB{ name === "coverUrl" ? ". A 3:1 image fits best." : ". A square image fits best." }</p>
      {uploading && <div className="mt-2">
        <p role="status" className="text-sm">{converting ? "Converting photo" : `Uploading ${progress}%`}</p>
        <progress aria-label={`${label} upload progress`} max={100} value={progress} className="mt-1 h-2 w-full accent-ink" />
      </div>}
      <label htmlFor={name} className="mt-3 block text-sm font-semibold">Or paste a URL
        <input id={name} name={name} type="url" pattern="https://.*" maxLength={500} placeholder="https://" value={url} readOnly={uploading} disabled={pending}
          className={inputClass} onChange={(event) => { setUrl(event.target.value); uploadedSlug.current = null; setError(""); }} />
      </label>
      {error && <p role="alert" className="mt-2 break-words text-sm">{error}</p>}
    </div>
  );
}

export function BioField({ initialBio = "" }: { initialBio?: string }) {
  const [bio, setBio] = useState(initialBio);
  const { pending } = useFormStatus();
  return (
    <div>
      <label htmlFor="bio" className="block font-bold">Bio <span className="font-normal">(optional)</span>
        <textarea id="bio" name="bio" value={bio} onChange={(event) => setBio(event.target.value)} disabled={pending}
          maxLength={280} rows={3} aria-describedby="bio-count" className={`${inputClass} resize-y`} />
      </label>
      <p id="bio-count" className="mt-1 text-right text-xs tabular-nums text-ink/70">{bio.length}/280</p>
    </div>
  );
}
