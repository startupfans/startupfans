import type { ReactNode } from "react";
import { Flag, Globe, Image as LucideImage, Link2, MapPin, Send, Trash2, Video, X } from "lucide-react";

const uiIconProps = {
  size: 20,
  strokeWidth: 2.25,
  absoluteStrokeWidth: true,
  "aria-hidden": true,
  focusable: "false",
  className: "h-5 w-5 shrink-0",
} as const;

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 shrink-0">{children}</svg>;
}

export function ImageIcon() {
  return <LucideImage {...uiIconProps} />;
}

export function VideoIcon() {
  return <Video {...uiIconProps} />;
}

export function SendIcon() {
  return <Send {...uiIconProps} />;
}

export function FlagIcon() {
  return <Flag {...uiIconProps} />;
}

export function TrashIcon() {
  return <Trash2 {...uiIconProps} />;
}

export function LinkIcon() {
  return <Link2 {...uiIconProps} />;
}

export function CloseIcon() {
  return <X {...uiIconProps} />;
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
  return <Globe {...uiIconProps} />;
}

export function PinIcon() {
  return <MapPin {...uiIconProps} />;
}

export const postIconButtonBaseClass = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink transition-transform hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none";
export const postIconButtonClass = `${postIconButtonBaseClass} bg-white text-ink disabled:text-ink/40`;
