import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getStartupBySlug, getTeam } from "@/lib/startups";
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
  const [user, members] = await Promise.all([getCurrentUser(), getTeam(startup.id)]);
  const isOwner = members.some((member) => member.id === user?.id && member.role === "owner");

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
              <Image src={startup.logoUrl} alt={`${startup.name} logo`} width={48} height={48} unoptimized
                className="h-12 w-12 shrink-0 -rotate-3 rounded-xl border-[3px] border-ink bg-cream object-contain p-1 shadow-sticker" />
            ) : (
              <span role="img" aria-label={startup.name} className="flex h-12 w-12 shrink-0 -rotate-3 items-center justify-center rounded-xl border-[3px] border-ink bg-sky font-display text-2xl font-extrabold shadow-sticker">
                {startup.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        } />
        <section aria-label="Team members" className="mt-10 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => <MemberCard key={member.id} member={member} />)}
        </section>
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { TeamPage as default };
