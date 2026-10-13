import { getMediaFormat } from "@/lib/media";

export function PostMedia({ mediaUrl, mediaType, mediaPosterUrl }: {
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  mediaPosterUrl: string | null;
}) {
  if (!mediaUrl || !mediaType) return null;
  const contentType = getMediaFormat(new URL(mediaUrl).pathname)?.contentType;

  return (
    <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-ink shadow-sticker">
      {mediaType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- Post dimensions are unknown; let the image establish its intrinsic ratio.
        <img src={mediaUrl} alt="Post attachment" loading="lazy" decoding="async"
          className="block h-auto max-h-[85vh] w-full object-contain" />
      ) : (
        <video poster={mediaPosterUrl ?? undefined} controls playsInline preload="metadata"
          className="block h-auto max-h-[85vh] w-full object-contain" aria-label="Post video attachment">
          {contentType === "video/quicktime" && <source src={mediaUrl} type="video/quicktime" />}
          <source src={mediaUrl} />
        </video>
      )}
    </div>
  );
}
