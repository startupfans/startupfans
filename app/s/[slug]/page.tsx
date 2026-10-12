import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading, Star } from "@/app/components/sticker";
import { getCurrentUser } from "@/lib/auth";
import { getStartupFollow } from "@/lib/follows";
import { getStartupBySlug, getStartupFanCount, getStartupMembers, getStartupPosts } from "@/lib/startups";
import { FollowButton } from "./follow-button";

type StartupPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: StartupPageProps): Promise<Metadata> {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  return { title: `${startup.name} on startupfans`, description: startup.tagline ?? "" };
}

async function StartupPage({ params }: StartupPageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const [user, members, posts, fanCount] = await Promise.all([
    getCurrentUser(), getStartupMembers(startup.id), getStartupPosts(startup.id), getStartupFanCount(startup.id),
  ]);
  const follow = user ? await getStartupFollow(user.id, startup.id) : null;
  const isMember = members.some((member) => member.id === user?.id);
  const stageLabel = startup.stage === "series-a" ? "Series A" : startup.stage
    ? startup.stage.charAt(0).toUpperCase() + startup.stage.slice(1) : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10 sm:py-16">
      <nav className="flex items-center justify-between gap-4" aria-label="Main navigation">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">startupfans</Link>
        <Link href={user ? "/me" : `/login?next=/s/${slug}`} className="font-bold underline underline-offset-4">{user ? "Your account" : "Sign in"}</Link>
      </nav>
      <section className="relative mt-10 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-sticker-lg sm:p-10" aria-labelledby="startup-name">
        <Star className="absolute -top-6 right-5 h-12 w-12 rotate-12 text-sun sm:h-16 sm:w-16" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {startup.logoUrl ? (
            <Image src={startup.logoUrl} alt={`${startup.name} logo`} width={112} height={112} unoptimized
              className="h-28 w-28 shrink-0 -rotate-3 rounded-2xl border-[3px] border-ink bg-cream object-contain p-2 shadow-sticker" />
          ) : (
            <span aria-hidden="true" className="flex h-28 w-28 shrink-0 -rotate-3 items-center justify-center rounded-2xl border-[3px] border-ink bg-sky font-display text-6xl font-extrabold shadow-sticker">
              {startup.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 id="startup-name" className="break-words font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{startup.name}</h1>
            {startup.tagline && <p className="mt-3 break-words text-xl text-ink/80">{startup.tagline}</p>}
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
              {stageLabel && <span className="rounded-full border-2 border-ink bg-sun px-3 py-1">{stageLabel}</span>}
              {startup.teamSize !== null && <span className="rounded-full border-2 border-ink bg-cream px-3 py-1">{startup.teamSize.toLocaleString("en-GB")} {startup.teamSize === 1 ? "person" : "people"}</span>}
            </div>
          </div>
        </div>
        {startup.description && <p className="mt-7 whitespace-pre-wrap break-words leading-relaxed text-ink/80">{startup.description}</p>}
        <div className="mt-6 flex flex-wrap gap-5 font-bold">
          {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Visit website ↗</a>}
          {isMember && <Link href={`/s/${slug}/settings`} className="underline underline-offset-4">Settings</Link>}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-5 border-t-2 border-ink/15 pt-6">
          <FollowButton slug={slug} signedIn={user !== null} memberNo={follow?.memberNo ?? null} />
          <p className="font-mono text-sm font-bold">{fanCount.toLocaleString("en-GB")} {fanCount === 1 ? "fan" : "fans"}</p>
        </div>
        <div className="mt-8">
          <h2 className="font-display text-xl font-extrabold">The team</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {members.map((member) => (
              <li key={member.id} className="max-w-full break-words rounded-xl border-2 border-ink bg-cream px-3 py-2 text-sm font-semibold">
                {member.name?.trim() || member.email.split("@")[0]}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mt-14" aria-label="Startup updates">
        <SectionHeading eyebrow="From the team" title="The latest." />
        <div className="mt-7 space-y-6">
          {posts.length === 0 ? (
            <p className="rounded-2xl border-[3px] border-ink bg-sun p-6 shadow-sticker">No updates yet. Become a fan and follow along.</p>
          ) : posts.map((post) => (
            <article key={post.id} className="rounded-2xl border-[3px] border-ink bg-white p-6 shadow-sticker">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
                <span>{post.authorName?.trim() || post.authorEmail.split("@")[0]}</span>
                <time dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed">{post.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export { StartupPage as default };
