import Link from "next/link";
import { SiteFooter, TopNav } from "@/app/components/sticker";
import { requireAdmin } from "@/lib/admin";
import { listOpenReports } from "@/lib/reports";
import { deleteReportedPostAction, resolveReportsAction } from "./actions";

export async function AdminPage() {
  await requireAdmin();
  const reports = await listOpenReports();
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10 sm:py-16">
      <TopNav signedIn next="/admin" />
      <h1 className="mt-10 font-display text-4xl font-extrabold">Post reports</h1>
      <section className="mt-8 space-y-6" aria-label="Open reports">
        {reports.length === 0 && <p>No open reports.</p>}
        {reports.map((report) => (
          <article key={report.postId} className="rounded-2xl border-[3px] border-ink bg-white p-6 shadow-sticker">
            <h2 className="font-display text-xl font-extrabold">
              <Link href={`/s/${report.startupSlug}`} className="underline underline-offset-4">{report.startupName}</Link>
            </h2>
            <p className="mt-2 text-sm font-semibold">{report.count} {report.count === 1 ? "report" : "reports"}</p>
            <p className="mt-4 whitespace-pre-wrap break-words">{report.excerpt}</p>
            <Link href={`/s/${report.startupSlug}/p/${report.postId}`} className="mt-3 inline-block text-sm font-bold underline underline-offset-4">View post</Link>
            {report.reasons?.length ? (
              <ul aria-label="Report reasons" className="mt-4 list-inside list-disc space-y-2 text-sm">
                {report.reasons.map((reason) => <li key={reason} className="break-words">{reason}</li>)}
              </ul>
            ) : null}
            <div className="mt-5 flex flex-wrap items-start gap-6">
              <form action={resolveReportsAction.bind(null, report.postId)}>
                <button type="submit" className="rounded-xl border-2 border-ink bg-lime px-4 py-2 font-bold">Resolve reports</button>
              </form>
              <form action={deleteReportedPostAction.bind(null, report.postId)} className="space-y-3">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="confirm" value="delete" required className="mt-1" />
                  Delete this post permanently
                </label>
                <button type="submit" className="rounded-xl border-2 border-ink bg-pink px-4 py-2 font-bold">Delete post</button>
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
