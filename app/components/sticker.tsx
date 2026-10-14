import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BellIcon, PlusIcon } from "./icons";
import { SubNav, type SubNavItem } from "./sub-nav";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export function PageHeader({ title, identity, metadata, actions, tabs }: {
  title: ReactNode;
  identity?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  tabs?: { items: readonly SubNavItem[]; label: string };
}) {
  const inlineTabs = tabs && tabs.items.length >= 2 && tabs.items.length <= 3;
  return (
    <header className="mt-6 mb-6 flex flex-wrap items-end justify-between gap-4 [&+*]:mt-0">
      <div className="flex min-w-0 max-w-full items-center gap-3">
        {identity}
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 break-words font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
          {metadata}
        </div>
      </div>
      {(actions || inlineTabs) && <div className="flex min-w-0 max-w-full flex-wrap items-end gap-4 max-sm:w-full">
        {actions}
        {inlineTabs && <SubNav inline aria-label={tabs.label} items={tabs.items} />}
      </div>}
      {tabs && !inlineTabs && <div className="w-full min-w-0">
        <SubNav inline aria-label={tabs.label} items={tabs.items} />
      </div>}
    </header>
  );
}

export async function TopNav({ signedIn, next }: { signedIn: boolean; next: string }) {
  const user = signedIn ? await getCurrentUser() : null;
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;
  return (
    <nav className="flex flex-nowrap items-center justify-between gap-x-0 sm:gap-x-2 lg:gap-x-4" aria-label="Main navigation">
      <Link href="/" aria-label="startupfans home" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-start">
        <Image src="/logo/startupfans-mark-on-light.svg" alt="startupfans" width={196} height={196} className="h-9 w-9 sm:hidden" />
        <Image src="/logo/startupfans-logo-on-light.svg" alt="startupfans" width={910} height={150} className="hidden h-auto w-32 sm:block lg:w-44" />
      </Link>
      <div className={`ml-auto flex min-w-0 flex-nowrap items-center gap-x-1 pr-1 whitespace-nowrap text-xs font-bold underline-offset-4 max-[360px]:text-[11px] max-sm:pr-1.5 sm:gap-x-3 sm:text-sm lg:gap-x-4 lg:text-base [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:shrink-0 [&_a]:items-center [&_a]:justify-center [&_a]:py-2 ${signedIn ? "max-[360px]:gap-x-0.5 max-[360px]:pr-[11px]!" : ""}`}>
        <Link href="/feed" className="inline-flex underline">Feed</Link>
        <Link href="/leaderboard" aria-label="Leaderboard" className={`inline-flex underline max-sm:justify-end! ${signedIn ? "max-[360px]:-ml-0.5 max-[360px]:pr-2" : ""}`}>
          <span className="sm:hidden">Board</span>
          <span className="hidden sm:inline">Leaderboard</span>
        </Link>
        {signedIn && (
          <Link href="/start" aria-label="Start a startup" className="group mr-[5px] inline-flex rounded-full border-2 border-ink bg-pink px-2 no-underline shadow-sticker transition sm:hover:-translate-y-0.5 sm:active:translate-y-0 sm:active:shadow-none max-sm:border-0 max-sm:bg-transparent max-sm:px-0 max-sm:py-0! max-sm:shadow-none max-[360px]:-ml-0.5 max-[360px]:mr-0 max-[360px]:justify-start! lg:px-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-pink shadow-sticker transition group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:shadow-none sm:hidden"><PlusIcon /></span>
            <span className="hidden sm:inline lg:hidden">Start</span>
            <span className="hidden lg:inline">Start a startup</span>
          </Link>
        )}
        {signedIn && (
          <Link href="/notifications" prefetch={false} aria-label={`Notifications, ${unreadCount} unread`}
            className="group mr-[5px] inline-flex h-11 w-11 rounded-full border-2 border-ink bg-cream py-0! no-underline shadow-sticker transition sm:hover:-translate-y-0.5 sm:active:translate-y-0 sm:active:shadow-none max-sm:mr-px max-sm:justify-start! max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none max-[360px]:mr-0! max-[360px]:pl-[3px]">
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full max-sm:border-2 max-sm:border-ink max-sm:bg-cream max-sm:shadow-sticker max-sm:transition max-sm:group-hover:-translate-y-0.5 max-sm:group-active:translate-y-0 max-sm:group-active:shadow-none">
              <BellIcon />
              {unreadCount > 0 && <span aria-hidden="true" className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-ink bg-pink px-0.5 font-mono text-[9px] leading-none font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </span>
          </Link>
        )}
        <Link className={`inline-flex underline max-sm:justify-start! max-sm:mr-1.5 ${signedIn ? "max-[360px]:mr-0! max-[360px]:py-0! max-[360px]:pl-1.5" : "max-[360px]:mr-0.5 max-sm:ml-1"}`} href={signedIn ? "/me" : `/login?next=${encodeURIComponent(next)}`} aria-label={signedIn ? "Your account" : undefined}>
          {signedIn ? <>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-sky font-display text-lg font-extrabold shadow-sticker min-[360px]:hidden" aria-hidden="true">
              {user?.avatarUrl ? <Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                : (user?.name?.trim() || user?.handle || "A").charAt(0).toUpperCase()}
            </span>
            <span className="sm:hidden max-[360px]:hidden">Account</span><span className="hidden sm:inline">Your account</span>
          </> : "Sign in"}
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
