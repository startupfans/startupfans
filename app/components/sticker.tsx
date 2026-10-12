import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function TopNav({ signedIn, next }: { signedIn: boolean; next: string }) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4" aria-label="Main navigation">
      <Link href="/" aria-label="startupfans home" className="shrink-0">
        <Image src="/logo/startupfans-logo-on-light.svg" alt="startupfans" width={910} height={150} className="h-auto w-36 sm:w-44" />
      </Link>
      <div className="flex flex-wrap items-center gap-4 font-bold underline underline-offset-4">
        <Link href="/feed">Feed</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href={signedIn ? "/me" : `/login?next=${encodeURIComponent(next)}`}>
          {signedIn ? "Your account" : "Sign in"}
        </Link>
      </div>
    </nav>
  );
}

export function SectionHeading({ eyebrow, title, isDark = false }: { eyebrow: string; title: string; isDark?: boolean }) {
  return (
    <div className="max-w-3xl">
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
