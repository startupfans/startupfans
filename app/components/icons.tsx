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

export function XIcon() {
  return <Icon><path d="m4 3 16 18h-5L3 3h5ZM20 3l-6.5 7.5M4 21l6.5-7.5" /></Icon>;
}

export function LinkedInIcon() {
  return <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M11 17v-7m0 3a3 3 0 0 1 6 0v4" /><circle cx="7" cy="7" r=".5" fill="currentColor" /></Icon>;
}

export function GitHubIcon() {
  return <Icon><path d="M9 21v-3c-4 1-4-2-6-2m12 5v-4c0-1-.5-2-1-2 4-.5 6-2 6-5 0-1.5-.5-2.5-1.5-3.5.5-1 .5-2.5 0-3.5-1.5 0-3 1-4 1.5a12 12 0 0 0-5 0C8.5 4 7 3 5.5 3c-.5 1-.5 2.5 0 3.5C4.5 7.5 4 8.5 4 10c0 3 2 4.5 6 5-.5 0-1 1-1 2" /></Icon>;
}

export function InstagramIcon() {
  return <Icon><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill="currentColor" /></Icon>;
}

export function YouTubeIcon() {
  return <Icon><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3Z" fill="currentColor" stroke="none" /></Icon>;
}

export function TikTokIcon() {
  return <Icon><path d="M14 3v12a5 5 0 1 1-5-5v4a1 1 0 1 0 1 1V3h4c.5 3 2 4.5 6 5v4c-2.5 0-4.5-1-6-2" /></Icon>;
}

export function GlobeIcon() {
  return <Icon><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z" /></Icon>;
}

export function PinIcon() {
  return <Icon><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></Icon>;
}

export const postIconButtonBaseClass = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink transition-transform hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none";
export const postIconButtonClass = `${postIconButtonBaseClass} bg-white text-ink disabled:text-ink/40`;
