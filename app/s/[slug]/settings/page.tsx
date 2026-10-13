import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconField } from "@/app/components/icon-field";
import { GitHubIcon, GlobeIcon, InstagramIcon, LinkedInIcon, PinIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/app/components/icons";
import { getUnusedStartupInvites } from "@/lib/invites";
import { requireStartupOwner } from "@/lib/members";
import { getStartupMembers } from "@/lib/startups";
import { getSlackConnection, isSlackConfigured } from "@/lib/slack";
import { disconnectSlackAction, removeMemberAction, revokeInviteAction, updateStartupAction } from "./actions";
import { InviteByEmail, InviteLink } from "./invite-link";
import { BioField, ImageUpload } from "./image-upload";
import { socialNetworks, type SocialNetwork } from "@/lib/socials";

const socialIcons = {
  x: XIcon, linkedin: LinkedInIcon, github: GitHubIcon,
  instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon,
} satisfies Record<SocialNetwork, () => ReactNode>;

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const buttonClass = "inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl border-[3px] border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50 sm:w-auto";
const messages = new Map([
  ["slack-connected", "Slack connected."],
  ["slack-disconnected", "Slack disconnected."],
  ["slack-connect-failed", "We couldn't connect Slack. Check that this workspace isn't connected to another startup, then try again."],
  ["invalid-name", "Choose a name between 2 and 60 characters."],
  ["text-too-long", "Use up to 120 characters for the tagline and location, 280 for the bio and 2,000 for the description."],
  ["url-too-long", "Use up to 500 characters for image and website addresses."],
  ["invalid-url", "Upload images to this page's profile folder or paste an https:// image URL. Your website also needs an https:// address."],
  ["invalid-social-x", "Use an X handle or an https://x.com/ profile URL."],
  ["invalid-social-linkedin", "Use an https://www.linkedin.com/company/ or /in/ profile URL."],
  ["invalid-social-github", "Use an https://github.com/ profile URL."],
  ["invalid-social-instagram", "Use an Instagram handle or an https://www.instagram.com/ profile URL."],
  ["invalid-social-youtube", "Use an https://www.youtube.com/ channel URL."],
  ["invalid-social-tiktok", "Use a TikTok handle or an https://www.tiktok.com/@ profile URL."],
  ["invalid-stage", "Choose a stage from the list."],
  ["invalid-team-size", "Team size must be a whole number from 1 to 10,000."],
  ["saved", "Page saved."],
  ["invalid-member", "Choose a member from the list."],
  ["last-owner", "Keep at least one owner on your page."],
  ["missing-member", "This person is already out of the team."],
  ["member-removed", "Member removed."],
  ["invalid-invite", "Choose an invite from the list."],
  ["invite-revoked", "Invite revoked."],
  ["invalid-email", "Enter a valid email address for your teammate."],
  ["invite-sent", "Invite sent."],
  ["invite-send-failed", "We couldn't send the email. Try again or create a link to share."],
]);

async function SettingsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string | string[] }>;
}) {
  const { slug } = await params;
  const { startup, user } = await requireStartupOwner(slug);
  const slackConfigured = isSlackConfigured();
  const [members, invites, query, slackConnection] = await Promise.all([
    getStartupMembers(startup.id), getUnusedStartupInvites(startup.id), searchParams,
    slackConfigured ? getSlackConnection(startup.id) : Promise.resolve(null),
  ]);
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const message = typeof query.message === "string" ? messages.get(query.message) : undefined;

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-6xl break-words px-5 py-10 sm:py-16">
      <Link href={`/s/${slug}`} className="inline-block min-h-11 max-w-full py-2 font-bold underline underline-offset-4">← Back to {startup.name}</Link>
      <h1 className="mt-8 font-display text-4xl font-extrabold">Your page settings.</h1>
      {message && <p role="status" className="mt-5 rounded-xl border-2 border-ink bg-sun p-4">{message}</p>}
      <section className="mt-8 rounded-3xl border-[3px] border-ink bg-lime p-6 shadow-sticker-lg sm:p-8" aria-labelledby="slack-heading">
        <h2 id="slack-heading" className="font-display text-2xl font-extrabold">Slack</h2>
        {!slackConfigured ? <p className="mt-4">Slack isn&apos;t configured</p> : slackConnection ? (
          <>
            <p className="mt-4 break-words">Connected to {slackConnection.workspaceName}.</p>
            <p className="mt-2">React with 📣 to post. Messages become public on your startup page.</p>
            <p className="mt-2 text-sm text-ink/70">Invite startupfans to the channels you want to publish from.</p>
            <form action={disconnectSlackAction.bind(null, slug)} className="mt-5">
              <button type="submit" className={buttonClass}>Disconnect</button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-4">Connect your workspace and react with 📣 to publish a message on your public startup page.</p>
            <a href={`/api/slack/install?${new URLSearchParams({ slug })}`} className={`${buttonClass} mt-5`}>Connect Slack</a>
          </>
        )}
      </section>
      <div className="mt-8 grid min-w-0 gap-10 lg:grid-cols-2 lg:items-start">
        <section className="min-w-0 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-8" aria-labelledby="page-details">
          <h2 id="page-details" className="font-display text-2xl font-extrabold">Page details</h2>
          <p className="mt-2 break-words text-ink/70">Page address: /s/{slug}</p>
          <form action={updateStartupAction.bind(null, slug)} className="mt-6 space-y-5">
            <label htmlFor="name" className="block font-bold">Startup name
              <input id="name" name="name" defaultValue={startup.name} required minLength={2} maxLength={60} autoComplete="organization" className={inputClass} />
            </label>
            <label htmlFor="tagline" className="block font-bold">Tagline
              <input id="tagline" name="tagline" defaultValue={startup.tagline ?? ""} maxLength={120} className={inputClass} />
            </label>
            <BioField initialBio={startup.bio ?? ""} />
            <label htmlFor="description" className="block font-bold">Description
              <textarea id="description" name="description" defaultValue={startup.description ?? ""} maxLength={2000} rows={5} className={`${inputClass} resize-y`} />
            </label>
            <ImageUpload name="logoUrl" label="Logo" slug={slug} initialUrl={startup.logoUrl ?? ""} creatorId={user.id} />
            <ImageUpload name="coverUrl" label="Cover image" slug={slug} initialUrl={startup.coverUrl ?? ""} creatorId={user.id} />
            <label htmlFor="location" className="block font-bold">Location
              <IconField icon={<PinIcon />} id="location" name="location" defaultValue={startup.location ?? ""} maxLength={120} placeholder="City, country or remote" />
            </label>
            <label htmlFor="website" className="block font-bold">Website
              <IconField icon={<GlobeIcon />} id="website" name="website" defaultValue={startup.website ?? ""} type="url" pattern="https://.*" maxLength={500} placeholder="https://" autoComplete="url" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label htmlFor="stage" className="block min-w-0 font-bold">Stage
                <select id="stage" name="stage" defaultValue={startup.stage ?? ""} className={inputClass}>
                  <option value="">Choose a stage</option>
                  <option value="idea">Idea</option><option value="pre-seed">Pre-seed</option>
                  <option value="seed">Seed</option><option value="series-a">Series A</option>
                  <option value="growth">Growth</option><option value="bootstrapped">Bootstrapped</option>
                </select>
              </label>
              <label htmlFor="teamSize" className="block min-w-0 font-bold">Team size
                <input id="teamSize" name="teamSize" defaultValue={startup.teamSize ?? ""} type="number" min={1} max={10000} step={1} className={inputClass} />
              </label>
            </div>
            <fieldset className="min-w-0 space-y-5">
              <legend className="mb-3 font-display text-xl font-extrabold">Social profiles</legend>
              {socialNetworks.map(({ network, field, label, placeholder }) => {
                const SocialIcon = socialIcons[network];
                return <label key={field} htmlFor={field} className="block font-bold">{label}
                  <IconField icon={<SocialIcon />} id={field} name={field} defaultValue={startup[field] ?? ""} maxLength={500} placeholder={placeholder}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                </label>;
              })}
            </fieldset>
            <button type="submit" className={`${buttonClass} bg-lime`}>Save page</button>
          </form>
        </section>
        <section className="min-w-0 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-8" aria-labelledby="team-heading">
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
                  <form action={removeMemberAction.bind(null, slug)} className="w-full sm:w-auto">
                    <input type="hidden" name="memberId" value={member.id} />
                    <button type="submit" disabled={lastOwner} title={lastOwner ? "Keep at least one owner on your page." : undefined} className={buttonClass} aria-label={`Remove ${name}`}>Remove</button>
                  </form>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-ink/70">Your page needs at least one owner.</p>
          <div className="mt-6 grid min-w-0 gap-8">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-extrabold">Invite by link</h3>
              <InviteLink slug={slug} />
            </div>
            <InviteByEmail slug={slug} />
          </div>
        </section>
      </div>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-sticker-lg sm:p-8" aria-labelledby="invites-heading">
        <h2 id="invites-heading" className="font-display text-2xl font-extrabold">Unused invites</h2>
        {invites.length === 0 ? <p className="mt-4 text-ink/70">No unused invites.</p> : (
          <ul className="mt-5 space-y-4">
            {invites.map((invite, index) => (
              <li key={invite.tokenHash} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-4">
                <div className="min-w-0 max-w-full"><p className="font-bold">Invite {index + 1}</p>
                  <p className="text-sm text-ink/70">{invite.expired ? "Expired" : "Expires"} {invite.expiresAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC</p>
                </div>
                <form action={revokeInviteAction.bind(null, slug)} className="w-full sm:w-auto">
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
