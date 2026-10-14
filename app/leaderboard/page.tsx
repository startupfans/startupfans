import type { Metadata } from "next";
import { ProfileImage } from "@/app/components/profile-image";
import Link from "next/link";
import { PageHeader } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
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
        <Link href="/feed" className="mt-4 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Explore the feed</Link>
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
            <ProfileImage src={startup.logoUrl} alt="" width={44} height={44} sizes="44px"
              className="h-11 w-11 shrink-0 rotate-3 rounded-xl border-2 border-ink bg-cream object-contain p-1" />
          ) : (
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 rotate-3 items-center justify-center rounded-xl border-2 border-ink bg-sky font-display text-xl font-extrabold">
              {startup.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 break-words">
            <Link href={`/s/${startup.slug}`} className="inline-block min-h-11 max-w-full py-2 font-display text-xl font-extrabold underline underline-offset-4">
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
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={user !== null} next="/leaderboard" />
      <AppShell className="max-w-6xl">
        <PageHeader title="Leaderboard" />
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section className="min-w-0" aria-label="Most followed startups">
            <h2 className="font-display text-2xl font-extrabold">Most followed</h2>
            <LeaderboardList startups={mostFollowed} singular="fan" plural="fans"
              emptyMessage="No fans yet. Follow a startup to help its fan club grow." />
          </section>
          <section className="min-w-0" aria-label="Most active startups this week">
            <h2 className="font-display text-2xl font-extrabold">Most active this week</h2>
            <LeaderboardList startups={mostActive} singular="post" plural="posts" suffix=" this week"
              emptyMessage="No posts this week. Fresh updates will appear here as teams share." />
          </section>
        </div>
      </AppShell>
    </div>
  );
}
