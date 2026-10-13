import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Handle } from "@/app/components/handle";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { PostCard } from "@/app/s/[slug]/post-card";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUser } from "@/lib/users";

const roleLabels = { owner: "Owner", editor: "Editor" };

type UserPageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicUser(handle);
  if (!profile) notFound();
  const name = profile.name?.trim();
  const label = name ? `${name} (@${profile.handle})` : `@${profile.handle}`;
  return { title: `${label} on startupfans`, description: `See ${label}'s startups, fan clubs and latest public posts.` };
}

export async function UserPage({ params }: UserPageProps) {
  const { handle } = await params;
  const [profile, viewer] = await Promise.all([getPublicUser(handle), getCurrentUser()]);
  if (!profile) notFound();
  const name = profile.name?.trim() || profile.handle;
  const joined = profile.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={viewer !== null} next={`/u/${profile.handle}`} />
      <AppShell className="max-w-3xl">
        <PageHeader title={<><span className="min-w-0 max-w-full">{name}</span><Handle handle={profile.handle} /></>} identity={
          <>
            {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={80} height={80} unoptimized referrerPolicy="no-referrer"
              className="h-20 w-20 shrink-0 rounded-full border-[3px] border-ink object-cover" />
              : <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-display text-3xl font-extrabold">{name.charAt(0).toUpperCase()}</span>}
          </>
        } />
        <p className="text-sm text-ink/70">Joined <time dateTime={profile.createdAt.toISOString()}>{joined}</time></p>
        <div className="mt-8 grid min-w-0 gap-8 md:grid-cols-2">
          <section aria-labelledby="startups-heading" className="min-w-0 rounded-3xl border-[3px] border-ink bg-lime p-5 shadow-sticker">
            <h2 id="startups-heading" className="font-display text-2xl font-extrabold">Startups</h2>
            {profile.memberStartups.length === 0 ? <p className="mt-4 text-ink/70">No startups yet.</p> : <ul className="mt-4 space-y-3">
              {profile.memberStartups.map((startup) => <li key={startup.slug}>
                <Link href={`/s/${startup.slug}`} className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white p-3 hover:bg-cream">
                  <span className="min-w-0 break-words font-bold underline underline-offset-4">{startup.name}</span>
                  <span className="rounded-full border-2 border-ink bg-sky px-3 py-1 text-sm font-bold">{roleLabels[startup.role]}</span>
                </Link>
              </li>)}
            </ul>}
          </section>
          <section aria-labelledby="fans-heading" className="min-w-0 rounded-3xl border-[3px] border-ink bg-cream p-5 shadow-sticker">
            <h2 id="fans-heading" className="font-display text-2xl font-extrabold">Fan clubs</h2>
            {profile.followedStartups.length === 0 ? <p className="mt-4 text-ink/70">No fan clubs yet.</p> : <ul className="mt-4 space-y-3">
              {profile.followedStartups.map((startup) => <li key={startup.slug}>
                <Link href={`/s/${startup.slug}`} className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white p-3 hover:bg-lime">
                  <span className="min-w-0 break-words font-bold underline underline-offset-4">{startup.name}</span>
                  <span className="font-mono text-sm">Fan #{String(startup.memberNo).padStart(4, "0")}</span>
                </Link>
              </li>)}
            </ul>}
          </section>
        </div>
        <section className="mt-10" aria-labelledby="posts-heading">
          <h2 id="posts-heading" className="font-display text-2xl font-extrabold">Latest posts</h2>
          {profile.posts.length === 0 ? <p className="mt-4 text-ink/70">No public posts yet.</p> : <div className="mt-5 space-y-6">
            {profile.posts.map((post) => <PostCard key={post.id} post={post} showStartup />)}
          </div>}
        </section>
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { UserPage as default };
