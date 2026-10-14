"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { ProfileImage } from "./profile-image";
import { SubmitButton } from "./submit-button";

export function AccountMenu({ name, handle, avatarUrl, signOut }: {
  name: string | null;
  handle: string;
  avatarUrl: string | null;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = name?.trim() || handle;

  function focusItem(index: number) {
    const items = menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    items[(index + items.length) % items.length]?.focus();
  }

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    const menuRoot = root.current;
    function dismissFocus(event: FocusEvent) {
      if (event.relatedTarget instanceof Node && !menuRoot?.contains(event.relatedTarget)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    menuRoot?.addEventListener("focusout", dismissFocus);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      menuRoot?.removeEventListener("focusout", dismissFocus);
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (event.key === "Tab") {
      const items = menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      const boundary = event.shiftKey ? items?.[0] : items?.[items.length - 1];
      if (document.activeElement === boundary) setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      const index = items.findIndex((item) => item === document.activeElement);
      focusItem(index + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusItem(event.key === "Home" ? 0 : -1);
    }
  }

  return (
    <div ref={root} className="relative flex h-11 shrink-0">
      <button ref={button} type="button" aria-label="Your account" aria-haspopup="menu"
        aria-expanded={open} aria-controls={menuId}
        className="inline-flex h-11 w-11 items-center justify-start pl-1.5 sm:pl-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (open) focusItem(0);
            else setOpen(true);
          }
        }}>
        <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-white font-display text-lg font-extrabold shadow-sticker">
          {avatarUrl ? <ProfileImage src={avatarUrl} alt="" width={36} height={36} sizes="36px" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            : displayName.charAt(0).toUpperCase()}
        </span>
      </button>
      {open && <div id={menuId} ref={menu} role="menu" aria-label="Your account" onKeyDown={handleKeyDown}
        className="absolute top-full right-0 z-50 mt-3 w-60 rounded-2xl border-[3px] border-ink bg-cream p-2 shadow-sticker motion-safe:animate-[account-menu-in_120ms_ease-out]">
        <style>{"@keyframes account-menu-in { from { opacity: 0; } to { opacity: 1; } }"}</style>
        <div role="presentation" className="border-b-2 border-ink/15 px-3 py-2 whitespace-normal">
          <p className="break-words font-display font-extrabold">{displayName}</p>
          <p className="break-words font-mono text-xs text-ink/70">@{handle}</p>
        </div>
        <Link role="menuitem" tabIndex={0} href="/me" onClick={() => setOpen(false)}
          className="flex h-11 rounded-xl px-3 text-sm no-underline hover:bg-sun focus:bg-sun focus:outline-none justify-start!">Your account</Link>
        <Link role="menuitem" tabIndex={0} href="/me/notifications" prefetch={false} onClick={() => setOpen(false)}
          className="flex h-11 rounded-xl px-3 text-sm no-underline hover:bg-sun focus:bg-sun focus:outline-none justify-start!">Notification settings</Link>
        <form role="presentation" action={signOut} onSubmit={() => {
          if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) posthog.reset();
        }}>
          <SubmitButton role="menuitem" tabIndex={0} pendingLabel="Signing out…"
            className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm hover:bg-sun focus:bg-sun focus:outline-none [&>span]:justify-items-start">Sign out</SubmitButton>
        </form>
      </div>}
    </div>
  );
}
