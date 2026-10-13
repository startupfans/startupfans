import { Flag, Globe, Image as LucideImage, Link2, Loader2, MapPin, Send, Trash2, Video, X } from "lucide-react";
import { siGithub, siInstagram, siLinkedin, siTiktok, siX, siYoutube } from "simple-icons";

const uiIconProps = {
  size: 20,
  strokeWidth: 2.25,
  absoluteStrokeWidth: true,
  "aria-hidden": true,
  focusable: "false",
  className: "h-5 w-5 shrink-0",
} as const;

function BrandIcon({ path }: { path: string }) {
  return <svg width={20} height={20} viewBox="-2 -2 28 28" fill="currentColor"
    aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0"><path d={path} /></svg>;
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

export function SpinnerIcon() {
  return <Loader2 {...uiIconProps} className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" />;
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
  return <BrandIcon path={siX.path} />;
}

export function LinkedInIcon() {
  return <BrandIcon path={siLinkedin.path} />;
}

export function GitHubIcon() {
  return <BrandIcon path={siGithub.path} />;
}

export function InstagramIcon() {
  return <BrandIcon path={siInstagram.path} />;
}

export function YouTubeIcon() {
  return <BrandIcon path={siYoutube.path} />;
}

export function TikTokIcon() {
  return <BrandIcon path={siTiktok.path} />;
}

export function GlobeIcon() {
  return <Globe {...uiIconProps} />;
}

export function PinIcon() {
  return <MapPin {...uiIconProps} />;
}

export const postIconButtonBaseClass = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink transition-transform hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none";
export const postIconButtonClass = `${postIconButtonBaseClass} bg-white text-ink disabled:text-ink/40`;
