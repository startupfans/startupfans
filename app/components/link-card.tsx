import Image from "next/image";
import type { PostLink } from "@/lib/links";

export function LinkCard({ preview }: { preview: PostLink | null }) {
  if (!preview || preview.status !== "ready" || !preview.title) return null;
  const domain = new URL(preview.url).hostname;
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer nofollow ugc"
      className="mt-3 block w-full min-w-0 overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
      {preview.imageUrl && <div className="relative aspect-video w-full">
        <Image src={preview.imageUrl} alt="" fill sizes="(min-width: 768px) 48rem, 100vw"
          loading="lazy" className="object-cover" />
      </div>}
      <div className="min-w-0 space-y-1 p-4">
        <p className="truncate font-mono text-xs uppercase tracking-wide text-ink/60">
          {preview.siteName && preview.siteName !== domain ? `${preview.siteName} · ${domain}` : domain}
        </p>
        <p className="line-clamp-2 break-words font-display text-lg font-bold leading-snug">{preview.title}</p>
        {preview.description && <p className="line-clamp-2 break-words text-sm leading-relaxed text-ink/60">{preview.description}</p>}
      </div>
    </a>
  );
}
