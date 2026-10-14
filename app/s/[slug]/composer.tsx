"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ProfileImage } from "@/app/components/profile-image";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloseIcon, ImageIcon, SendIcon, TrashIcon, VideoIcon, postIconButtonBaseClass, postIconButtonClass } from "@/app/components/icons";
import { MentionAutocomplete } from "@/app/components/mention-autocomplete";
import { SubmitButton } from "@/app/components/submit-button";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import { getFileMediaFormat, getMediaAccept, mediaLimits, type MediaType } from "@/lib/media";
import { createPost, deletePost, type PostActionState } from "./post-actions";

const initialState: PostActionState = { status: "idle" };
type Attachment = { url: string; type: MediaType; name: string; contentType: string };

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

export function Composer({ slug, name, avatarUrl, onPosted, onBusyChange }: {
  slug: string;
  name: string;
  avatarUrl: string | null;
  onPosted?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  const dragDepth = useRef(0);

  useLayoutEffect(() => {
    function resize() {
      const input = textarea.current;
      if (!input) return;
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [body]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);

  useEffect(() => () => uploadController.current?.abort(), []);

  function openFilePicker(accept: string) {
    if (!fileInput.current) return;
    fileInput.current.accept = accept;
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

  const [state, action, pending] = useActionState(async (previous: PostActionState, formData: FormData) => {
    const result = await createPost(slug, previous, formData);
    if (result.status === "success") {
      setBody("");
      removeAttachment();
      onPosted?.();
    }
    return result;
  }, initialState);

  useEffect(() => {
    onBusyChange?.(pending || uploading);
  }, [onBusyChange, pending, uploading]);

  async function attachFile(file: File) {
    if (pending) return;
    const format = getFileMediaFormat(file);
    if (!format) {
      setUploadError("Choose a JPEG, PNG, WebP, GIF, AVIF, HEIC, HEIF, MP4, WebM, MOV or M4V file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const { type } = format;
    const maximum = mediaLimits[type] / (1024 * 1024);
    if (file.size > mediaLimits[type]) {
      setUploadError(`${type === "image" ? "Images" : "Videos"} must be ${maximum} MB or smaller.`);
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
      if (uploadFile.size > mediaLimits[type]) {
        throw new Error(`The converted photo must be ${maximum} MB or smaller. Choose another file.`);
      }
      setPreview({ url: URL.createObjectURL(uploadFile), type, name: uploadFile.name, contentType });
      await checkUploadAvailability();
      if (controller.signal.aborted) return;
      const blob = await upload(`startups/${slug}/${crypto.randomUUID()}.${extension}`, uploadFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ slug }),
        contentType,
        multipart: type === "video",
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => {
          if (!controller.signal.aborted) setProgress(Math.round(percentage));
        },
      });
      if (!controller.signal.aborted) {
        setAttachment({ url: blob.url, type, name: uploadFile.name, contentType });
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

  const disabled = pending || uploading || !body.trim();
  const visibleAttachment = preview ?? attachment;
  const errorMessage = uploadError || (state.status === "error" ? state.message : "");

  return (
    <form action={action} onSubmit={(event) => {
      if (disabled) event.preventDefault();
    }} className="mt-7 min-w-0" aria-busy={pending || uploading}>
      <div
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          dragDepth.current += 1;
          if (!pending) setDragging(true);
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = pending ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void attachFile(file);
        }}
        onPaste={(event) => {
          const file = Array.from(event.clipboardData.items)
            .find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
          if (!file || pending) return;
          event.preventDefault();
          void attachFile(file);
        }}
        className={`relative min-w-0 rounded-2xl border-[3px] border-ink bg-cream shadow-sticker focus-within:ring-2 focus-within:ring-ink/20 focus-within:ring-offset-2 focus-within:ring-offset-cream ${dragging ? "outline-2 outline-offset-4 outline-dashed outline-ink" : ""}`}>
        {dragging && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-cream/95 font-bold" role="status">Drop to attach</div>}
        <div className="flex min-w-0 items-start gap-3 p-5 pb-3">
          <div className="hidden shrink-0 sm:block">
            {avatarUrl ? (
              <ProfileImage src={avatarUrl} alt="" width={40} height={40} sizes="40px" referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full border-2 border-ink object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <MentionAutocomplete textareaRef={textarea} startup={slug} id="post-body" name="body" aria-label="Your update" value={body}
            onValueChange={setBody} required maxLength={5000} rows={2} disabled={pending}
            placeholder="what are you working on today?"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!disabled) event.currentTarget.form?.requestSubmit();
              }
            }}
            className="block max-h-[40vh] min-h-12 w-full min-w-0 resize-none overflow-y-auto rounded-none border-0 bg-transparent p-0 leading-6 shadow-none outline-none ring-0 placeholder:text-ink/50 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0" />
        </div>
        <input type="hidden" name="mediaUrl" value={attachment?.url ?? ""} />
        <input type="hidden" name="mediaType" value={attachment?.type ?? ""} />
        <input ref={fileInput} type="file" accept={getMediaAccept()} hidden
          disabled={pending}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void attachFile(file); }} />
        {visibleAttachment && <div className="relative mx-5 mb-3 h-28 w-40 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-xl border-2 border-ink bg-cream">
          {visibleAttachment.type === "image" ? (
            <Image src={visibleAttachment.url} alt="Attachment preview" width={160} height={112} unoptimized
              className="h-full w-full object-cover" />
          ) : <video key={visibleAttachment.url} muted playsInline preload="metadata" aria-label="Video attachment preview"
            className="h-full w-full object-cover">
            {visibleAttachment.contentType === "video/quicktime" && <source src={visibleAttachment.url} type="video/quicktime" />}
            <source src={visibleAttachment.url} />
          </video>}
          <button type="button" onClick={removeAttachment} disabled={pending} title="Remove attachment" aria-label="Remove attachment"
            className={`${postIconButtonClass} absolute top-1 right-1 bg-white`}><CloseIcon /></button>
          {uploading && <div role="progressbar" aria-label="Attachment upload progress" aria-valuenow={progress}
            aria-valuemin={0} aria-valuemax={100} className="absolute inset-x-0 bottom-0 h-1 bg-ink/20">
            <div className="h-full bg-pink" style={{ width: `${progress}%` }} />
          </div>}
        </div>}
        {visibleAttachment?.contentType === "video/quicktime" && <p className="mx-5 mb-3 text-xs text-ink/60">Some browsers may not play .mov videos. MP4 is safest.</p>}
        {uploading && <p role="status" className="mx-5 mb-3 text-sm text-ink/60">{converting ? "Converting photo" : `Uploading attachment ${progress}%`}</p>}
        <div className="flex items-center justify-between gap-3 rounded-b-xl border-t-2 border-ink/15 px-5 py-3">
          <div className="flex gap-2">
            <button type="button" disabled={pending}
              onClick={() => openFilePicker(getMediaAccept("image"))}
              title={`Add image (up to ${mediaLimits.image / (1024 * 1024)} MB)`} aria-label="Add image" className={postIconButtonClass}><ImageIcon /></button>
            <button type="button" disabled={pending}
              onClick={() => openFilePicker(getMediaAccept("video"))}
              title={`Add video (up to ${mediaLimits.video / (1024 * 1024)} MB)`} aria-label="Add video" className={postIconButtonClass}><VideoIcon /></button>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {body.length > 4000 && <span className="text-xs tabular-nums text-ink/60">{body.length.toLocaleString("en-GB")}/5,000</span>}
            <SubmitButton icon pending={pending} pendingLabel="Posting…" disabled={disabled} title="Post (⌘ or Ctrl + Enter)"
              aria-label="Post" className={`${postIconButtonBaseClass} ${disabled ? "bg-white text-ink/40" : "bg-pink text-ink shadow-sticker"}`}>
              <SendIcon />
            </SubmitButton>
          </div>
        </div>
      </div>
      {errorMessage && <p role="alert" className="mt-2 break-words text-sm">{errorMessage}</p>}
      {state.status === "success" && <p role="status" className="sr-only">Posted.</p>}
    </form>
  );
}

export function DeletePostButton({ slug, postId, returnToStartup = false }: {
  slug: string;
  postId: string;
  returnToStartup?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (): Promise<PostActionState> => {
    const result = await deletePost(slug, postId);
    if (result.status === "success" && returnToStartup) router.replace(`/s/${slug}`);
    return result;
  }, initialState);

  return (
    <form action={action} onSubmit={(event) => {
      if (pending) { event.preventDefault(); return; }
    }} className="min-w-0 max-w-full break-words" aria-busy={pending}>
      <ConfirmSubmit icon pending={pending} pendingLabel="Deleting…" title="Delete post" aria-label="Delete post"
        description="This deletes the post and its media for everyone." confirmLabel="Yes, delete"
        className={postIconButtonClass}>
        <TrashIcon />
      </ConfirmSubmit>
      {state.status === "error" && <p role="alert" className="mt-2 text-sm">{state.message}</p>}
    </form>
  );
}
