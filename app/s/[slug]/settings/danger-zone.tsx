import { deleteStartupAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";

const description = "This permanently deletes the page, its posts, replies, team and fans.";

export function DangerZone({ slug }: { slug: string }) {
  return (
    <section className="mt-10 min-w-0 rounded-3xl border-[3px] border-pink bg-white p-6 shadow-sticker-lg sm:p-8" aria-labelledby="danger-zone-heading">
      <h2 id="danger-zone-heading" className="font-display text-2xl font-extrabold">Danger zone</h2>
      <p className="mt-4">{description}</p>
      <form action={deleteStartupAction.bind(null, slug)} className="mt-5">
        <input type="hidden" name="confirm" value="delete" />
        <ConfirmSubmit pendingLabel="Deleting…" className="min-h-11 w-full rounded-xl border-2 border-ink bg-pink px-4 py-2 font-bold shadow-sticker sm:w-auto"
          description={description} confirmLabel="Yes, delete">Delete startup</ConfirmSubmit>
      </form>
    </section>
  );
}
