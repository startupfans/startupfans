"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, ImageIcon, postIconButtonClass } from "@/app/components/icons";
import { getFileMediaFormat, getMediaAccept, mediaLimits } from "@/lib/media";

type ReplyImage = { url: string };

async function checkUploadAvailability() {
  const response = await fetch("/api/upload", { cache: "no-store" });
  if (!response.ok) {
    const result: unknown = await response.json();
    if (typeof result === "object" && result !== null && "error" in result && typeof result.error === "string") {
      throw new Error(result.error);
    }
    throw new Error("Attachments are unavailable right now. You can still post text.");
  }
}

export function useReplyImage(userId: string | null) {
  const [attachment, setAttachment] = useState<ReplyImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [preview, setPreview] = useState<ReplyImage | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);

  useEffect(() => () => uploadController.current?.abort(), []);

  function openFilePicker() {
    if (!fileInput.current) return;
    fileInput.current.accept = getMediaAccept("image");
    fileInput.current.click();
  }

  function removeAttachment() {
    uploadController.current?.abort();
    uploadController.current = null;
    setAttachment(null);
    setUploading(false);
    setConverting(false);
    setPreview(null);
    setProgress(0);
    setUploadError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function attachFile(file: File, pending: boolean) {
    if (pending || !userId) return;
    const format = getFileMediaFormat(file);
    if (!format || format.type !== "image") {
      setUploadError("Choose a JPEG, PNG, WebP, GIF, AVIF, HEIC or HEIF image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const maximum = mediaLimits.image / (1024 * 1024);
    if (file.size > mediaLimits.image) {
      setUploadError(`Images must be ${maximum} MB or smaller.`);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    uploadController.current?.abort();
    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);
    setAttachment(null);
    setUploadError("");
    setPreview(null);
    const needsConversion = format.contentType === "image/heic" || format.contentType === "image/heif";
    setConverting(needsConversion);
    setProgress(0);
    try {
      let uploadFile = file;
      let contentType = format.contentType;
      let extension = format.extensions[0];
      if (needsConversion) {
        try {
          const { default: heic2any } = await import("heic2any");
          if (controller.signal.aborted) return;
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          if (controller.signal.aborted) return;
          const jpeg = Array.isArray(converted) ? converted[0] : converted;
          if (!jpeg) throw new Error("No converted photo.");
          uploadFile = new File([jpeg], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
          const jpegFormat = getFileMediaFormat(uploadFile);
          if (!jpegFormat) throw new Error("Unsupported converted photo.");
          contentType = jpegFormat.contentType;
          extension = jpegFormat.extensions[0];
        } catch {
          throw new Error("Couldn't convert this photo. Choose another file or export it as JPEG and try again.");
        }
      }
      if (controller.signal.aborted) return;
      setConverting(false);
      if (uploadFile.size > mediaLimits.image) {
        throw new Error(`The converted photo must be ${maximum} MB or smaller. Choose another file.`);
      }
      setPreview({ url: URL.createObjectURL(uploadFile) });
      await checkUploadAvailability();
      if (controller.signal.aborted) return;
      const blob = await upload(`users/${userId}/replies/${crypto.randomUUID()}.${extension}`, uploadFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType,
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => {
          if (!controller.signal.aborted) setProgress(Math.round(percentage));
        },
      });
      if (!controller.signal.aborted) {
        setAttachment({ url: blob.url });
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setUploadError(error instanceof Error ? error.message : "Couldn't upload this attachment. Try again.");
        setPreview(null);
        if (fileInput.current) fileInput.current.value = "";
      }
    } finally {
      if (uploadController.current === controller) {
        uploadController.current = null;
        setUploading(false);
        setConverting(false);
      }
    }
  }

  return { attachment, uploading, converting, progress, uploadError,
    setFileInput: (node: HTMLInputElement | null) => { fileInput.current = node; },
    visibleAttachment: preview ?? attachment, attachFile, removeAttachment, openFilePicker };
}

export function ReplyImagePicker({ image, pending }: { image: ReturnType<typeof useReplyImage>; pending: boolean }) {
  const { attachment, setFileInput, attachFile, visibleAttachment, removeAttachment, uploading, progress, converting, openFilePicker, uploadError } = image;
  return <div className="mt-3 min-w-0">
    <input type="hidden" name="imageUrl" value={attachment?.url ?? ""} />
    <input ref={setFileInput} type="file" accept={getMediaAccept("image")} hidden disabled={pending}
      onChange={(event) => { const file = event.target.files?.[0]; if (file) void attachFile(file, pending); }} />
    {visibleAttachment && <div className="relative mb-3 h-28 w-40 max-w-full overflow-hidden rounded-xl border-2 border-ink bg-white">
      <Image src={visibleAttachment.url} alt="Reply image preview" width={160} height={112} unoptimized className="h-full w-full object-cover" />
      <button type="button" disabled={pending} onClick={removeAttachment} aria-label="Remove attachment" title="Remove attachment"
        className={`${postIconButtonClass} absolute top-1 right-1 bg-white`}><CloseIcon /></button>
      {uploading && <div role="progressbar" aria-label="Attachment upload progress" aria-valuenow={progress}
        aria-valuemin={0} aria-valuemax={100} className="absolute inset-x-0 bottom-0 h-1 bg-ink/20">
        <div className="h-full bg-pink" style={{ width: `${progress}%` }} />
      </div>}
    </div>}
    {uploading && <p role="status" className="mb-3 text-sm text-ink/60">{converting ? "Converting photo" : `Uploading attachment ${progress}%`}</p>}
    <button type="button" disabled={pending} onClick={openFilePicker} aria-label="Add image" title="Add image (up to 10 MB)"
      className={postIconButtonClass}><ImageIcon /></button>
    {uploadError && <p role="alert" className="mt-2 break-words text-sm">{uploadError}</p>}
  </div>;
}

export function ReplyMedia({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) return null;
  return <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-sticker">
    <Image src={imageUrl} alt="Reply attachment" width={1600} height={1600} referrerPolicy="no-referrer"
      sizes="(min-width: 768px) 40rem, 100vw" className="block h-auto w-full" />
  </div>;
}
