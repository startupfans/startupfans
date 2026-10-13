"use client";

import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { getFileMediaFormat, getMediaAccept, mediaLimits } from "@/lib/media";

const buttonClass = "min-h-11 rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

function previewUrl(value: string) {
  try { return new URL(value).protocol === "https:" ? value : null; }
  catch { return null; }
}

export function AvatarUpload({ userId, initialUrl, initial, uploadsEnabled }: {
  userId: string;
  initialUrl: string;
  initial: string;
  uploadsEnabled: boolean;
}) {
  const { pending } = useFormStatus();
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const fallback = useRef<HTMLDetailsElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const form = fileInput.current?.form;
    function blockIncompleteUpload(event: SubmitEvent) {
      if (!controller.current) return;
      event.preventDefault();
      event.stopPropagation();
      setError("Wait for the upload to finish or remove the avatar before saving.");
    }
    form?.addEventListener("submit", blockIncompleteUpload, true);
    return () => form?.removeEventListener("submit", blockIncompleteUpload, true);
  }, []);

  function changeUrl(value: string) {
    controller.current?.abort();
    controller.current = null;
    setUrl(value);
    setPreview(null);
    setUploading(false);
    setConverting(false);
    setProgress(0);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function uploadImage(file: File) {
    if (pending || !uploadsEnabled) return;
    if (fileInput.current) fileInput.current.value = "";
    const format = getFileMediaFormat(file);
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
        image = new File([jpeg], "avatar.jpg", { type: "image/jpeg" });
        contentType = "image/jpeg";
        extension = "jpg";
      }
      if (active.signal.aborted) return;
      if (image.size > mediaLimits.image) throw new Error("The converted photo must be 10 MB or smaller.");
      setConverting(false);
      setPreview(URL.createObjectURL(image));
      const blob = await upload(`users/${userId}/avatar/${crypto.randomUUID()}.${extension}`, image, {
        access: "public",
        handleUploadUrl: "/api/upload",
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
        setError(cause instanceof Error ? cause.message : "Couldn't upload this image. Try again or paste an image address.");
        if (fallback.current) fallback.current.open = true;
      }
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setUploading(false);
        setConverting(false);
      }
    }
  }

  const visibleUrl = preview ?? previewUrl(url);
  return (
    <>
      <div className="min-w-0" aria-busy={uploading}>
        <p id="avatar-heading" className="font-bold">Avatar <span className="font-normal">(optional)</span></p>
        <input type="hidden" name="avatarUrl" value={url} />
        <div role="group" aria-labelledby="avatar-heading" tabIndex={0}
          className={`mt-2 min-w-0 rounded-xl border-[3px] border-dashed border-ink p-4 shadow-sticker transition hover:bg-lime/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${dragging ? "bg-lime/50" : "bg-cream"}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!pending && uploadsEnabled) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void uploadImage(file);
          }}
          onPaste={(event) => {
            const file = Array.from(event.clipboardData.items).find((item) => item.kind === "file")?.getAsFile();
            if (file) {
              event.preventDefault();
              void uploadImage(file);
            }
          }}>
          <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
            {visibleUrl ? <Image src={visibleUrl} alt="Avatar preview" width={64} height={64} unoptimized referrerPolicy="no-referrer"
              className="h-16 w-16 shrink-0 rounded-full border-[3px] border-ink object-cover" />
              : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-display text-2xl font-extrabold">{initial}</span>}
            <p className="min-w-0 text-sm">Drop an image, paste, or choose a file</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={pending || !uploadsEnabled} className={buttonClass} onClick={() => fileInput.current?.click()}>Choose file</button>
            {(url || preview || uploading) && <button type="button" disabled={pending} className={buttonClass} onClick={() => changeUrl("")}>Remove avatar</button>}
          </div>
          <input ref={fileInput} type="file" accept={getMediaAccept("image")} hidden disabled={pending || !uploadsEnabled}
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
          <p className="mt-3 text-xs text-ink/70">Images up to 10 MB. A square image fits best.</p>
          {uploading && <div className="mt-3">
            <p role="status" className="text-sm">{converting ? "Converting photo" : `Uploading ${progress}%`}</p>
            <progress aria-label="Avatar upload progress" max={100} value={progress} className="mt-1 h-2 w-full accent-ink" />
          </div>}
        </div>
        {!uploadsEnabled && <p role="status" className="mt-3 text-sm">Uploads are off here, paste an image address instead.</p>}
        <details ref={fallback} open={!uploadsEnabled} className="mt-3 min-w-0 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Or paste an image address</summary>
          <label htmlFor="avatar-address" className="block font-semibold">Image address
            <input id="avatar-address" type="url" pattern="https://.*" maxLength={2048} placeholder="https://" value={url} disabled={pending}
              className="mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              onChange={(event) => changeUrl(event.target.value)} />
          </label>
        </details>
        {error && <p role="alert" className="mt-3 break-words text-sm">{error}</p>}
      </div>
      <button type="submit" disabled={pending || uploading} className="min-h-11 w-full rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-bold shadow-sticker disabled:opacity-50 sm:w-auto">{pending ? "Saving profile" : "Save profile"}</button>
    </>
  );
}
