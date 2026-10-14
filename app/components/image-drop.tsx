"use client";

import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { getFileMediaFormat, getMediaAccept, mediaLimits } from "@/lib/media";

const buttonClass = "min-h-11 rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

function previewUrl(value: string) {
  try { return new URL(value).protocol === "https:" ? value : null; }
  catch { return null; }
}

const previewClasses = {
  round: "h-16 w-16 shrink-0 rounded-full",
  square: "h-24 w-24 shrink-0 rounded-xl",
  wide: "aspect-[3/1] w-full rounded-xl",
};

export function ImageDrop({ name, label, shape, initialUrl, initial, buildUploadPath, hint, uploadsEnabled,
  maxUrlLength = 2048, uploadScope, onUploadingChange, onUrlChange, status }: {
  name: string;
  label: string;
  shape: "round" | "square" | "wide";
  initialUrl: string;
  initial?: string;
  buildUploadPath: (extension: string, form: HTMLFormElement | null) => { pathname: string; clientPayload?: string };
  hint: string;
  uploadsEnabled: boolean;
  maxUrlLength?: number;
  uploadScope?: { field: string; value?: string };
  onUploadingChange?: (uploading: boolean) => void;
  onUrlChange?: (url: string) => void;
  status?: ReactNode;
}) {
  const id = useId();
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
  const uploadedScope = useRef<string | null>(null);

  const changeUrl = useCallback((value: string) => {
    controller.current?.abort();
    controller.current = null;
    uploadedScope.current = null;
    setUrl(value);
    setPreview(null);
    setUploading(false);
    setConverting(false);
    setProgress(0);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
    onUrlChange?.(value);
  }, [onUrlChange]);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { onUploadingChange?.(uploading); }, [uploading, onUploadingChange]);
  const scopeField = uploadScope?.field;
  const scopeValue = uploadScope?.value;
  useEffect(() => {
    const form = fileInput.current?.form;
    function checkScope() {
      const input = scopeField ? form?.elements.namedItem(scopeField) : null;
      const target = scopeValue ?? (input instanceof HTMLInputElement ? input.value.trim() : "");
      if (uploadedScope.current === null || target === uploadedScope.current) return false;
      changeUrl("");
      setError(`Your page address changed. Upload the ${label.toLowerCase()} again for this address or save without it.`);
      return true;
    }
    function blockIncompleteUpload(event: SubmitEvent) {
      const changed = checkScope();
      if (!changed && !controller.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (!changed) setError(`Wait for the upload to finish or remove the ${label.toLowerCase()} before saving.`);
    }
    form?.addEventListener("input", checkScope);
    form?.addEventListener("change", checkScope);
    form?.addEventListener("submit", blockIncompleteUpload, true);
    checkScope();
    return () => {
      form?.removeEventListener("input", checkScope);
      form?.removeEventListener("change", checkScope);
      form?.removeEventListener("submit", blockIncompleteUpload, true);
    };
  }, [scopeField, scopeValue, label, changeUrl]);

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
    let target;
    try {
      target = buildUploadPath(format.extensions[0], fileInput.current?.form ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Choose a valid page address before uploading.");
      return;
    }
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const scopeInput = scopeField ? fileInput.current?.form?.elements.namedItem(scopeField) : null;
    uploadedScope.current = scopeField ? scopeValue ?? (scopeInput instanceof HTMLInputElement ? scopeInput.value.trim() : "") : null;
    setUploading(true);
    setProgress(0);
    setError("");
    setPreview(null);
    const needsConversion = ["image/heic", "image/heif"].includes(format.contentType);
    setConverting(needsConversion);
    try {
      let image = file;
      let contentType = format.contentType;
      if (needsConversion) {
        const { default: heic2any } = await import("heic2any");
        if (active.signal.aborted) return;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        if (active.signal.aborted) return;
        const jpeg = Array.isArray(converted) ? converted[0] : converted;
        if (!jpeg) throw new Error("Couldn't convert this photo. Try a JPEG image.");
        image = new File([jpeg], "image.jpg", { type: "image/jpeg" });
        contentType = "image/jpeg";
        target.pathname = target.pathname.replace(/\.[^.]+$/, ".jpg");
      }
      if (active.signal.aborted) return;
      if (image.size > mediaLimits.image) throw new Error("The converted photo must be 10 MB or smaller.");
      setConverting(false);
      setPreview(URL.createObjectURL(image));
      const blob = await upload(target.pathname, image, {
        clientPayload: target.clientPayload,
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
        onUrlChange?.(blob.url);
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
    <div className="min-w-0" aria-busy={uploading}>
      <p id={`${id}-heading`} className="font-bold">{label}{shape === "round" && <span className="font-normal"> (optional)</span>}{status}</p>
      <input type="hidden" name={name} value={url} />
      <div role="group" aria-labelledby={`${id}-heading`} tabIndex={0}
        className={`mt-2 min-w-0 rounded-xl border-[3px] border-dashed border-ink p-4 shadow-sticker transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${dragging ? "bg-lime/50" : "bg-cream hover:bg-lime/30"}`}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("button, input")) return;
          if (!pending && uploadsEnabled) fileInput.current?.click();
        }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            if (!pending && uploadsEnabled) fileInput.current?.click();
          }
        }}
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
        <div className={`flex min-w-0 flex-col items-start gap-3 ${shape === "wide" ? "" : "sm:flex-row sm:items-center"}`}>
          <div className={`relative overflow-hidden border-[3px] border-ink bg-sun ${previewClasses[shape]}`}>
            {visibleUrl ? (
              visibleUrl.includes(".blob.vercel-storage.com") || visibleUrl.startsWith("blob:") ? (
                <Image src={visibleUrl} alt={`${label} preview`} fill unoptimized referrerPolicy="no-referrer"
                  sizes={shape === "wide" ? "600px" : shape === "square" ? "96px" : "64px"}
                  className={shape === "square" ? "object-contain p-2" : "object-cover"} />
              ) : (
                // Pasted or brand-lookup https URLs are not always in next/image remotePatterns.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visibleUrl} alt={`${label} preview`} referrerPolicy="no-referrer"
                  className={`h-full w-full ${shape === "square" ? "object-contain p-2" : "object-cover"}`} />
              )
            ) : <span aria-hidden="true" className="flex h-full items-center justify-center font-display text-2xl font-extrabold">{initial}</span>}
          </div>
          <p className="min-w-0 text-sm">Drop an image, paste, or choose a file</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={pending || !uploadsEnabled} className={buttonClass} onClick={() => fileInput.current?.click()}>Choose file</button>
          {(url || preview || uploading) && <button type="button" disabled={pending} className={buttonClass} onClick={() => changeUrl("")}>Remove {label.toLowerCase()}</button>}
        </div>
        <input ref={fileInput} type="file" accept={getMediaAccept("image")} hidden disabled={pending || !uploadsEnabled}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
        <p className="mt-3 text-xs text-ink/70">{hint}</p>
        {uploading && <div className="mt-3">
          <p role="status" className="text-sm">{converting ? "Converting photo" : `Uploading ${progress}%`}</p>
          <progress aria-label={`${label} upload progress`} max={100} value={progress} className="mt-1 h-2 w-full accent-ink" />
        </div>}
      </div>
      {!uploadsEnabled && <p role="status" className="mt-3 text-sm">Uploads are off here, paste an image address instead.</p>}
      <details ref={fallback} open={!uploadsEnabled} className="mt-3 min-w-0 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Or paste an image address</summary>
        <label htmlFor={`${id}-address`} className="block font-semibold">Image address
          <input id={`${id}-address`} type="url" pattern="https://.*" maxLength={maxUrlLength} placeholder="https://" value={url} disabled={pending}
            className="mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            onChange={(event) => changeUrl(event.target.value)} />
        </label>
      </details>
      {error && <p role="alert" className="mt-3 break-words text-sm">{error}</p>}
    </div>
  );
}
