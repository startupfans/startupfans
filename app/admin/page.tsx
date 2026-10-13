import { SubmitButton } from "@/app/components/submit-button";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import Link from "next/link";
import { SiteFooter, TopNav } from "@/app/components/sticker";
import { SubNav } from "@/app/components/sub-nav";
import { requireAdmin } from "@/lib/admin";
import { listOpenReports } from "@/lib/reports";
import { deleteReportedPostAction, resolveReportsAction } from "./actions";

export async function AdminPage() {
  await requireAdmin();
  const reports = await listOpenReports();
  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-4xl break-words px-5 py-10 sm:py-16">
      <TopNav signedIn next="/admin" />
      <SubNav aria-label="Admin navigation" items={[
        { href: "/admin", label: "Post reports", current: true },
        { href: "/admin/waitlist", label: "Waitlist" },
      ]} />
      <h1 className="font-display text-4xl font-extrabold">Post reports</h1>
      <section className="mt-8 space-y-6" aria-label="Open reports">
        {reports.length === 0 && <p>No open reports.</p>}
        {reports.map((report) => (
          <article key={report.postId} className="rounded-2xl border-[3px] border-ink bg-white p-6 shadow-sticker">
            <h2 className="font-display text-xl font-extrabold">
              <Link href={`/s/${report.startupSlug}`} className="underline underline-offset-4">{report.startupName}</Link>
            </h2>
            <p className="mt-2 text-sm font-semibold">{report.count} {report.count === 1 ? "report" : "reports"}</p>
            <p className="mt-4 whitespace-pre-wrap break-words">{report.excerpt}</p>
            <Link href={`/s/${report.startupSlug}/p/${report.postId}`} className="mt-3 inline-flex min-h-11 items-center py-2 text-sm font-bold underline underline-offset-4">View post</Link>
            {report.reasons?.length ? (
              <ul aria-label="Report reasons" className="mt-4 list-inside list-disc space-y-2 text-sm">
                {report.reasons.map((reason) => <li key={reason} className="break-words">{reason}</li>)}
              </ul>
            ) : null}
            <div className="mt-5 flex flex-wrap items-start gap-6">
              <form action={resolveReportsAction.bind(null, report.postId)} className="w-full sm:w-auto">
                <SubmitButton pendingLabel="Resolving…" className="min-h-11 w-full rounded-xl border-2 border-ink bg-lime px-4 py-2 font-bold">Resolve reports</SubmitButton>
              </form>
              <form action={deleteReportedPostAction.bind(null, report.postId)} className="w-full min-w-0 space-y-3 sm:w-auto">
                <input type="hidden" name="confirm" value="delete" />
                <ConfirmSubmit pendingLabel="Deleting…" className="min-h-11 w-full rounded-xl border-2 border-ink bg-pink px-4 py-2 font-bold"
                  description="This permanently deletes the post and its media for everyone and removes its reports."
                  confirmLabel="Yes, delete">Delete post</ConfirmSubmit>
              </form>
            </div>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}

export { AdminPage as default };
