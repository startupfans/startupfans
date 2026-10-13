import { SubmitButton } from "@/app/components/submit-button";
import { AppHeader } from "@/app/components/app-shell";
import { SubNav } from "@/app/components/sub-nav";
import { ConfirmSubmit } from "@/app/components/confirm-dialog";
import Image from "next/image";
import type { ReactNode } from "react";
import { IconField } from "@/app/components/icon-field";
import { GitHubIcon, GlobeIcon, InstagramIcon, LinkedInIcon, PinIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/app/components/icons";
import { getUnusedStartupInvites, hasExpiredStartupInvites } from "@/lib/invites";
import { requireStartupOwner } from "@/lib/members";
import { getStartupMembers } from "@/lib/startups";
import { getSlackConnection, isSlackConfigured } from "@/lib/slack";
import { clearExpiredInvitesAction, disconnectSlackAction, removeMemberAction, revokeInviteAction, setMemberRoleAction, updateStartupAction } from "./actions";
import { InviteByEmail, InviteLink } from "./invite-link";
import { BioField, ImageUpload } from "./image-upload";
import { DangerZone } from "./danger-zone";
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
  ["invalid-url", "Upload images to this page's profile folder or paste an https:// image URL."],
  ["invalid-website", "Use a website address like yourstartup.com."],
  ["invalid-social-x", "Use an X handle or an https://x.com/ profile URL."],
  ["invalid-social-linkedin", "Use an https://www.linkedin.com/company/ or /in/ profile URL."],
  ["invalid-social-github", "Use an https://github.com/ profile URL."],
  ["invalid-social-instagram", "Use an Instagram handle or an https://www.instagram.com/ profile URL."],
  ["invalid-social-youtube", "Use an https://www.youtube.com/ channel URL."],
  ["invalid-social-tiktok", "Use a TikTok handle or an https://www.tiktok.com/@ profile URL."],
  ["invalid-stage", "Choose a stage from the list."],
  ["saved", "Page saved."],
  ["invalid-member", "Choose a member from the list."],
  ["last-owner", "Keep at least one owner on your page."],
  ["missing-member", "This person is already out of the team."],
  ["member-removed", "Member removed."],
  ["invalid-role", "Choose owner or editor."],
  ["role-changed", "Member role updated."],
  ["invalid-invite", "Choose an invite from the list."],
  ["invite-revoked", "Invite revoked."],
  ["expired-invites-cleared", "Expired invites cleared."],
  ["invalid-email", "Enter a valid email address for your teammate."],
  ["invite-sent", "Invite sent."],
  ["invite-send-failed", "We couldn't send the email. Try again or create a link to share."],
]);

async function SettingsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string | string[] }>;
}) {
  const { slug } = await params;
  const { startup, user, isSiteAdmin, isOwner, isMember } = await requireStartupOwner(slug);
  const slackConfigured = isSlackConfigured();
  const [members, invites, query, slackConnection, hasExpiredInvites] = await Promise.all([
    getStartupMembers(startup.id), getUnusedStartupInvites(startup.id), searchParams,
    isOwner && slackConfigured ? getSlackConnection(startup.id) : Promise.resolve(null),
    hasExpiredStartupInvites(startup.id),
  ]);
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const message = typeof query.message === "string" ? messages.get(query.message) : undefined;

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn next={`/s/${slug}/settings`} subNav={
        <SubNav aria-label="Startup navigation" items={[
          { href: `/s/${slug}`, label: "Page" },
          { href: `/s/${slug}/team`, label: "Team" },
          { href: `/s/${slug}/settings`, label: "Settings", current: true },
        ]} />
      } />
      <main className="mx-auto min-w-0 max-w-6xl break-words px-5 pb-10 sm:pb-16">
        <h1 className="font-display text-4xl font-extrabold">Your page settings.</h1>
        {isSiteAdmin && !isMember && <p className="mt-5 inline-block -rotate-1 rounded-xl border-2 border-ink bg-sun px-4 py-3 shadow-sticker">You&apos;re here as a site admin.</p>}
        {message && <p role="status" className="mt-5 rounded-xl border-2 border-ink bg-sun p-4">{message}</p>}
        {isOwner && <section className="mt-8 rounded-3xl border-[3px] border-ink bg-lime p-6 shadow-sticker-lg sm:p-8" aria-labelledby="slack-heading">
          <h2 id="slack-heading" className="font-display text-2xl font-extrabold">Slack</h2>
          {!slackConfigured ? <p className="mt-4">Slack isn&apos;t configured</p> : (
            <>
              <p className="mt-4">Your team already posts wins in Slack. React with 📣 and the message lands on your public page, so the feed fills itself.</p>
              {slackConnection ? (
                <>
                  <p className="mt-4 break-words">Connected to {slackConnection.workspaceName}.</p>
                  <p className="mt-2 text-sm text-ink/70">Invite startupfans to the channels you want to publish from.</p>
                  <form action={disconnectSlackAction.bind(null, slug)} className="mt-5">
                    <ConfirmSubmit pendingLabel="Disconnecting…" className={buttonClass}
                      description={`This disconnects ${slackConnection.workspaceName} from this startup. Existing posts stay published.`}
                      confirmLabel="Yes, disconnect">Disconnect</ConfirmSubmit>
                  </form>
                </>
              ) : (
                <a href={`/api/slack/install?${new URLSearchParams({ slug })}`} className={`${buttonClass} mt-5`}>Connect Slack</a>
              )}
            </>
          )}
        </section>}
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
                <IconField icon={<GlobeIcon />} id="website" name="website" defaultValue={startup.website ?? ""} type="text" inputMode="url" maxLength={500} placeholder="yourstartup.com" autoComplete="url" />
              </label>
              <label htmlFor="stage" className="block min-w-0 font-bold">Stage
                <select id="stage" name="stage" defaultValue={startup.stage ?? ""} className={inputClass}>
                  <option value="">Choose a stage</option>
                  <option value="idea">Idea</option><option value="pre-seed">Pre-seed</option>
                  <option value="seed">Seed</option><option value="series-a">Series A</option>
                  <option value="growth">Growth</option><option value="bootstrapped">Bootstrapped</option>
                </select>
              </label>
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
              <SubmitButton pendingLabel="Saving…" className={`${buttonClass} bg-lime`}>Save page</SubmitButton>
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
                    <div className="min-w-0 flex-1 break-words"><p className="font-bold">{name}</p>
                      <span className="mt-1 inline-block rounded-full border-2 border-ink bg-sun px-2 py-0.5 text-sm">{member.role === "owner" ? "Owner" : "Editor"}</span>
                    </div>
                    <div className="flex w-full flex-wrap gap-3">
                      <form action={setMemberRoleAction.bind(null, slug)} className="w-full sm:w-auto">
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="role" value={member.role === "owner" ? "editor" : "owner"} />
                        <SubmitButton pendingLabel="Updating…" disabled={lastOwner} title={lastOwner ? "Keep at least one owner on your page." : undefined} className={buttonClass}
                          aria-label={`Make ${name} ${member.role === "owner" ? "editor" : "owner"}`}>
                          {member.role === "owner" ? "Make editor" : "Make owner"}
                        </SubmitButton>
                      </form>
                      <form action={removeMemberAction.bind(null, slug)} className="w-full sm:w-auto">
                        <input type="hidden" name="memberId" value={member.id} />
                        <ConfirmSubmit pendingLabel="Removing…" disabled={lastOwner} title={lastOwner ? "Keep at least one owner on your page." : undefined} className={buttonClass} aria-label={`Remove ${name}`}
                          description={`This removes ${name} from the team. They keep their account.`}
                          confirmLabel="Yes, remove">Remove</ConfirmSubmit>
                      </form>
                    </div>
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
          {hasExpiredInvites && <form action={clearExpiredInvitesAction.bind(null, slug)} className="mt-4">
            <SubmitButton pendingLabel="Clearing…" className={buttonClass}>Clear expired</SubmitButton>
          </form>}
          {invites.length === 0 ? <p className="mt-4 text-ink/70">No pending invites.</p> : (
            <ul className="mt-5 space-y-4">
              {invites.map((invite) => (
                <li key={invite.tokenHash} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-4">
                  <div className="min-w-0 max-w-full"><p className="font-bold">{invite.invitedEmail ? `Sent to ${invite.invitedEmail}` : "Link invite"}</p>
                    <p className="text-sm text-ink/70">Created {invite.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC</p>
                    <p className="text-sm text-ink/70">Expires {invite.expiresAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC</p>
                  </div>
                  <form action={revokeInviteAction.bind(null, slug)} className="w-full sm:w-auto">
                    <input type="hidden" name="tokenHash" value={invite.tokenHash} />
                    <ConfirmSubmit pendingLabel="Revoking…" className={buttonClass} aria-label={invite.invitedEmail ? `Revoke invite to ${invite.invitedEmail}` : "Revoke link invite"}
                      description={invite.invitedEmail ? `This revokes the invite to ${invite.invitedEmail}. It can no longer be used to join the team.` : "This revokes the invite link. It can no longer be used to join the team."}
                      confirmLabel="Yes, revoke">Revoke</ConfirmSubmit>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
        <DangerZone slug={slug} />
      </main>
    </div>
  );
}

export { SettingsPage as default };
