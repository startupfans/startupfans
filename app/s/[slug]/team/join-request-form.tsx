"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import { requestToJoinAction, type JoinRequestState } from "./actions";

const buttonClass = "inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl border-[3px] border-ink bg-pink px-5 py-3 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-60 sm:w-auto";
const initialState: JoinRequestState = { status: "idle" };

export function JoinRequestForm({ slug, warning }: { slug: string; warning: string }) {
  const [state, action, pending] = useActionState(requestToJoinAction.bind(null, slug), initialState);

  return (
    <form action={action} className="mt-5">
      <ConfirmSubmit danger={false} dialogTitle="Use a join request?" description={warning}
        confirmLabel="Yes, send it" pendingLabel="Sending…" pending={pending} className={buttonClass}>
        Request to join
      </ConfirmSubmit>
      {state.status === "sent" && <p role="status" className="mt-4 font-semibold">Request sent. An owner can add you from settings.</p>}
      {state.status === "error" && <p role="alert" className="mt-4 font-semibold">{state.message}</p>}
    </form>
  );
}
