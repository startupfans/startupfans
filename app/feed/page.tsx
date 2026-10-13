import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, Sticker, TopNav } from "@/app/components/sticker";
import { SubNav } from "@/app/components/sub-nav";
import { PostCard } from "@/app/s/[slug]/post-card";
import { getCurrentUser } from "@/lib/auth";
import { listFeed } from "@/lib/posts";

export function generateMetadata(): Metadata {
  return { title: "Startup feed", description: "The latest updates from startup teams. Follow along as they build." };
}

export default async function FeedPage({ searchParams }: {
  searchParams: Promise<{ filter?: string | string[]; before?: string | string[] }>;
}) {
  const [query, user] = await Promise.all([searchParams, getCurrentUser()]);
  const following = query.filter === "following";
  const needsSignIn = following && !user;
  const followingLogin = `/login?next=${encodeURIComponent("/feed?filter=following")}`;
  const { posts, nextCursor } = await listFeed({
    userId: user?.id,
    following,
    cursor: typeof query.before === "string" ? query.before : undefined,
  });
  const moreParams = new URLSearchParams();
  if (following) moreParams.set("filter", "following");
  if (nextCursor) moreParams.set("before", nextCursor);
  const pillClass = "inline-flex min-h-11 w-full items-center justify-center rounded-full border-[3px] border-ink px-5 py-2 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:w-auto";

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-3xl break-words px-5 py-10 sm:py-16">
      <TopNav signedIn={user !== null} next={following ? "/feed?filter=following" : "/feed"} />
      <SubNav aria-label="Feed filter" items={[
        { href: "/feed", label: "Everyone", current: !following },
        { href: user ? "/feed?filter=following" : followingLogin, label: "Following", current: following },
      ]} />
      <header>
        <Sticker className="inline-block -rotate-3 bg-lime normal-case">From the teams</Sticker>
        <h1 className="mt-7 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">The latest.</h1>
        <p className="mt-4 text-lg text-ink/80">See what startup teams are building and sharing.</p>
      </header>
      <section className="mt-8 space-y-6" aria-label={following ? "Updates from startups you follow" : "Updates from all startups"}>
        {needsSignIn ? (
          <div className="rounded-2xl border-[3px] border-ink bg-sky p-6 shadow-sticker">
            <h2 className="font-display text-xl font-extrabold">Follow your favourites.</h2>
            <p className="mt-2">Sign in to see updates from the startups you follow.</p>
            <Link href={followingLogin} className="mt-4 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Sign in</Link>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border-[3px] border-ink bg-sun p-6 shadow-sticker">
            <h2 className="font-display text-xl font-extrabold">No updates yet.</h2>
            <p className="mt-2">{following ? "Follow startups from their pages to see their updates here." : "Startup teams will share their updates here."}</p>
            {following && <Link href="/feed" className="mt-4 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Find startups in Everyone</Link>}
            {!following && <Link href="/start" className="mt-4 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Start your fan club</Link>}
          </div>
        ) : posts.map((post) => <PostCard key={post.id} post={post} showStartup />)}
      </section>
      {nextCursor && (
        <div className="mt-8 text-center">
          <Link href={`/feed?${moreParams}`} className={`${pillClass} bg-lime`}>Load more</Link>
        </div>
      )}
      <SiteFooter />
    </main>
  );
}
