import Image from "next/image";
import { getMediaFormat } from "@/lib/media";

export function PostMedia({ mediaUrl, mediaType, mediaPosterUrl, priority = false }: {
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  mediaPosterUrl: string | null;
  priority?: boolean;
}) {
  if (!mediaUrl || !mediaType) return null;
  const contentType = getMediaFormat(new URL(mediaUrl).pathname)?.contentType;

  return (
    <div className="mt-3 flex min-w-0 max-w-full justify-center overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-sticker">
      {mediaType === "image" ? (
        <Image src={mediaUrl} alt="Post attachment" width={1600} height={1600}
          sizes="(min-width: 768px) 48rem, 100vw" preload={priority}
          className="block h-auto max-h-80 w-auto max-w-full object-contain" />
      ) : (
        <video poster={mediaPosterUrl ?? undefined} controls playsInline preload="metadata"
          className="block h-auto max-h-80 w-auto max-w-full object-contain"
          aria-label="Post video attachment">
          {contentType === "video/quicktime" && <source src={mediaUrl} type="video/quicktime" />}
          <source src={mediaUrl} />
        </video>
      )}
    </div>
  );
}
