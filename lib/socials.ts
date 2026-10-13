export const socialNetworks = [
  { network: "x", field: "xHandle", label: "X handle", placeholder: "@yourstartup" },
  { network: "linkedin", field: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://www.linkedin.com/company/yourstartup" },
  { network: "github", field: "githubUrl", label: "GitHub URL", placeholder: "https://github.com/yourstartup" },
  { network: "instagram", field: "instagramHandle", label: "Instagram handle", placeholder: "@yourstartup" },
  { network: "youtube", field: "youtubeUrl", label: "YouTube URL", placeholder: "https://www.youtube.com/@yourstartup" },
  { network: "tiktok", field: "tiktokHandle", label: "TikTok handle", placeholder: "@yourstartup" },
] as const;

export type SocialNetwork = typeof socialNetworks[number]["network"];
export type SocialField = typeof socialNetworks[number]["field"];
type SocialResult = { status: "valid"; value: string | null } | { status: "invalid" };

const hosts = {
  x: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
  github: ["github.com"],
  instagram: ["instagram.com"],
  youtube: ["youtube.com"],
  tiktok: ["tiktok.com"],
} satisfies Record<SocialNetwork, string[]>;

function profileUrl(network: SocialNetwork, input: string) {
  try {
    const url = new URL(input);
    if (!input.startsWith("https://") || url.protocol !== "https:" || url.username || url.password || url.port
      || !hosts[network].includes(url.hostname.replace(/^www\./, ""))) return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizeSocial(network: SocialNetwork, input: string): SocialResult {
  const value = input.trim();
  if (!value) return { status: "valid", value: null };
  if (value.length > 500) return { status: "invalid" };
  switch (network) {
    case "x":
    case "instagram":
    case "tiktok": {
      let handle = value;
      if (value.includes("://") || value.includes("/")) {
        const url = profileUrl(network, value);
        if (!url || !/^\/[^/]+\/?$/.test(url.pathname)) return { status: "invalid" };
        handle = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      }
      handle = handle.replace(/^@/, "").toLowerCase();
      const pattern = {
        x: /^[a-z0-9_]{1,15}$/,
        instagram: /^(?!.*\.\.)[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/,
        tiktok: /^[a-z0-9_](?:[a-z0-9_.]{0,22}[a-z0-9_])?$/,
      }[network];
      return pattern.test(handle) ? { status: "valid", value: handle } : { status: "invalid" };
    }
    case "linkedin":
    case "github":
    case "youtube": {
      const url = profileUrl(network, value);
      if (!url) return { status: "invalid" };
      const path = url.pathname.replace(/\/$/, "");
      const pattern = {
        linkedin: /^\/(?:company|in|school)\/[a-zA-Z0-9_%.-]+$/,
        github: /^\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
        youtube: /^\/(?:@[\p{L}\p{N}_.%\-]+|(?:channel|c|user)\/[a-zA-Z0-9_.%\-]+)$/u,
      }[network];
      if (!pattern.test(path)) return { status: "invalid" };
      const host = network === "github" ? "github.com" : `www.${network}.com`;
      return { status: "valid", value: `https://${host}${path}` };
    }
    default:
      network satisfies never;
      return { status: "invalid" };
  }
}

export function getSocialUrl(network: SocialNetwork, value: string | null) {
  const result = normalizeSocial(network, value ?? "");
  if (result.status === "invalid" || !result.value) return null;
  switch (network) {
    case "x": return `https://x.com/${result.value}`;
    case "instagram": return `https://www.instagram.com/${result.value}`;
    case "tiktok": return `https://www.tiktok.com/@${result.value}`;
    case "linkedin":
    case "github":
    case "youtube": return result.value;
    default:
      network satisfies never;
      return null;
  }
}
