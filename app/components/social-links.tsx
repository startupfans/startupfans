import type { ReactNode } from "react";
import { GitHubIcon, InstagramIcon, LinkedInIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/app/components/icons";
import { getSocialUrl, socialNetworks, type SocialField, type SocialNetwork } from "@/lib/socials";

const socialIcons = {
  x: XIcon, linkedin: LinkedInIcon, github: GitHubIcon,
  instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon,
} satisfies Record<SocialNetwork, () => ReactNode>;

export function SocialLinks({ values, name }: {
  values: Partial<Record<SocialField, string | null>>;
  name: string;
}) {
  const socials = socialNetworks.flatMap(({ network, field, label }) => {
    const href = getSocialUrl(network, values[field] ?? null);
    return href ? [{ network, href, label: label.replace(/ (handle|URL)$/, "") }] : [];
  });
  if (socials.length === 0) return null;
  return (
    <nav aria-label="Social profiles" className="mt-4 flex flex-wrap gap-3">
      {socials.map(({ network, href, label }) => {
        const SocialIcon = socialIcons[network];
        return (
          <a key={network} href={href} target="_blank" rel="noopener noreferrer"
            aria-label={`${name} on ${label}`} title={label}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-cream transition-transform hover:-translate-y-0.5 hover:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            <SocialIcon />
          </a>
        );
      })}
    </nav>
  );
}
