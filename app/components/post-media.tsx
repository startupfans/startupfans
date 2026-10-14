import Image from "next/image";
import { getMediaFormat } from "@/lib/media";
import { PostVideo } from "./post-video";

export function PostMedia({ mediaUrl, mediaType, mediaPosterUrl, priority = false }: {
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  mediaPosterUrl: string | null;
  priority?: boolean;
}) {
  if (!mediaUrl || !mediaType) return null;
  const contentType = getMediaFormat(new URL(mediaUrl).pathname)?.contentType;

  return (
    <div className="mt-3 mx-auto w-fit min-w-0 max-w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-sticker">
      {mediaType === "image" ? (
        <Image src={mediaUrl} alt="Post attachment" width={1600} height={1600}
          sizes="(min-width: 768px) 48rem, 100vw" preload={priority}
          className="block h-auto max-h-80 w-auto max-w-full"
          style={{ width: "auto", height: "auto" }} />
      ) : (
        <PostVideo key={`${mediaUrl}:${mediaPosterUrl}`} mediaUrl={mediaUrl}
          mediaPosterUrl={mediaPosterUrl} quickTime={contentType === "video/quicktime"} />
      )}
    </div>
  );
}
