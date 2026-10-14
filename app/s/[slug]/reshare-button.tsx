"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, startTransition, useActionState, useContext, useId, useState, type ReactNode } from "react";
import { ReshareIcon, postIconButtonClass } from "@/app/components/icons";
import { SubmitButton } from "@/app/components/submit-button";
import { MentionAutocomplete } from "@/app/components/mention-autocomplete";
import { ImageAttachmentButton, ImageAttachmentPicker, useImageAttachment } from "@/app/components/reply-image";
import { getFileMediaFormat } from "@/lib/media";
import { getReshareImageUserId, updateReshare, type ReshareState } from "./reshare-actions";
import { updateFollow, type FollowState } from "./actions";

const initialState: ReshareState = { status: "idle" };
const ReshareContext = createContext<{
  signedIn: boolean; postUrl: string; count: number; reshared: boolean; pending: boolean;
  open: boolean; panelId: string; toggle: () => void;
} | null>(null);

export function ResharePanel({ postId, postUrl, signedIn, count, reshared, children }: {
  postId: string; postUrl: string; signedIn: boolean; count: number; reshared: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const image = useImageAttachment(getReshareImageUserId, "reshares");
  const panelId = useId();
  const [state, action, pending] = useActionState(async (previous: ReshareState, data: FormData) => {
    if (data.get("intent") !== "remove" && image.uploading) {
      return { status: "error", message: "Wait for your image to finish uploading." } as const;
    }
    const result = await updateReshare(postId, previous, data);
    if (result.status === "success") { setOpen(false); setNote(""); image.removeAttachment(); }
    return result;
  }, initialState);
  function toggle() {
    if (pending) return;
    if (reshared) {
      const data = new FormData();
      data.set("intent", "remove");
      startTransition(() => action(data));
    } else {
      if (open) image.removeAttachment();
      setOpen((current) => !current);
    }
  }
  return <ReshareContext.Provider value={{ signedIn, postUrl, count, reshared, pending, open, panelId, toggle }}>
    {children}
    {open && !reshared && <form id={panelId} action={action} aria-busy={pending || image.uploading}
      onSubmit={(event) => { if (image.uploading) event.preventDefault(); }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        if (!pending) setDragging(true);
      }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) setDragging(false); }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault(); setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void image.attachFile(file, pending);
      }}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.files).find((file) => getFileMediaFormat(file)?.type === "image");
        if (!file) return;
        event.preventDefault(); void image.attachFile(file, pending);
      }}
      className={`mt-4 min-w-0 space-y-3 rounded-xl border-2 border-ink ${dragging ? "bg-sky" : "bg-cream"} p-3 shadow-sticker`}>
      <input type="hidden" name="intent" value="reshare" />
      <label htmlFor={`${panelId}-note`} className="block text-sm font-bold">Add a note (optional)</label>
      <MentionAutocomplete singleLine startup={postUrl.split("/")[2]} autoFocus id={`${panelId}-note`} name="note" maxLength={280} value={note} disabled={pending}
        aria-describedby={`${panelId}-count`} onValueChange={setNote}
        className="min-h-11 w-full min-w-0 rounded-lg border-2 border-ink bg-white px-3 py-2" />
      <ImageAttachmentPicker image={image} pending={pending} previewAlt="Reshare image preview" showButton={false} />
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <ImageAttachmentButton image={image} pending={pending} />
        <SubmitButton pending={pending} disabled={image.uploading} pendingLabel="Resharing…" className="min-h-11 rounded-xl border-2 border-ink bg-sun px-4 py-2 font-bold">Reshare</SubmitButton>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setNote(""); image.removeAttachment(); }} className="min-h-11 px-2 py-2 font-semibold underline">Cancel</button>
        <span id={`${panelId}-count`} aria-live="polite" className="ml-auto text-sm tabular-nums">{note.length}/280</span>
      </div>
    </form>}
    {state.status === "error" && <p role="alert" className="mt-3 text-sm font-semibold">{state.message}</p>}
  </ReshareContext.Provider>;
}

export function ReshareButton() {
  const context = useContext(ReshareContext);
  if (!context) throw new Error("ReshareButton needs a ResharePanel.");
  const { signedIn, postUrl, count, reshared, pending, open, panelId, toggle } = context;
  const label = reshared ? "Remove reshare" : "Reshare post";
  const className = `${reshared ? postIconButtonClass.replace("bg-white", "bg-sun") : postIconButtonClass} ${count > 0 ? "w-auto gap-1.5 px-3" : ""}`;
  const content = <><ReshareIcon />{count > 0 && <span className="text-sm font-semibold tabular-nums">{count}</span>}</>;
  if (!signedIn) return <Link href={`/login?next=${encodeURIComponent(postUrl)}`} aria-label={label} title={label} className={className}>{content}</Link>;
  return <SubmitButton type="button" icon pending={pending} pendingLabel="Updating reshare…" aria-label={label} title={label}
    aria-pressed={reshared} aria-expanded={!reshared && open} aria-controls={open ? panelId : undefined} className={className} onClick={toggle}>{content}</SubmitButton>;
}

const initialFollowState: FollowState = { status: "idle" };

export function ReshareFollowButton({ slug, name, signedIn, memberNo }: {
  slug: string; name: string; signedIn: boolean; memberNo: number | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: FollowState, data: FormData) => {
    const result = await updateFollow(slug, previous, data);
    if (result.status === "success") router.refresh();
    return result;
  }, initialFollowState);
  const className = "inline-flex min-h-11 max-w-full items-center justify-center rounded-xl border-2 border-ink bg-pink px-3 py-2 text-sm font-bold shadow-sticker";
  if (memberNo !== null) return <span className={className.replace("bg-pink", "bg-lime")}>Fan #{String(memberNo).padStart(4, "0")}</span>;
  if (!signedIn) return <Link href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`} className={className}>Follow {name}</Link>;
  return <form action={action} aria-busy={pending} className="min-w-0">
    <input type="hidden" name="intent" value="follow" />
    <SubmitButton pending={pending} pendingLabel="Following…" className={className}>Follow {name}</SubmitButton>
    {state.status === "error" && <p role="alert" className="mt-2 text-sm">{state.message}</p>}
  </form>;
}
