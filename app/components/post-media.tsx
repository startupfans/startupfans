import Image from "next/image";

export function PostMedia({ mediaUrl, mediaType, mediaPosterUrl }: {
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  mediaPosterUrl: string | null;
}) {
  if (!mediaUrl || !mediaType) return null;

  return (
    <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-cream shadow-sticker">
      {mediaType === "image" ? (
        <Image src={mediaUrl} alt="Post attachment" width={1200} height={1200}
          sizes="(max-width: 768px) calc(100vw - 86px), 680px"
          className="mx-auto h-auto max-h-[70vh] w-auto max-w-full object-contain" />
      ) : (
        <video src={mediaUrl} poster={mediaPosterUrl ?? undefined} controls playsInline preload="metadata"
          className="mx-auto max-h-[70vh] w-full object-contain" aria-label="Post video attachment" />
      )}
    </div>
  );
}
