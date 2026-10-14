import { ProfileImage } from "@/app/components/profile-image";
import Link from "next/link";
import { Handle } from "@/app/components/handle";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { SignOutButton } from "@/app/login/dev-inbox";
import { requireUser, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getFollowedStartups, getMemberStartups } from "@/lib/members";
import { listAllStartups } from "@/lib/startups";
import { ProfileForm } from "./profile-form";
import { AllStartups, YourStartups } from "./startup-cards";

const messages = new Map([
  ["startup-deleted", "Startup deleted."],
]);

async function MePage({ searchParams }: { searchParams: Promise<{ message?: string | string[] }> }) {
  const user = await requireUser("/me");
  const [memberStartups, followedStartups, allStartups, query] = await Promise.all([
    getMemberStartups(user.id), getFollowedStartups(user.id),
    isAdmin(user) ? listAllStartups() : Promise.resolve(null), searchParams,
  ]);
  const name = user.name?.trim() || user.handle;
  const message = typeof query.message === "string" ? messages.get(query.message) : undefined;

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn next="/me" />
      <AppShell className="max-w-xl">
        <PageHeader title={<span className="min-w-0 max-w-full">Hi, {name}</span>} metadata={
          <div className="min-w-0 max-w-full">
            <Handle handle={user.handle} />
            <p className="text-xs text-ink/70">Handles are permanent.</p>
          </div>
        } identity={
          <>
            {user.avatarUrl ? (
              <ProfileImage src={user.avatarUrl} alt={`${name}'s avatar`} width={64} height={64} sizes="64px" referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-full border-[3px] border-ink object-cover" />
            ) : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-display text-2xl font-extrabold">{name.charAt(0).toUpperCase()}</span>}
          </>
        } />
        <YourStartups startups={memberStartups} />
        <section className="mt-10 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-10">
          <p className="break-words text-lg">Signed in as <strong>{user.email}</strong></p>
          {message && <p role="status" className="mt-5 rounded-xl border-2 border-ink bg-sun p-4">{message}</p>}
          <ProfileForm
            userId={user.id}
            avatarInitial={name.charAt(0).toUpperCase()}
            uploadsEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
            values={{
              name: user.name ?? "",
              avatarUrl: user.avatarUrl ?? "",
              xHandle: user.xHandle ?? "",
              linkedinUrl: user.linkedinUrl ?? "",
              githubUrl: user.githubUrl ?? "",
              instagramHandle: user.instagramHandle ?? "",
              youtubeUrl: user.youtubeUrl ?? "",
              tiktokHandle: user.tiktokHandle ?? "",
            }}
          />
          <p className="mt-4 text-sm text-ink/70">Your name, handle, avatar and social links are public. Without a name, we show your handle.</p>
        </section>
        <section className="mt-10" aria-labelledby="following-heading">
          <h2 id="following-heading" className="font-display text-2xl font-extrabold">Your fan clubs</h2>
          {followedStartups.length === 0 ? <p className="mt-4 text-ink/70">Follow a startup to join its fan club.</p> : (
            <ul className="mt-5 space-y-3">
              {followedStartups.map((startup) => (
                <li key={startup.slug}>
                  <Link href={`/s/${startup.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white p-4 hover:bg-lime">
                    <span className="min-w-0 break-words font-bold underline underline-offset-4">{startup.name}</span>
                    <span className="min-w-0 break-words font-mono text-sm font-bold">fan #{String(startup.memberNo).padStart(4, "0")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {allStartups && <AllStartups list={allStartups} />}
        <SignOutButton action={signOut} />
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { MePage as default };
