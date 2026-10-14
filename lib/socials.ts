export const socialNetworks = [
  {
    network: "x",
    field: "xHandle",
    label: "X handle",
    placeholder: "@yourstartup",
    personalPlaceholder: "@you",
    hint: "Use an X handle or profile URL.",
  },
  {
    network: "linkedin",
    field: "linkedinUrl",
    label: "LinkedIn URL",
    placeholder: "linkedin.com/company/yourstartup",
    personalPlaceholder: "linkedin.com/in/you",
    hint: "Use a LinkedIn company or profile URL.",
  },
  {
    network: "github",
    field: "githubUrl",
    label: "GitHub URL",
    placeholder: "github.com/yourstartup/repo",
    personalPlaceholder: "github.com/you",
    hint: "Use a GitHub profile, org, or repo URL.",
  },
  {
    network: "instagram",
    field: "instagramHandle",
    label: "Instagram handle",
    placeholder: "@yourstartup",
    personalPlaceholder: "@you",
    hint: "Use an Instagram handle or profile URL.",
  },
  {
    network: "youtube",
    field: "youtubeUrl",
    label: "YouTube URL",
    placeholder: "youtube.com/@yourstartup",
    personalPlaceholder: "youtube.com/@you",
    hint: "Use a YouTube channel URL.",
  },
  {
    network: "tiktok",
    field: "tiktokHandle",
    label: "TikTok handle",
    placeholder: "@yourstartup",
    personalPlaceholder: "@you",
    hint: "Use a TikTok handle or profile URL.",
  },
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

/** Accepts bare hosts, http://, or https://. */
function profileUrl(network: SocialNetwork, input: string) {
  try {
    const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input) ? input : `https://${input}`;
    const url = new URL(candidate);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:")
      || url.username || url.password || url.port
    ) {
      return null;
    }
    const hostname = url.hostname.replace(/^www\./, "");
    const validHost = hosts[network].includes(hostname)
      || (network === "linkedin" && hostname.endsWith(".linkedin.com"));
    if (!validHost) return null;
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
        github: /^\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?(?:\/[a-zA-Z0-9._-]+)?$/,
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
