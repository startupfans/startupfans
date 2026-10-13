import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { SubNav } from "@/app/components/sub-nav";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getStartupFollow, getStartupFollowOptions } from "@/lib/follows";
import { getPublicStartupPosts } from "@/lib/posts";
import { getStartupBySlug, getStartupFanCount, getStartupMembers } from "@/lib/startups";
import { Composer } from "./composer";
import { FollowButton, StartupFollowButton } from "./follow-button";
import { PostCard } from "./post-card";
import { ProfileHeader } from "./profile-header";

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
  const [follow, followOptions] = await Promise.all([
    user && !isMember ? getStartupFollow(user.id, startup.id) : null,
    user ? getStartupFollowOptions(user.id, startup.id) : [],
  ]);
  const isOwner = members.some((member) => member.id === user?.id && member.role === "owner");

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={user !== null} next={`/s/${slug}`} subNav={
        <SubNav aria-label="Startup navigation" items={[
          { href: `/s/${slug}`, label: "Page", current: true },
          { href: `/s/${slug}/team`, label: "Team" },
          ...(isOwner || isAdmin(user) ? [{ href: `/s/${slug}/settings`, label: "Settings" }] : []),
        ]} />
      } />
      <AppShell className="max-w-6xl">
        <ProfileHeader startup={startup} fanCount={fanCount} isOwner={isOwner} followPanel={
          <>
            {isMember ? (
              <span className="w-full -rotate-3 rounded-xl border-[3px] border-ink bg-lime px-5 py-3 text-center font-display font-extrabold shadow-sticker sm:w-auto">
                On the team
              </span>
            ) : <FollowButton slug={slug} signedIn={user !== null} memberNo={follow?.memberNo ?? null} />}
            {followOptions.length > 0 && <StartupFollowButton slug={slug} startups={followOptions} />}
          </>
        }>
          <div className="mt-8">
            <h2 className="font-display text-xl font-extrabold">The team</h2>
            <ul className="mt-3 flex -space-x-3" aria-label="Team members">
              {members.slice(0, 5).map((member) => {
                const name = member.name?.trim() || member.handle;
                const label = `${name} (@${member.handle})`;
                return (
                  <li key={member.id} className="shrink-0" title={label}>
                    {member.avatarUrl ? (
                      <Image src={member.avatarUrl} alt={label} width={44} height={44} unoptimized referrerPolicy="no-referrer"
                        className="h-11 w-11 rounded-full border-[3px] border-ink bg-cream object-cover" />
                    ) : <span aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-bold">{name.charAt(0).toUpperCase()}</span>}
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
        </ProfileHeader>
        <section className="mt-14 max-w-3xl" aria-label="Startup updates">
          <h2 className="font-display text-2xl font-extrabold">Latest</h2>
          {isMember && <Composer slug={slug} name={user?.name?.trim() || user?.handle || "You"} avatarUrl={user?.avatarUrl ?? null} />}
          <div className="mt-7 space-y-6">
            {posts.length === 0 ? (
              <p className="rounded-2xl border-[3px] border-ink bg-sun p-6 shadow-sticker">No updates yet. Become a fan and follow along.</p>
            ) : posts.map((post) => (
              <PostCard key={post.id} post={post} canDelete={isMember && (isOwner || post.authorId === user?.id)} />
            ))}
          </div>
        </section>
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { StartupPage as default };
