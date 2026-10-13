import Image from "next/image";
import Link from "next/link";
import type { getMemberStartups } from "@/lib/members";
import type { listAllStartups } from "@/lib/startups";

type MemberStartup = Awaited<ReturnType<typeof getMemberStartups>>[number];
const roleLabels = { owner: "Owner", editor: "Editor" } satisfies Record<MemberStartup["role"], string>;
const buttonClass = "inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-ink px-4 py-2 text-center font-bold shadow-sticker transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:w-auto";
const linkClass = "inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

function StartupLogo({ startup }: { startup: { name: string; logoUrl: string | null } }) {
  return startup.logoUrl ? (
    <Image src={startup.logoUrl} alt="" width={48} height={48} unoptimized referrerPolicy="no-referrer"
      className="h-12 w-12 shrink-0 rounded-xl border-2 border-ink bg-white object-cover" />
  ) : (
    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sun font-display text-xl font-extrabold">
      {startup.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function YourStartups({ startups }: { startups: MemberStartup[] }) {
  return (
    <section className="mt-10" aria-labelledby="startups-heading">
      <h2 id="startups-heading" className="font-display text-2xl font-extrabold">Your startups</h2>
      {startups.length === 0 ? (
        <>
          <p className="mt-4 text-ink/70">You&apos;re not on a team yet.</p>
          <Link href="/start" className={`${buttonClass} mt-5 bg-pink`}>Start a startup</Link>
        </>
      ) : (
        <>
          <ul className="mt-5 space-y-5">
            {startups.map((startup) => (
              <li key={startup.slug} className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-sticker sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <StartupLogo startup={startup} />
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-display text-xl font-extrabold">{startup.name}</h3>
                    {startup.tagline && <p className="mt-1 break-words text-sm text-ink/70">{startup.tagline}</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border-2 border-ink bg-sky px-3 py-1 text-sm font-bold">{roleLabels[startup.role]}</span>
                  <span className="font-mono text-sm">{startup.fanCount.toLocaleString("en-GB")} {startup.fanCount === 1 ? "fan" : "fans"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/s/${startup.slug}`} className={`${buttonClass} bg-cream`}>Open page</Link>
                  <Link href={`/s/${startup.slug}#post-body`} className={`${buttonClass} bg-pink`}>Post an update</Link>
                  {startup.role === "owner" && <Link href={`/s/${startup.slug}/settings`} className={`${buttonClass} bg-white`}>Settings</Link>}
                </div>
              </li>
            ))}
          </ul>
          <Link href="/start" className={`${linkClass} mt-4`}>Start another</Link>
        </>
      )}
    </section>
  );
}

export function AllStartups({ list }: { list: Awaited<ReturnType<typeof listAllStartups>> }) {
  return (
    <section className="mt-10 rounded-3xl border-[3px] border-ink bg-sun p-6 shadow-sticker-lg sm:p-10" aria-labelledby="all-startups-heading">
      <h2 id="all-startups-heading" className="font-display text-2xl font-extrabold">All startups</h2>
      {list.capped && <p className="mt-3 text-sm text-ink/70">Showing the newest 200 startups.</p>}
      {list.startups.length === 0 ? <p className="mt-4 text-ink/70">No startups yet.</p> : (
        <ul className="mt-5 space-y-3">
          {list.startups.map((startup) => (
            <li key={startup.slug} className="min-w-0 rounded-xl border-2 border-ink bg-white p-4">
              <div className="flex min-w-0 items-start gap-3">
                <StartupLogo startup={startup} />
                <div className="min-w-0 flex-1">
                  <Link href={`/s/${startup.slug}`} className={`${linkClass} max-w-full`}><span className="min-w-0 break-words">{startup.name}</span></Link>
                  <p className="text-sm text-ink/70">
                    {startup.fanCount.toLocaleString("en-GB")} {startup.fanCount === 1 ? "fan" : "fans"}{" · "}
                    {startup.memberCount.toLocaleString("en-GB")} {startup.memberCount === 1 ? "member" : "members"}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">Created <time dateTime={startup.createdAt.toISOString()}>{startup.createdAt.toLocaleDateString("en-GB", { timeZone: "UTC" })}</time> UTC</p>
                </div>
              </div>
              <Link href={`/s/${startup.slug}/settings`} className={`${linkClass} mt-2`}>Settings<span className="sr-only"> for {startup.name}</span></Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
