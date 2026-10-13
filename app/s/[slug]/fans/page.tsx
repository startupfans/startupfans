import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { isAdmin } from "@/lib/admin";
import { getPostMembership } from "@/lib/posts";
import { getCurrentUser } from "@/lib/auth";
import { getStartupBySlug, listStartupFans } from "@/lib/startups";

type FansPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ before?: string | string[] }>;
};

export async function generateMetadata({ params }: FansPageProps): Promise<Metadata> {
  const startup = await getStartupBySlug((await params).slug);
  if (!startup) notFound();
  return { title: `Fans of ${startup.name} on startupfans`, description: `The people and startups following ${startup.name}.` };
}

async function FansPage({ params, searchParams }: FansPageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  const userPromise = getCurrentUser();
  const [user, { fans, nextCursor }, member] = await Promise.all([
    userPromise,
    searchParams.then((query) => listStartupFans(startup.id, typeof query.before === "string" ? query.before : undefined)),
    userPromise.then((viewer) => viewer ? getPostMembership(slug, viewer.id) : null),
  ]);

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={user !== null} next={`/s/${slug}/fans`} />
      <AppShell className="max-w-3xl">
        <PageHeader title={<>Fans of {startup.name}</>} tabs={{ label: "Startup navigation", items: [
          { href: `/s/${slug}`, label: "Page" },
          { href: `/s/${slug}/team`, label: "Team" },
          ...(member?.role === "owner" || isAdmin(user) ? [{ href: `/s/${slug}/settings`, label: "Settings" }] : []),
        ] }} />
        {fans.length === 0 ? (
          <p className="mt-8 rounded-2xl border-[3px] border-ink bg-sun p-6 shadow-sticker">No fans yet.</p>
        ) : (
          <ul className="mt-8 space-y-4" aria-label="Fans">
            {fans.map((fan) => {
              const name = fan.name?.trim() || "A fan";
              const details = <>
                {fan.imageUrl ? (
                  <Image src={fan.imageUrl} alt="" width={56} height={56} unoptimized referrerPolicy="no-referrer"
                    className={`h-14 w-14 shrink-0 border-2 border-ink bg-cream ${fan.kind === "startup" ? "rounded-xl object-contain p-1" : "rounded-full object-cover"}`} />
                ) : <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink bg-sky font-display text-2xl font-extrabold ${fan.kind === "startup" ? "rounded-xl" : "rounded-full"}`}>{name.charAt(0).toUpperCase()}</span>}
                <span className="min-w-0">
                  <span className="block font-display text-xl font-extrabold">{name}</span>
                  <span className="mt-1 block font-mono text-sm font-bold">fan #{fan.memberNo}</span>
                </span>
              </>;
              return (
                <li key={`${fan.kind}-${fan.id}`} className="rounded-2xl border-[3px] border-ink bg-white shadow-sticker">
                  {fan.kind === "startup" && fan.slug ? (
                    <Link href={`/s/${fan.slug}`} className="flex min-h-11 min-w-0 items-center gap-4 rounded-xl p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink hover:bg-cream">{details}</Link>
                  ) : <div className="flex min-w-0 items-center gap-4 p-5">{details}</div>}
                </li>
              );
            })}
          </ul>
        )}
        {nextCursor && <div className="mt-8 text-center">
          <Link href={`/s/${slug}/fans?${new URLSearchParams({ before: nextCursor })}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-display font-extrabold shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Load more</Link>
        </div>}
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { FansPage as default };
