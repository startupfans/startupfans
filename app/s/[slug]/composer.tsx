"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloseIcon, ImageIcon, SendIcon, TrashIcon, VideoIcon, postIconButtonClass } from "@/app/components/icons";
import { createPost, deletePost, type PostActionState } from "./post-actions";

const initialState: PostActionState = { status: "idle" };
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

type Attachment = { url: string; type: "image" | "video"; name: string };

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

export function Composer({ slug, name, avatarUrl }: {
  slug: string;
  name: string;
  avatarUrl: string | null;
}) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const uploadController = useRef<AbortController | null>(null);

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
    }
    return result;
  }, initialState);

  async function attachFile(file: File) {
    const extension = Object.entries(extensions).find(([type]) => type === file.type)?.[1];
    if (!extension) {
      setUploadError("Choose a JPEG, PNG, WebP, GIF, MP4 or WebM file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const type = file.type.startsWith("image/") ? "image" : "video";
    const maximum = type === "image" ? 10 : 200;
    if (file.size > maximum * 1024 * 1024) {
      setUploadError(`${type === "image" ? "Images" : "Videos"} must be ${maximum} MB or smaller.`);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);
    setAttachment(null);
    setUploadError("");
    setPreview({ url: URL.createObjectURL(file), type, name: file.name });
    setProgress(0);
    try {
      await checkUploadAvailability();
      if (controller.signal.aborted) return;
      const blob = await upload(`startups/${slug}/${crypto.randomUUID()}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ slug }),
        contentType: file.type,
        multipart: type === "video",
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => {
          if (!controller.signal.aborted) setProgress(Math.round(percentage));
        },
      });
      if (!controller.signal.aborted) setAttachment({ url: blob.url, type, name: file.name });
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
      <div className="min-w-0 rounded-2xl border-[3px] border-ink bg-white shadow-sticker focus-within:ring-2 focus-within:ring-ink/20 focus-within:ring-offset-2 focus-within:ring-offset-cream">
        <div className="flex min-w-0 items-start gap-3 p-5 pb-3">
          <div className="hidden shrink-0 sm:block">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={40} height={40} unoptimized referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full border-2 border-ink object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <textarea ref={textarea} id="post-body" name="body" aria-label="Your update" value={body}
            onChange={(event) => setBody(event.target.value)} required maxLength={5000} rows={2} disabled={pending}
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
        <input ref={fileInput} type="file" accept={Object.keys(extensions).join(",")} hidden
          disabled={pending || uploading || attachment !== null}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void attachFile(file); }} />
        {visibleAttachment && <div className="relative mx-5 mb-3 h-28 w-40 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-xl border-2 border-ink bg-cream">
          {visibleAttachment.type === "image" ? (
            <Image src={visibleAttachment.url} alt="Attachment preview" width={160} height={112} unoptimized
              className="h-full w-full object-cover" />
          ) : <video src={visibleAttachment.url} muted playsInline preload="metadata" aria-label="Video attachment preview"
            className="h-full w-full object-cover" />}
          <button type="button" onClick={removeAttachment} disabled={pending} title="Remove attachment" aria-label="Remove attachment"
            className={`${postIconButtonClass} absolute top-1 right-1 bg-white`}><CloseIcon /></button>
          {uploading && <div role="progressbar" aria-label="Attachment upload progress" aria-valuenow={progress}
            aria-valuemin={0} aria-valuemax={100} className="absolute inset-x-0 bottom-0 h-1 bg-ink/20">
            <div className="h-full bg-pink" style={{ width: `${progress}%` }} />
          </div>}
        </div>}
        <div className="flex items-center justify-between gap-3 rounded-b-xl bg-sky/20 px-5 py-3">
          <div className="flex gap-2">
            <button type="button" disabled={pending || uploading || attachment !== null}
              onClick={() => openFilePicker("image/jpeg,image/png,image/webp,image/gif")}
              title="Add image (up to 10 MB)" aria-label="Add image" className={postIconButtonClass}><ImageIcon /></button>
            <button type="button" disabled={pending || uploading || attachment !== null}
              onClick={() => openFilePicker("video/mp4,video/webm")}
              title="Add video (up to 200 MB)" aria-label="Add video" className={postIconButtonClass}><VideoIcon /></button>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {body.length > 4000 && <span className="text-xs tabular-nums text-ink/60">{body.length.toLocaleString("en-GB")}/5,000</span>}
            <button type="submit" disabled={disabled} title={pending ? "Posting…" : "Post (⌘ or Ctrl + Enter)"}
              aria-label={pending ? "Posting…" : "Post"} className={`${postIconButtonClass} bg-pink hover:bg-pink/80`}>
              {pending ? <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> : <SendIcon />}
            </button>
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
      if (!window.confirm("Delete this post? This can't be undone.")) event.preventDefault();
    }} className="min-w-0 max-w-full break-words" aria-busy={pending}>
      <button type="submit" disabled={pending} title={pending ? "Deleting…" : "Delete post"} aria-label={pending ? "Deleting…" : "Delete post"}
        className={postIconButtonClass}>
        <TrashIcon />
      </button>
      {state.status === "error" && <p role="alert" className="mt-2 text-sm">{state.message}</p>}
    </form>
  );
}
