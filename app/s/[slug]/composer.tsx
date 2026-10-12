"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { createPost, deletePost, type PostActionState } from "./post-actions";

const initialState: PostActionState = { status: "idle" };
const buttonClass = "rounded-xl border-[3px] border-ink bg-pink px-5 py-3 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60";
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

export function Composer({ slug }: { slug: string }) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);

  function removeAttachment() {
    uploadController.current?.abort();
    uploadController.current = null;
    setAttachment(null);
    setUploading(false);
    setUploadName("");
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
    setUploadName(file.name);
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
        setUploadName("");
        if (fileInput.current) fileInput.current.value = "";
      }
    } finally {
      if (uploadController.current === controller) {
        uploadController.current = null;
        setUploading(false);
      }
    }
  }

  return (
    <form action={action} onSubmit={(event) => {
      if (pending || uploading) event.preventDefault();
    }} className="mt-7 rounded-2xl border-[3px] border-ink bg-sky p-5 shadow-sticker sm:p-6" aria-busy={pending || uploading}>
      <label htmlFor="post-body" className="font-display text-xl font-extrabold">Share an update</label>
      <textarea id="post-body" name="body" value={body} onChange={(event) => setBody(event.target.value)}
        required maxLength={5000} rows={5} disabled={pending} placeholder="what are you working on today?"
        className="mt-3 block w-full resize-y rounded-xl border-2 border-ink bg-white p-4" />
      <p className="mt-2 text-sm">Markdown welcome. {body.length.toLocaleString("en-GB")}/5,000</p>
      <input type="hidden" name="mediaUrl" value={attachment?.url ?? ""} />
      <input type="hidden" name="mediaType" value={attachment?.type ?? ""} />
      <div className="mt-4 space-y-3">
        <label htmlFor="post-attachment" className="block text-sm font-bold">Optional image or video</label>
        <input id="post-attachment" ref={fileInput} type="file" accept={Object.keys(extensions).join(",")}
          disabled={pending || uploading || attachment !== null} className="block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-2 file:border-ink file:bg-cream file:px-3 file:py-2 file:font-bold"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void attachFile(file); }} />
        <p className="text-xs">Images up to 10 MB. MP4 or WebM videos up to 200 MB.</p>
        {(uploading || attachment) && <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="min-w-0 break-all">{attachment?.name ?? uploadName}</span>
          {uploading && <><progress value={progress} max={100} aria-label="Attachment upload progress" /><span role="status">{progress}%</span></>}
          <button type="button" onClick={removeAttachment} disabled={pending} className="font-bold underline underline-offset-4">Remove</button>
        </div>}
        {uploadError && <p role="alert" className="rounded-xl border-2 border-ink bg-sun p-3 text-sm">{uploadError}</p>}
      </div>
      {state.status === "error" && <p role="alert" className="mt-4 rounded-xl border-2 border-ink bg-sun p-3">{state.message}</p>}
      {state.status === "success" && <p role="status" className="mt-4 font-bold">Posted.</p>}
      <button type="submit" disabled={pending || uploading || !body.trim()} className={`${buttonClass} mt-5`}>
        {pending ? "Posting…" : "Post"}
      </button>
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
    }} aria-busy={pending}>
      <button type="submit" disabled={pending} className="text-sm font-semibold underline underline-offset-4 disabled:opacity-60">
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.status === "error" && <p role="alert" className="mt-2 text-sm">{state.message}</p>}
    </form>
  );
}
