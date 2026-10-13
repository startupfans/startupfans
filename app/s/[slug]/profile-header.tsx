import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { getStartupBySlug } from "@/lib/startups";
import { GitHubIcon, GlobeIcon, InstagramIcon, LinkedInIcon, PinIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/app/components/icons";
import { Star } from "@/app/components/sticker";
import { getSocialUrl, socialNetworks, type SocialNetwork } from "@/lib/socials";

const socialIcons = {
  x: XIcon, linkedin: LinkedInIcon, github: GitHubIcon,
  instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon,
} satisfies Record<SocialNetwork, () => ReactNode>;

function websiteDomain(website: string) {
  try { return new URL(website).hostname.replace(/^www\./, ""); }
  catch { return website; }
}

export function ProfileHeader({ startup, followPanel, isOwner, children }: {
  startup: NonNullable<Awaited<ReturnType<typeof getStartupBySlug>>>;
  followPanel: ReactNode;
  isOwner: boolean;
  children: ReactNode;
}) {
  const stageLabel = startup.stage === "series-a" ? "Series A" : startup.stage
    ? startup.stage.charAt(0).toUpperCase() + startup.stage.slice(1) : null;
  const socials = socialNetworks.flatMap(({ network, field, label }) => {
    const href = getSocialUrl(network, startup[field]);
    return href ? [{ network, href, label: label.replace(/ (handle|URL)$/, "") }] : [];
  });

  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl border-[3px] border-ink bg-white shadow-sticker-lg" aria-labelledby="startup-name">
      <div className={`relative overflow-hidden border-b-[3px] border-ink bg-sky ${startup.coverUrl ? "aspect-[3/1] max-h-72" : "h-28 sm:h-36 lg:h-44"}`}
        style={startup.coverUrl ? undefined : { backgroundImage: "radial-gradient(circle, #19191926 1.5px, transparent 1.5px)", backgroundSize: "18px 18px" }}>
        {startup.coverUrl && <Image src={startup.coverUrl} alt="" fill unoptimized
          sizes="(max-width: 1152px) 100vw, 1152px" className="object-cover" />}
      </div>
      {!startup.coverUrl && <Star className="pointer-events-none absolute top-4 right-5 h-12 w-12 rotate-12 text-sun" />}
      <div className="relative px-6 pb-6 sm:px-10 sm:pb-10">
        <div className="relative -mt-14 mb-6 w-28">
          {startup.logoUrl ? <Image src={startup.logoUrl} alt={`${startup.name} logo`} width={112} height={112} unoptimized
            className="h-28 w-28 -rotate-3 rounded-2xl border-[3px] border-ink bg-white object-contain p-2 shadow-sticker" />
            : <span aria-hidden="true" className="flex h-28 w-28 -rotate-3 items-center justify-center rounded-2xl border-[3px] border-ink bg-sky font-display text-6xl font-extrabold shadow-sticker">
              {startup.name.charAt(0).toUpperCase()}
            </span>}
        </div>
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <h1 id="startup-name" className="break-words font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{startup.name}</h1>
            {startup.tagline && <p className="mt-3 break-words text-xl text-ink/80">{startup.tagline}</p>}
            {startup.bio && <p className="mt-4 max-w-[65ch] whitespace-pre-wrap break-words leading-relaxed">{startup.bio}</p>}
            <div className="mt-5 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-ink/80">
              {startup.location && <span className="inline-flex min-w-0 max-w-full items-center gap-2"><PinIcon /><span className="break-words">{startup.location}</span></span>}
              {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 underline underline-offset-4"><GlobeIcon /><span className="break-all">{websiteDomain(startup.website)}</span></a>}
              {stageLabel && <span className="rounded-full border-2 border-ink bg-sun px-3 py-1 text-ink">{stageLabel}</span>}
              <span className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-ink">{startup.memberCount.toLocaleString("en-GB")} {startup.memberCount === 1 ? "person" : "people"}</span>
            </div>
            {socials.length > 0 && <nav aria-label="Social profiles" className="mt-4 flex flex-wrap gap-3">
              {socials.map(({ network, href, label }) => {
                const SocialIcon = socialIcons[network];
                return <a key={network} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${startup.name} on ${label}`} title={label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-cream transition-transform hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
                  <SocialIcon />
                </a>;
              })}
            </nav>}
            {startup.description && <p className="mt-6 max-w-[65ch] whitespace-pre-wrap break-words leading-relaxed text-ink/80">{startup.description}</p>}
            {isOwner && <Link href={`/s/${startup.slug}/settings`} className="mt-4 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Edit profile</Link>}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-5 border-t-2 border-ink/15 pt-6 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-6">{followPanel}</div>
        </div>
        {children}
      </div>
    </section>
  );
}
