import { SubmitButton } from "@/app/components/submit-button";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import { SiteFooter } from "@/app/components/sticker";
import { AppHeader } from "@/app/components/app-shell";
import { SubNav } from "@/app/components/sub-nav";
import { requireAdmin } from "@/lib/admin";
import { getWaitlistSyncState, listWaitlist, MAX_WAITLIST_BATCH, syncGetWaitlistIfStale } from "@/lib/waitlist";
import { letInEntryAction, letInFirstAction, resendEntryAction, syncWaitlistAction } from "./actions";

export const maxDuration = 60;

const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink px-4 py-2 font-bold";
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
});

function dateLabel(value: Date | null) {
  return value ? dateFormat.format(value) : "Unknown";
}

export async function WaitlistPage({ searchParams }: {
  searchParams: Promise<{ message?: string | string[] }>
}) {
  await requireAdmin();
  await syncGetWaitlistIfStale();
  const sync = getWaitlistSyncState();
  const syncConfigured = Boolean(process.env.GETWAITLIST_API_KEY);
  const [entries, query] = await Promise.all([listWaitlist(), searchParams]);
  const counts = { waiting: 0, invited: 0, joined: 0 };
  for (const entry of entries) counts[entry.status]++;
  const message = typeof query.message === "string" ? query.message.slice(0, 1000) : null;
  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn next="/admin/waitlist" subNav={
        <SubNav aria-label="Admin navigation" items={[
          { href: "/admin", label: "Post reports" },
          { href: "/admin/waitlist", label: "Waitlist", current: true },
        ]} />
      } />
      <main className="mx-auto min-w-0 max-w-6xl break-words px-5 pb-10 sm:pb-16">
        <h1 className="font-display text-4xl font-extrabold">Waitlist</h1>
        <dl className="mt-6 flex flex-wrap gap-4">
          {(["waiting", "invited", "joined"] as const).map((status) => (
            <div key={status} className="rounded-xl border-[3px] border-ink bg-sun px-5 py-3 shadow-sticker">
              <dt className="capitalize">{status}</dt><dd className="font-display text-3xl font-extrabold">{counts[status]}</dd>
            </div>
          ))}
        </dl>
        {message && <p role="status" className="mt-6 rounded-xl border-2 border-ink bg-lime p-4">{message}</p>}
        {syncConfigured && sync.error && <div role="status" className="mt-6 rounded-xl border-[3px] border-ink bg-sun p-4 shadow-sticker">
          <p className="font-bold">Could not reach GetWaitlist, showing the last synced list.</p>
          <p className="mt-2 text-sm">{sync.error}</p>
        </div>}
        <section aria-label="Manage waitlist" className="mt-8 grid min-w-0 gap-6 rounded-2xl border-[3px] border-ink bg-white p-5 shadow-sticker sm:p-6">
          <div className="space-y-6">
            <form action={letInFirstAction} className="space-y-3">
              <label htmlFor="waitlist-count" className="block font-bold">Let in the first N waiting</label>
              <div className="flex flex-wrap gap-3">
                <input id="waitlist-count" name="count" type="number" min={1} max={MAX_WAITLIST_BATCH}
                  step={1} defaultValue={10} required className="min-h-11 w-24 rounded-xl border-2 border-ink bg-cream px-3 py-2" />
                <ConfirmSubmit pendingLabel="Letting in…" className={`${buttonClass} bg-lime`}
                  description="This sends welcome emails to the first {count} people waiting." countField="count"
                  confirmLabel="Yes, let in">Let in</ConfirmSubmit>
              </div>
              <p className="text-sm">Up to {MAX_WAITLIST_BATCH} at a time, in signup order. Team members are marked as invited without an email.</p>
            </form>
            {syncConfigured ? <form action={syncWaitlistAction} className="flex flex-wrap items-center gap-3">
              <SubmitButton pendingLabel="Syncing…" className={`${buttonClass} bg-sun`}>Sync now</SubmitButton>
              <p className="text-sm">Last synced {sync.secondsAgo === null ? "never" :
                `${sync.secondsAgo} seconds ago`}</p>
            </form> : <p className="text-sm">GetWaitlist sync is not configured.</p>}
          </div>
        </section>
        <p className="mt-8 text-sm">Dates are shown in UTC. Unverified signups can still be let in.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border-[3px] border-ink bg-white shadow-sticker">
          <table className="w-full min-w-[640px] table-fixed text-left text-sm">
            <caption className="sr-only">Waitlist entries in signup order</caption>
            <thead className="border-b-2 border-ink bg-sky">
              <tr>{["Email", "Position", "Signed up", "Status", "Actions"].map((heading) =>
                <th key={heading} scope="col" className={`px-3 py-4 font-bold${heading === "Actions" ? " text-right" : ""}`}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b-2 border-ink/20 last:border-b-0">
                  <td className="break-all px-3 py-4">
                    {entry.email}
                    {entry.verified === false && <span className="mt-2 block w-fit rounded-lg border border-ink bg-sun px-2 py-1 text-xs font-bold">Unverified</span>}
                  </td>
                  <td className="px-3 py-4">{entry.position ?? "Unknown"}</td>
                  <td className="px-3 py-4">{dateLabel(entry.signedUpAt)}</td>
                  <td className="px-3 py-4">
                    {entry.status === "waiting" && "Waiting"}
                    {entry.status === "invited" && <>Invited {dateLabel(entry.invitedAt)}</>}
                    {entry.status === "joined" && <>Joined {dateLabel(entry.joinedAt)}
                      {entry.user && <a href={`mailto:${entry.user.email}`} className="mt-2 block break-all font-bold underline underline-offset-4">
                        {entry.user.name || entry.user.email}
                      </a>}
                    </>}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex justify-end gap-2">
                    <form action={entry.invitedAt ? resendEntryAction.bind(null, entry.id) : letInEntryAction.bind(null, entry.id)}>
                      <SubmitButton pendingLabel={entry.invitedAt ? "Resending…" : "Letting in…"} className={`${buttonClass} ${entry.invitedAt ? "bg-cream" : "bg-lime"}`}>
                        {entry.invitedAt ? "Resend" : "Let in"}
                      </SubmitButton>
                    </form>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={5} className="p-6">No signups yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}

export { WaitlistPage as default };
