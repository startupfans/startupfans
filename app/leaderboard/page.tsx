import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading, Sticker, TopNav } from "@/app/components/sticker";
import { getCurrentUser } from "@/lib/auth";
import { getMostActive, getMostFollowed, type LeaderboardStartup } from "@/lib/leaderboard";

export function generateMetadata(): Metadata {
  return {
    title: "Leaderboard",
    description: "Meet the most followed startups and the teams sharing the most this week.",
  };
}

const rankColors = ["bg-sun", "bg-sky", "bg-lime"];

function LeaderboardList({ startups, singular, plural, suffix = "", emptyMessage }: {
  startups: LeaderboardStartup[];
  singular: string;
  plural: string;
  suffix?: string;
  emptyMessage: string;
}) {
  if (startups.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border-[3px] border-ink bg-white p-6 shadow-sticker">
        <p>{emptyMessage}</p>
        <Link href="/feed" className="mt-4 inline-block font-bold underline underline-offset-4">Explore the feed</Link>
      </div>
    );
  }

  return (
    <ol className="mt-6 space-y-4">
      {startups.map((startup, index) => (
        <li key={startup.id} className="flex items-start gap-3 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-sticker sm:gap-4 sm:p-5">
          <span className={`inline-block shrink-0 -rotate-3 rounded-xl border-[3px] border-ink px-2 py-1 font-display text-sm font-extrabold shadow-sticker ${rankColors[index] ?? "bg-white"}`}>
            #{index + 1}
          </span>
          {startup.logoUrl ? (
            <Image src={startup.logoUrl} alt="" width={44} height={44} unoptimized
              className="h-11 w-11 shrink-0 rotate-3 rounded-xl border-2 border-ink bg-cream object-contain p-1" />
          ) : (
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 rotate-3 items-center justify-center rounded-xl border-2 border-ink bg-sky font-display text-xl font-extrabold">
              {startup.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 break-words">
            <Link href={`/s/${startup.slug}`} className="font-display text-xl font-extrabold underline underline-offset-4">
              {startup.name}
            </Link>
            {startup.tagline && <p className="mt-1 text-sm text-ink/70">{startup.tagline}</p>}
            <p className="mt-2 text-sm font-bold">
              {startup.count.toLocaleString("en-GB")} {startup.count === 1 ? singular : plural}{suffix}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  const [mostFollowed, mostActive] = await Promise.all([getMostFollowed(), getMostActive()]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 sm:py-16">
      <TopNav signedIn={user !== null} next="/leaderboard" />
      <header className="mt-10">
        <Sticker className="inline-block -rotate-3 bg-pink normal-case">Fan favourites</Sticker>
        <h1 className="mt-7 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Leaderboard</h1>
        <p className="mt-4 text-lg text-ink/80">See who fans follow and who&apos;s sharing this week.</p>
      </header>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section className="min-w-0" aria-label="Most followed startups">
          <SectionHeading eyebrow="The fan clubs" title="Most followed" />
          <LeaderboardList startups={mostFollowed} singular="fan" plural="fans"
            emptyMessage="No fans yet. Follow a startup to help its fan club grow." />
        </section>
        <section className="min-w-0" aria-label="Most active startups this week">
          <SectionHeading eyebrow="The last 7 days" title="Most active this week" />
          <LeaderboardList startups={mostActive} singular="post" plural="posts" suffix=" this week"
            emptyMessage="No posts this week. Fresh updates will appear here as teams share." />
        </section>
      </div>
    </main>
  );
}
