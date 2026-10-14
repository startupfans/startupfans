"use client";

import { startTransition, useActionState, useState } from "react";
import { SubmitButton } from "@/app/components/submit-button";
import type { getNotificationSettings } from "@/lib/notifications";
import { saveNotificationSettings, type NotificationSettingsState } from "./actions";

const initialState: NotificationSettingsState = { status: "idle" };
const toggleClass = "h-6 w-6 shrink-0 cursor-pointer accent-pink disabled:cursor-wait";

export function NotificationSettingsForm({ settings }: { settings: Awaited<ReturnType<typeof getNotificationSettings>> }) {
  const [state, action, pending] = useActionState(saveNotificationSettings, initialState);
  const [edited, setEdited] = useState(false);
  return (
    <form onChange={() => setEdited(true)} onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      setEdited(false);
      startTransition(() => action(data));
    }} className="rounded-3xl border-[3px] border-ink bg-cream p-4 shadow-sticker sm:p-6">
      <fieldset disabled={pending} className="min-w-0">
        <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border-2 border-ink bg-sun p-4">
          <span>pause all email</span>
          <input type="checkbox" role="switch" name="emailPaused" aria-label="pause all email" defaultChecked={settings.emailPaused} className={toggleClass} />
        </label>
        <p className="mt-4 text-sm text-ink/70">choose what reaches you here and in your inbox. email updates of the same kind are spaced at least ten minutes apart.</p>
        <table className="mt-5 w-full table-fixed text-sm">
          <caption className="sr-only">Notification preferences</caption>
          <thead><tr className="border-b-2 border-ink"><th scope="col" className="w-[54%] py-3 text-left font-normal">updates</th><th scope="col" className="font-normal">in app</th><th scope="col" className="font-normal">email</th></tr></thead>
          <tbody>{settings.kinds.map((row) => <tr key={row.kind} className="border-b border-ink/20">
            <th scope="row" className="py-4 pr-2 text-left font-normal">{row.label}</th>
            <td className="text-center"><label className="inline-flex h-11 w-11 items-center justify-center"><input role="switch" type="checkbox" name={`${row.kind}-inApp`} aria-label={`${row.label} in app`} defaultChecked={row.inApp} className={toggleClass} /></label></td>
            <td className="text-center"><label className="inline-flex h-11 w-11 items-center justify-center"><input role="switch" type="checkbox" name={`${row.kind}-email`} aria-label={`${row.label} email`} defaultChecked={row.email} className={toggleClass} /></label></td>
          </tr>)}</tbody>
        </table>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending} pendingLabel="saving" variant="primary" className="min-h-11 rounded-full border-2 border-ink px-5 py-2 shadow-sticker">save preferences</SubmitButton>
        {!pending && !edited && state.status === "saved" && <span role="status" className="rounded-full border-2 border-ink bg-lime px-3 py-1">saved</span>}
        {!pending && state.status === "error" && <p role="alert">couldn’t save. please try again.</p>}
      </div>
    </form>
  );
}
