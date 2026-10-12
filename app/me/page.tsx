import Image from "next/image";
import Link from "next/link";
import { requireUser, signOut } from "@/lib/auth";
import { getFollowedStartups } from "@/lib/members";
import { updateProfileAction } from "./actions";

const inputClass = "mt-2 w-full rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

async function MePage({ searchParams }: { searchParams: Promise<{ message?: string | string[] }> }) {
  const user = await requireUser("/me");
  const [followedStartups, query] = await Promise.all([getFollowedStartups(user.id), searchParams]);
  const name = user.name?.trim() || user.email.split("@")[0];

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10 sm:py-20">
      <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
        startupfans
      </Link>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-10">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt={`${name}'s avatar`} width={64} height={64} unoptimized referrerPolicy="no-referrer"
              className="h-16 w-16 shrink-0 rounded-full border-[3px] border-ink object-cover" />
          ) : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-display text-2xl font-extrabold">{name.charAt(0).toUpperCase()}</span>}
          <h1 className="min-w-0 break-words font-display text-4xl font-extrabold tracking-tight">Hi, {name}.</h1>
        </div>
        <p className="mt-5 break-words text-lg">Signed in as <strong>{user.email}</strong></p>
        {typeof query.message === "string" && <p role="status" className="mt-5 rounded-xl border-2 border-ink bg-sun p-4">{query.message}</p>}
        <form action={updateProfileAction} className="mt-8 space-y-5">
          <label htmlFor="name" className="block font-bold">Your name <span className="font-normal">(optional)</span>
            <input id="name" name="name" defaultValue={user.name ?? ""} maxLength={60} autoComplete="name" className={inputClass} />
          </label>
          <label htmlFor="avatarUrl" className="block font-bold">Avatar URL <span className="font-normal">(optional)</span>
            <input id="avatarUrl" name="avatarUrl" defaultValue={user.avatarUrl ?? ""} type="url" pattern="https://.*" maxLength={2048} placeholder="https://" className={inputClass} />
          </label>
          <button type="submit" className="rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-bold shadow-sticker">Save profile</button>
        </form>
        <p className="mt-4 text-sm text-ink/70">Your name and avatar are public. Without a name, we show the first part of your email.</p>
        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="rounded-xl border-[3px] border-ink bg-white px-5 py-3 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            Sign out
          </button>
        </form>
      </section>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-10" aria-labelledby="following-heading">
        <h2 id="following-heading" className="font-display text-2xl font-extrabold">Your fan clubs</h2>
        {followedStartups.length === 0 ? <p className="mt-4 text-ink/70">Follow a startup to join its fan club.</p> : (
          <ul className="mt-5 space-y-3">
            {followedStartups.map((startup) => (
              <li key={startup.slug}>
                <Link href={`/s/${startup.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white p-4 hover:bg-lime">
                  <span className="min-w-0 break-words font-bold underline underline-offset-4">{startup.name}</span>
                  <span className="font-mono text-sm font-bold">fan #{String(startup.memberNo).padStart(4, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export { MePage as default };
