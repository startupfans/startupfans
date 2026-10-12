import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { deleteStartupAction } from "@/app/admin/actions";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";

export async function TopNav({ signedIn, next }: { signedIn: boolean; next: string }) {
  const admin = signedIn && isAdmin(await getCurrentUser());
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4" aria-label="Main navigation">
      <Link href="/" aria-label="startupfans home" className="inline-flex min-h-11 shrink-0 items-center">
        <Image src="/logo/startupfans-logo-on-light.svg" alt="startupfans" width={910} height={150} className="h-auto w-36 sm:w-44" />
      </Link>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 font-bold underline underline-offset-4 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:py-2">
        <Link href="/feed">Feed</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        {admin && <Link href="/admin">Reports</Link>}
        <Link href={signedIn ? "/me" : `/login?next=${encodeURIComponent(next)}`}>
          {signedIn ? "Your account" : "Sign in"}
        </Link>
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

export async function AdminDeleteStartup({ slug }: { slug: string }) {
  if (!isAdmin(await getCurrentUser())) return null;
  return (
    <details className="mt-6 min-w-0 break-words text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold underline underline-offset-4">Delete startup</summary>
      <form action={deleteStartupAction.bind(null, slug)} className="mt-3 space-y-3">
        <p>This permanently deletes the startup, its posts, reports, team memberships and follows.</p>
        <label className="flex min-h-11 items-start gap-2 py-2">
          <input type="checkbox" name="confirm" value="delete" required className="mt-1" />
          I confirm this permanent deletion
        </label>
        <button type="submit" className="min-h-11 w-full rounded-xl border-2 border-ink bg-pink px-4 py-2 font-bold sm:w-auto">Delete startup</button>
      </form>
    </details>
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
