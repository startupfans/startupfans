import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDeleteStartup, SectionHeading, SiteFooter, Star, TopNav } from "@/app/components/sticker";
import { getCurrentUser } from "@/lib/auth";
import { getStartupFollow } from "@/lib/follows";
import { getPublicStartupPosts } from "@/lib/posts";
import { getStartupBySlug, getStartupFanCount, getStartupMembers } from "@/lib/startups";
import { Composer } from "./composer";
import { FollowButton } from "./follow-button";
import { PostCard } from "./post-card";

type StartupPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: StartupPageProps): Promise<Metadata> {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  return { title: `${startup.name} on startupfans`, ...(startup.tagline ? { description: startup.tagline } : {}) };
}

async function StartupPage({ params }: StartupPageProps) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const [user, members, posts, fanCount] = await Promise.all([
    getCurrentUser(), getStartupMembers(startup.id), getPublicStartupPosts(startup.id), getStartupFanCount(startup.id),
  ]);
  const isMember = members.some((member) => member.id === user?.id);
  const follow = user && !isMember ? await getStartupFollow(user.id, startup.id) : null;
  const isOwner = members.some((member) => member.id === user?.id && member.role === "owner");
  const stageLabel = startup.stage === "series-a" ? "Series A" : startup.stage
    ? startup.stage.charAt(0).toUpperCase() + startup.stage.slice(1) : null;

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-6xl break-words px-5 py-10 sm:py-16">
      <TopNav signedIn={user !== null} next={`/s/${slug}`} />
      <section className="relative mt-10 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-sticker-lg sm:p-10" aria-labelledby="startup-name">
        <Star className="pointer-events-none absolute -top-6 right-5 h-12 w-12 rotate-12 text-sun" />
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
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
                  {stageLabel && <span className="w-full rounded-full border-2 border-ink bg-sun px-3 py-1 text-center sm:w-auto">{stageLabel}</span>}
                  {startup.teamSize !== null && <span className="w-full rounded-full border-2 border-ink bg-cream px-3 py-1 text-center sm:w-auto">{startup.teamSize.toLocaleString("en-GB")} {startup.teamSize === 1 ? "person" : "people"}</span>}
                </div>
              </div>
            </div>
            {startup.description && <p className="mt-7 max-w-[65ch] whitespace-pre-wrap break-words leading-relaxed text-ink/80">{startup.description}</p>}
            <div className="mt-6 flex flex-wrap gap-5 font-bold">
              {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center py-2 underline underline-offset-4">Visit website ↗</a>}
              {isOwner && <Link href={`/s/${slug}/settings`} className="inline-flex min-h-11 items-center py-2 underline underline-offset-4">Settings</Link>}
            </div>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-5 border-t-2 border-ink/15 pt-6 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-6">
            {isMember ? (
              <span className="w-full -rotate-3 rounded-xl border-[3px] border-ink bg-lime px-5 py-3 text-center font-display font-extrabold shadow-sticker sm:w-auto">
                On the team
              </span>
            ) : <FollowButton slug={slug} signedIn={user !== null} memberNo={follow?.memberNo ?? null} />}
            <p className="font-mono text-sm font-bold">{fanCount.toLocaleString("en-GB")} {fanCount === 1 ? "fan" : "fans"}</p>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="font-display text-xl font-extrabold">The team</h2>
          <ul className="mt-3 flex -space-x-3" aria-label="Team members">
            {members.slice(0, 5).map((member) => {
              const name = member.name?.trim() || member.email.split("@")[0];
              return (
                <li key={member.id} className="shrink-0" title={name}>
                  {member.avatarUrl ? (
                    <Image src={member.avatarUrl} alt={name} width={44} height={44} unoptimized referrerPolicy="no-referrer"
                      className="h-11 w-11 rounded-full border-[3px] border-ink bg-cream object-cover" />
                  ) : <span aria-label={name} className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-bold">{name.charAt(0).toUpperCase()}</span>}
                </li>
              );
            })}
            {members.length > 5 && (
              <li aria-label={`${members.length - 5} more team members`} className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sky px-2 text-sm font-bold">
                +{members.length - 5}
              </li>
            )}
          </ul>
          <p className="mt-3 text-sm text-ink/70">Everyone on the team posts here.</p>
          <Link href={`/s/${slug}/team`} className="mt-2 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Meet the team</Link>
        </div>
        <AdminDeleteStartup slug={slug} />
      </section>
      <section className="mx-auto mt-14 max-w-3xl" aria-label="Startup updates">
        <SectionHeading eyebrow="From the team" title="The latest." />
        {isMember && <Composer slug={slug} name={user?.name?.trim() || user?.email.split("@")[0] || "You"} avatarUrl={user?.avatarUrl ?? null} />}
        <div className="mt-7 space-y-6">
          {posts.length === 0 ? (
            <p className="rounded-2xl border-[3px] border-ink bg-sun p-6 shadow-sticker">No updates yet. Become a fan and follow along.</p>
          ) : posts.map((post) => (
            <PostCard key={post.id} post={post} canDelete={isMember && (isOwner || post.authorId === user?.id)} />
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

export { StartupPage as default };
