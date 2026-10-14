"use client";

import { ProfileImage } from "@/app/components/profile-image";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Composer } from "@/app/s/[slug]/composer";

type PostingStartup = { name: string; slug: string; logoUrl: string | null };

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getServerChoice() {
  return null;
}

export function FeedComposer({ startups, userId, name, avatarUrl }: {
  startups: PostingStartup[];
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const storageKey = `startupfans:feed-post-as:${userId}`;
  const savedSlug = useSyncExternalStore(subscribeToStorage, () => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, getServerChoice);
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startup = startups.find(({ slug }) => slug === (chosenSlug ?? savedSlug)) ?? startups[0];
  if (!startup) return null;

  function chooseStartup(slug: string) {
    setChosenSlug(slug);
    try {
      window.localStorage.setItem(storageKey, slug);
    } catch {
      // Keep the selection available when browser storage is unavailable.
    }
  }

  function posted() {
    if (window.location.search) router.replace("/feed", { scroll: false });
    else router.refresh();
  }

  const logo = startup.logoUrl ? (
    <ProfileImage src={startup.logoUrl} alt="" width={20} height={20} sizes="20px" referrerPolicy="no-referrer"
      className="h-5 w-5 shrink-0 rounded-full border border-ink object-cover" />
  ) : (
    <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink bg-sun text-xs font-bold">
      {startup.name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <section aria-label="Post an update" className="mt-8 min-w-0 [&>form]:mt-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <label htmlFor={startups.length > 1 ? "feed-post-as" : undefined} className="shrink-0 text-sm font-bold">Post as</label>
        {startups.length === 1 ? (
          <span className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-full border-[3px] border-ink bg-sun px-3 py-2 font-display font-extrabold shadow-sticker">
            {logo}<span className="truncate">{startup.name}</span>
          </span>
        ) : (
          <div className="relative min-w-0 max-w-full rounded-full bg-sun shadow-sticker">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">{logo}</span>
            <select id="feed-post-as" value={startup.slug} disabled={busy}
              onChange={(event) => chooseStartup(event.target.value)}
              className="h-11 w-full min-w-0 max-w-full rounded-full border-[3px] border-ink bg-transparent pr-3 pl-10 font-display font-extrabold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-60">
              {startups.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <Composer key={startup.slug} slug={startup.slug} name={name} avatarUrl={avatarUrl}
        onPosted={posted} onBusyChange={setBusy} />
    </section>
  );
}
