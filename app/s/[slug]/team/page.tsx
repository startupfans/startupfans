import type { Metadata } from "next";
import Link from "next/link";
import { ProfileImage } from "@/app/components/profile-image";
import { notFound } from "next/navigation";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { countPendingTeamJoinRequests, getTeamJoinAllowance } from "@/lib/team-requests";
import { getStartupBySlug, getTeam } from "@/lib/startups";
import { JoinRequestCard } from "./join-request";
import { MemberCard } from "./member-card";

type TeamPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  const members = await getTeam(startup.id);
  const names = members.slice(0, 3).map((member) => member.name?.trim() || member.handle);
  return {
    title: `${startup.name} team on startupfans`,
    description: names.length ? `Meet the people behind ${startup.name}: ${names.join(", ")}.` : `Meet the team behind ${startup.name}.`,
  };
}

async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  const userPromise = getCurrentUser();
  const [user, members, pendingRequests, decision] = await Promise.all([
    userPromise,
    getTeam(startup.id),
    countPendingTeamJoinRequests(startup.id),
    userPromise.then((current) => current ? getTeamJoinAllowance(current.id, startup.id) : null),
  ]);
  const isOwner = members.some((member) => member.id === user?.id && member.role === "owner");
  const showReview = (isOwner || isAdmin(user)) && pendingRequests > 0;
  const showRequest = !decision || decision.block !== "member";

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={user !== null} next={`/s/${slug}/team`} />
      <AppShell className="max-w-6xl">
        <PageHeader title={<span className="min-w-0 max-w-full">{startup.name} team</span>} metadata={
          <span className="font-mono text-sm font-bold">{members.length.toLocaleString("en-GB")} {members.length === 1 ? "member" : "members"}</span>
        } tabs={{ label: "Startup navigation", items: [
          { href: `/s/${slug}`, label: "Page" },
          { href: `/s/${slug}/team`, label: "Team", current: true },
          ...(isOwner || isAdmin(user) ? [{ href: `/s/${slug}/settings`, label: "Settings" }] : []),
        ] }} identity={
          <div className="hidden shrink-0 sm:block">
            {startup.logoUrl ? (
              <ProfileImage src={startup.logoUrl} alt={`${startup.name} logo`} width={48} height={48} sizes="48px"
                className="h-12 w-12 shrink-0 -rotate-3 rounded-xl border-[3px] border-ink bg-cream object-contain p-1 shadow-sticker" />
            ) : (
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 -rotate-3 items-center justify-center rounded-xl border-[3px] border-ink bg-sky font-display text-2xl font-extrabold shadow-sticker">
                {startup.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        } />
        {(showReview || showRequest) && (
          <div className="mt-10 space-y-6">
            {showReview && (
              <p className="rounded-xl border-2 border-ink bg-sky px-4 py-3 shadow-sticker">
                {pendingRequests.toLocaleString("en-GB")} {pendingRequests === 1 ? "person has" : "people have"} asked to join.{" "}
                <Link href={`/s/${slug}/settings#join-requests`} className="font-bold underline">Review them in settings.</Link>
              </p>
            )}
            {showRequest && <JoinRequestCard slug={slug} decision={decision} />}
          </div>
        )}
        <section aria-label="Team members" className="mt-10 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => <MemberCard key={member.id} member={member} />)}
        </section>
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { TeamPage as default };
