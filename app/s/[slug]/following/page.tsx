import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/app/components/sticker";
import { AppHeader } from "@/app/components/app-shell";
import { SubNav } from "@/app/components/sub-nav";
import { getCurrentUser } from "@/lib/auth";
import { formatStartupCount, getStartupBySlug, listStartupFollowing } from "@/lib/startups";

type FollowingPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ before?: string | string[] }>;
};

export async function generateMetadata({ params }: FollowingPageProps): Promise<Metadata> {
  const startup = await getStartupBySlug((await params).slug);
  if (!startup) notFound();
  return { title: `${startup.name} is following on startupfans`, description: `The startups ${startup.name} follows.` };
}

async function FollowingPage({ params, searchParams }: FollowingPageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const { startups: following, nextCursor } = await listStartupFollowing(startup.id, typeof query.before === "string" ? query.before : undefined);

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={user !== null} next={`/s/${slug}/following`} subNav={
        <SubNav aria-label="Startup navigation" items={[
          { href: `/s/${slug}`, label: "Page" },
          { href: `/s/${slug}/team`, label: "Team" },
        ]} />
      } />
      <main className="mx-auto min-w-0 max-w-3xl break-words px-5 pb-10 sm:pb-16">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{startup.name} is following</h1>
        <p className="mt-4 font-mono text-sm font-bold">{formatStartupCount(startup.followingCount, "startup")}</p>
        {following.length === 0 ? (
          <p className="mt-8 rounded-2xl border-[3px] border-ink bg-sun p-6 shadow-sticker">No startups followed yet.</p>
        ) : (
          <ul className="mt-8 space-y-4" aria-label="Followed startups">
            {following.map((fanClub) => (
              <li key={fanClub.id} className="rounded-2xl border-[3px] border-ink bg-white shadow-sticker">
                <Link href={`/s/${fanClub.slug}`} className="flex min-h-11 min-w-0 items-start gap-4 rounded-xl p-5 hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
                  {fanClub.logoUrl ? (
                    <Image src={fanClub.logoUrl} alt="" width={56} height={56} unoptimized
                      className="h-14 w-14 shrink-0 rounded-xl border-2 border-ink bg-cream object-contain p-1" />
                  ) : <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sky font-display text-2xl font-extrabold">{fanClub.name.charAt(0).toUpperCase()}</span>}
                  <span className="min-w-0">
                    <span className="block font-display text-xl font-extrabold">{fanClub.name}</span>
                    {fanClub.tagline && <span className="mt-1 block text-ink/80">{fanClub.tagline}</span>}
                    <span className="mt-2 block font-mono text-sm font-bold">{formatStartupCount(fanClub.fanCount, "fan")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {nextCursor && <div className="mt-8 text-center">
          <Link href={`/s/${slug}/following?${new URLSearchParams({ before: nextCursor })}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-display font-extrabold shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Load more</Link>
        </div>}
        <SiteFooter />
      </main>
    </div>
  );
}

export { FollowingPage as default };
