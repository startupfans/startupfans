import Image from "next/image";
import Link from "next/link";
import { getUnusedStartupInvites } from "@/lib/invites";
import { requireStartupOwner } from "@/lib/members";
import { getStartupMembers } from "@/lib/startups";
import { removeMemberAction, revokeInviteAction, updateStartupAction } from "./actions";
import { InviteLink } from "./invite-link";

const inputClass = "mt-2 w-full rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const buttonClass = "rounded-xl border-[3px] border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50";
const messages = new Map([
  ["invalid-name", "Choose a name between 2 and 60 characters."],
  ["text-too-long", "Use up to 120 characters for the tagline and 2,000 for the description."],
  ["url-too-long", "Use up to 500 characters for your logo and website addresses."],
  ["invalid-url", "Use a full https:// address for your logo and website."],
  ["invalid-stage", "Choose a stage from the list."],
  ["invalid-team-size", "Team size must be a whole number from 1 to 10,000."],
  ["saved", "Page saved."],
  ["invalid-member", "Choose a member from the list."],
  ["last-owner", "Keep at least one owner on your page."],
  ["missing-member", "This person is already out of the team."],
  ["member-removed", "Member removed."],
  ["invalid-invite", "Choose an invite from the list."],
  ["invite-revoked", "Invite revoked."],
]);

async function SettingsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string | string[] }>;
}) {
  const { slug } = await params;
  const { startup } = await requireStartupOwner(slug);
  const [members, invites, query] = await Promise.all([
    getStartupMembers(startup.id), getUnusedStartupInvites(startup.id), searchParams,
  ]);
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const message = typeof query.message === "string" ? messages.get(query.message) : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-16">
      <Link href={`/s/${slug}`} className="font-bold underline underline-offset-4">← Back to {startup.name}</Link>
      <h1 className="mt-8 font-display text-4xl font-extrabold">Your page settings.</h1>
      {message && <p role="status" className="mt-5 rounded-xl border-2 border-ink bg-sun p-4">{message}</p>}
      <section className="mt-8 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-8" aria-labelledby="page-details">
        <h2 id="page-details" className="font-display text-2xl font-extrabold">Page details</h2>
        <p className="mt-2 break-words text-ink/70">Page address: /s/{slug}</p>
        <form action={updateStartupAction.bind(null, slug)} className="mt-6 space-y-5">
          <label htmlFor="name" className="block font-bold">Startup name
            <input id="name" name="name" defaultValue={startup.name} required minLength={2} maxLength={60} autoComplete="organization" className={inputClass} />
          </label>
          <label htmlFor="tagline" className="block font-bold">Tagline
            <input id="tagline" name="tagline" defaultValue={startup.tagline ?? ""} maxLength={120} className={inputClass} />
          </label>
          <label htmlFor="description" className="block font-bold">Description
            <textarea id="description" name="description" defaultValue={startup.description ?? ""} maxLength={2000} rows={5} className={inputClass} />
          </label>
          <label htmlFor="logoUrl" className="block font-bold">Logo URL
            <input id="logoUrl" name="logoUrl" defaultValue={startup.logoUrl ?? ""} type="url" pattern="https://.*" maxLength={500} placeholder="https://" className={inputClass} />
          </label>
          <label htmlFor="website" className="block font-bold">Website
            <input id="website" name="website" defaultValue={startup.website ?? ""} type="url" pattern="https://.*" maxLength={500} placeholder="https://" autoComplete="url" className={inputClass} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label htmlFor="stage" className="block font-bold">Stage
              <select id="stage" name="stage" defaultValue={startup.stage ?? ""} className={inputClass}>
                <option value="">Choose a stage</option>
                <option value="idea">Idea</option><option value="pre-seed">Pre-seed</option>
                <option value="seed">Seed</option><option value="series-a">Series A</option>
                <option value="growth">Growth</option><option value="bootstrapped">Bootstrapped</option>
              </select>
            </label>
            <label htmlFor="teamSize" className="block font-bold">Team size
              <input id="teamSize" name="teamSize" defaultValue={startup.teamSize ?? ""} type="number" min={1} max={10000} step={1} className={inputClass} />
            </label>
          </div>
          <button type="submit" className={`${buttonClass} bg-lime`}>Save page</button>
        </form>
      </section>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-8" aria-labelledby="team-heading">
        <h2 id="team-heading" className="font-display text-2xl font-extrabold">Your team</h2>
        <ul className="mt-5 space-y-4">
          {members.map((member) => {
            const name = member.name?.trim() || member.email.split("@")[0];
            const lastOwner = member.role === "owner" && ownerCount === 1;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink bg-white p-4">
                {member.avatarUrl ? (
                  <Image src={member.avatarUrl} alt={`${name}'s avatar`} width={40} height={40} unoptimized referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full border-2 border-ink object-cover" />
                ) : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold">{name.charAt(0).toUpperCase()}</span>}
                <div className="min-w-0 flex-1 break-words"><p className="font-bold">{name}</p><p className="text-sm text-ink/70">{member.role}</p></div>
                <form action={removeMemberAction.bind(null, slug)}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <button type="submit" disabled={lastOwner} title={lastOwner ? "Keep at least one owner on your page." : undefined} className={buttonClass} aria-label={`Remove ${name}`}>Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-ink/70">Your page needs at least one owner.</p>
        <InviteLink slug={slug} />
      </section>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-sticker-lg sm:p-8" aria-labelledby="invites-heading">
        <h2 id="invites-heading" className="font-display text-2xl font-extrabold">Unused invites</h2>
        {invites.length === 0 ? <p className="mt-4 text-ink/70">No unused invites.</p> : (
          <ul className="mt-5 space-y-4">
            {invites.map((invite, index) => (
              <li key={invite.tokenHash} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-4">
                <div><p className="font-bold">Invite {index + 1}</p>
                  <p className="text-sm text-ink/70">{invite.expired ? "Expired" : "Expires"} {invite.expiresAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC</p>
                </div>
                <form action={revokeInviteAction.bind(null, slug)}>
                  <input type="hidden" name="tokenHash" value={invite.tokenHash} />
                  <button type="submit" className={buttonClass} aria-label={`Revoke invite ${index + 1}`}>Revoke</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export { SettingsPage as default };
