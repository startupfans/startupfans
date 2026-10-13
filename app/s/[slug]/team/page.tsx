import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteFooter, Star, TopNav } from "@/app/components/sticker";
import { SubNav } from "@/app/components/sub-nav";
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
  const names = members.slice(0, 3).map((member) => member.name?.trim() || member.email.split("@")[0]);
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
    <main className="mx-auto min-h-screen min-w-0 max-w-6xl break-words px-5 py-10 sm:py-16">
      <TopNav signedIn={user !== null} next={`/s/${slug}/team`} />
      <SubNav aria-label="Startup navigation" items={[
        { href: `/s/${slug}`, label: "Page" },
        { href: `/s/${slug}/team`, label: "Team", current: true },
        ...(isOwner || isAdmin(user) ? [{ href: `/s/${slug}/settings`, label: "Settings" }] : []),
      ]} />
      <header className="relative rounded-3xl border-[3px] border-ink bg-white p-6 shadow-sticker-lg sm:p-10">
        <Star className="pointer-events-none absolute -top-6 right-5 h-12 w-12 rotate-12 text-sun" />
        <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center">
          {startup.logoUrl ? (
            <Image src={startup.logoUrl} alt={`${startup.name} logo`} width={96} height={96} unoptimized
              className="h-24 w-24 shrink-0 -rotate-3 rounded-2xl border-[3px] border-ink bg-cream object-contain p-2 shadow-sticker" />
          ) : (
            <span aria-hidden="true" className="flex h-24 w-24 shrink-0 -rotate-3 items-center justify-center rounded-2xl border-[3px] border-ink bg-sky font-display text-5xl font-extrabold shadow-sticker">
              {startup.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display text-xl font-bold">{startup.name}</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">The team</h1>
            <p className="mt-4 inline-block -rotate-2 rounded-xl border-[3px] border-ink bg-pink px-4 py-2 font-bold shadow-sticker">
              {members.length.toLocaleString("en-GB")} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
      </header>
      <section aria-label="Team members" className="mt-10 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => <MemberCard key={member.id} member={member} />)}
      </section>
      <SiteFooter />
    </main>
  );
}

export { TeamPage as default };
