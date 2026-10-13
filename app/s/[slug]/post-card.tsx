import Image from "next/image";
import Link from "next/link";
import { FlagIcon, LinkIcon, postIconButtonClass } from "@/app/components/icons";
import { Markdown } from "@/app/components/markdown";
import { PostMedia } from "@/app/components/post-media";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import type { PublicPost } from "@/lib/posts";
import { DeletePostButton } from "./composer";
import { reportPost } from "./post-actions";

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

export async function PostCard({ post, showStartup = false, canDelete = false, onPostPage = false }: {
  post: PublicPost;
  showStartup?: boolean;
  canDelete?: boolean;
  onPostPage?: boolean;
}) {
  const admin = isAdmin(await getCurrentUser());
  const postPath = `/s/${post.startupSlug}/p/${post.id}`;
  const authorName = post.authorName?.trim() || post.authorEmail.split("@")[0];
  return (
    <article className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-5 shadow-sticker">
      <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/60">
        {post.authorAvatarUrl ? (
          <Image src={post.authorAvatarUrl} alt="" width={32} height={32} unoptimized referrerPolicy="no-referrer"
            className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold text-ink">
            {authorName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 max-w-full break-words font-bold text-ink">{authorName}</span>
        <span aria-hidden="true">·</span>
        {showStartup && <>
          <Link href={`/s/${post.startupSlug}`} className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-semibold text-ink hover:underline">
            {post.startupLogoUrl ? (
              <Image src={post.startupLogoUrl} alt="" width={20} height={20} unoptimized
                className="h-5 w-5 shrink-0 -rotate-3 rounded border border-ink bg-cream object-contain" />
            ) : (
              <span aria-hidden="true" className="flex h-5 w-5 shrink-0 -rotate-3 items-center justify-center rounded border border-ink bg-sky font-display text-xs font-extrabold">
                {post.startupName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 break-words">{post.startupName}</span>
          </Link>
          <span aria-hidden="true">·</span>
        </>}
        <time dateTime={post.publishedAt.toISOString()} title={post.publishedAt.toLocaleString("en-GB", { timeZone: "UTC" })}
          className="shrink-0">{relativeDate(post.publishedAt)}</time>
      </header>
      <div className="mt-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"><Markdown body={post.body} /></div>
      <PostMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} mediaPosterUrl={post.mediaPosterUrl} />
      <footer className="relative mt-3 flex flex-wrap items-start justify-end gap-2">
        <Link href={postPath} title="View post" aria-label="View post" className={postIconButtonClass}><LinkIcon /></Link>
        <details className="min-w-0 max-w-full text-sm">
          <summary title="Report post" aria-label="Report post"
            className={`${postIconButtonClass} ml-auto cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><FlagIcon /></summary>
          <form action={reportPost.bind(null, post.startupSlug, post.id)} className="absolute top-full right-0 z-10 mt-2 w-full min-w-0 max-w-sm space-y-2 rounded-xl border-2 border-ink bg-cream p-3 shadow-sticker">
            <label htmlFor={`report-${post.id}`} className="block">Reason (optional)</label>
            <textarea id={`report-${post.id}`} name="reason" maxLength={500} rows={3}
              className="block w-full min-w-0 resize-y rounded-lg border-2 border-ink bg-white p-3" />
            <button type="submit" className="min-h-10 rounded-lg border-2 border-ink bg-white px-3 py-2 font-semibold">Send report</button>
          </form>
        </details>
        {(canDelete || admin) && <DeletePostButton slug={post.startupSlug} postId={post.id} returnToStartup={onPostPage} />}
      </footer>
    </article>
  );
}
