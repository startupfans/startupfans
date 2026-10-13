import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 shrink-0">{children}</svg>;
}

export function ImageIcon() {
  return <Icon><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 5-5 4 4 4-6 5 7" /></Icon>;
}

export function VideoIcon() {
  return <Icon><rect x="3" y="5" width="13" height="14" rx="3" /><path d="m16 10 5-3v10l-5-3" /></Icon>;
}

export function SendIcon() {
  return <Icon><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3" /></Icon>;
}

export function FlagIcon() {
  return <Icon><path d="M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0" /></Icon>;
}

export function TrashIcon() {
  return <Icon><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></Icon>;
}

export function LinkIcon() {
  return <Icon><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></Icon>;
}

export function CloseIcon() {
  return <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon>;
}

export const postIconButtonClass = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cream text-ink transition hover:bg-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50";
