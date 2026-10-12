import Image from "next/image";
import Link from "next/link";
import { Markdown } from "@/app/components/markdown";
import { PostMedia } from "@/app/components/post-media";
import type { PublicPost } from "@/lib/posts";
import { DeletePostButton } from "./composer";

function relativeDate(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 2592000) return formatter.format(-Math.floor(seconds / 86400), "day");
  if (seconds < 31536000) return formatter.format(-Math.floor(seconds / 2592000), "month");
  return formatter.format(-Math.floor(seconds / 31536000), "year");
}

export function PostCard({ post, showStartup = false, canDelete = false, onPostPage = false }: {
  post: PublicPost;
  showStartup?: boolean;
  canDelete?: boolean;
  onPostPage?: boolean;
}) {
  const postPath = `/s/${post.startupSlug}/p/${post.id}`;
  return (
    <article className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-5 shadow-sticker sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
        <div className="min-w-0 break-words">
          <span className="font-bold text-ink">{post.authorName?.trim() || post.authorEmail.split("@")[0]}</span>
          {showStartup && (
            <Link href={`/s/${post.startupSlug}`} className="mt-2 flex items-center gap-2 font-bold text-ink underline underline-offset-4">
              {post.startupLogoUrl ? (
                <Image src={post.startupLogoUrl} alt="" width={32} height={32} unoptimized
                  className="h-8 w-8 shrink-0 -rotate-3 rounded-lg border-2 border-ink bg-cream object-contain p-1" />
              ) : (
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 -rotate-3 items-center justify-center rounded-lg border-2 border-ink bg-sky font-display font-extrabold">
                  {post.startupName.charAt(0).toUpperCase()}
                </span>
              )}
              {post.startupName}
            </Link>
          )}
        </div>
        <Link href={postPath} className="underline underline-offset-4">
          <time dateTime={post.publishedAt.toISOString()} title={post.publishedAt.toLocaleString("en-GB", { timeZone: "UTC" })}>
            {relativeDate(post.publishedAt)}
          </time>
        </Link>
      </header>
      <div className="mt-4"><Markdown body={post.body} /></div>
      <PostMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} mediaPosterUrl={post.mediaPosterUrl} />
      <footer className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t-2 border-ink/10 pt-4">
        <Link href={postPath} className="text-sm font-bold underline underline-offset-4">View post ↗</Link>
        {canDelete && <DeletePostButton slug={post.startupSlug} postId={post.id} returnToStartup={onPostPage} />}
      </footer>
    </article>
  );
}
