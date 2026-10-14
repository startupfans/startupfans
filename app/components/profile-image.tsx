import Image, { type ImageProps } from "next/image";

type ProfileImageProps = Omit<ImageProps, "src" | "sizes" | "unoptimized"> & {
  src: string;
  sizes: string;
};

function canOptimize(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.port) return false;
    if (/^[^.]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname)) return true;
    switch (url.hostname) {
      case "avatars.githubusercontent.com": return url.pathname.startsWith("/u/");
      case "miniti.app": return url.pathname.startsWith("/images/") && !url.search;
      case "agentshrine.com": return url.pathname === "/favicon.svg" && !url.search;
      default: return false;
    }
  } catch {
    return false;
  }
}

export function ProfileImage({ src, sizes, alt, ...props }: ProfileImageProps) {
  return <Image {...props} src={src} sizes={sizes} alt={alt} unoptimized={!canOptimize(src)} />;
}
