import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminLink } from "./admin-link";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";

export async function TopNav({ signedIn, next }: { signedIn: boolean; next: string }) {
  const admin = signedIn && isAdmin(await getCurrentUser());
  return (
    <nav className="flex flex-nowrap items-center justify-between gap-x-2 lg:gap-x-4" aria-label="Main navigation">
      <Link href="/" aria-label="startupfans home" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center">
        <Image src="/logo/startupfans-mark-on-light.svg" alt="startupfans" width={196} height={196} className="h-9 w-9 sm:hidden" />
        <Image src="/logo/startupfans-logo-on-light.svg" alt="startupfans" width={910} height={150} className="hidden h-auto w-32 sm:block lg:w-44" />
      </Link>
      <div className="ml-auto flex min-w-0 flex-nowrap items-center gap-x-1 pr-1 whitespace-nowrap text-xs font-bold underline-offset-4 max-[390px]:overflow-x-auto sm:gap-x-2 sm:text-sm lg:gap-x-4 lg:text-base [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:shrink-0 [&_a]:items-center [&_a]:justify-center [&_a]:py-2">
        <Link href="/feed" className="inline-flex underline">Feed</Link>
        <Link href="/leaderboard" aria-label="Leaderboard" className="inline-flex underline">
          <span className="sm:hidden">Board</span>
          <span className="hidden sm:inline">Leaderboard</span>
        </Link>
        {signedIn && (
          <Link href="/start" aria-label="Start a startup" className="inline-flex rounded-full border-2 border-ink bg-pink px-2 no-underline shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none lg:px-3">
            <span className="lg:hidden">Start</span>
            <span className="hidden lg:inline">Start a startup</span>
          </Link>
        )}
        <Link className="inline-flex underline" href={signedIn ? "/me" : `/login?next=${encodeURIComponent(next)}`}>
          {signedIn ? "Your account" : "Sign in"}
        </Link>
        {admin && <AdminLink compact />}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  const contact = process.env.PRICING_CONTACT_EMAIL?.trim() || "hello@startupfans.co";
  return (
    <footer className="mt-14 break-words border-t-2 border-ink/15 pt-6 text-sm leading-relaxed text-ink/70">
      <p>startupfans · for people who like things early · keep it real, keep it legal, no spam</p>
      <a href={`mailto:${contact}`} className="mt-2 inline-flex min-h-11 items-center py-2 underline underline-offset-4">Contact us for takedowns</a>
    </footer>
  );
}

export function SectionHeading({ eyebrow, title, isDark = false }: { eyebrow: string; title: string; isDark?: boolean }) {
  return (
    <div className="min-w-0 max-w-3xl break-words">
      <p className={`font-mono text-xs font-bold tracking-widest uppercase ${isDark ? "text-sun" : "text-pink"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}

export function Sticker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`z-10 rounded-xl border-[3px] border-ink px-4 py-2 font-display text-sm font-extrabold uppercase shadow-sticker ${className}`}
    >
      {children}
    </span>
  );
}

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <path
        d="M32 6l7.6 16.6 18.1 2-13.5 12.2 3.8 17.9L32 45.6l-16 9.1 3.8-17.9L6.3 24.6l18.1-2z"
        fill="currentColor"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
