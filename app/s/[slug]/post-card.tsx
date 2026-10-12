import Image from "next/image";
import Link from "next/link";
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
    <article className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-5 shadow-sticker sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
        <div className="min-w-0 max-w-full break-words">
          <div className="flex items-center gap-2">
            {post.authorAvatarUrl ? (
              <Image src={post.authorAvatarUrl} alt="" width={32} height={32} unoptimized referrerPolicy="no-referrer"
                className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold">
                {authorName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 break-words font-bold text-ink">{authorName}</span>
          </div>
          {showStartup && (
            <Link href={`/s/${post.startupSlug}`} className="mt-2 flex min-h-11 min-w-0 items-center gap-2 py-1 font-bold text-ink underline underline-offset-4">
              {post.startupLogoUrl ? (
                <Image src={post.startupLogoUrl} alt="" width={32} height={32} unoptimized
                  className="h-8 w-8 shrink-0 -rotate-3 rounded-lg border-2 border-ink bg-cream object-contain p-1" />
              ) : (
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 -rotate-3 items-center justify-center rounded-lg border-2 border-ink bg-sky font-display font-extrabold">
                  {post.startupName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 break-words">{post.startupName}</span>
            </Link>
          )}
        </div>
        <Link href={postPath} className="inline-flex min-h-11 items-center py-2 underline underline-offset-4">
          <time dateTime={post.publishedAt.toISOString()} title={post.publishedAt.toLocaleString("en-GB", { timeZone: "UTC" })}>
            {relativeDate(post.publishedAt)}
          </time>
        </Link>
      </header>
      <div className="mt-4"><Markdown body={post.body} /></div>
      <PostMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} mediaPosterUrl={post.mediaPosterUrl} />
      <footer className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t-2 border-ink/10 pt-4">
        <Link href={postPath} className="inline-flex min-h-11 items-center py-2 text-sm font-bold underline underline-offset-4">View post ↗</Link>
        <details className="min-w-0 max-w-full text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold underline underline-offset-4">Report</summary>
          <form action={reportPost.bind(null, post.startupSlug, post.id)} className="mt-3 space-y-3">
            <label htmlFor={`report-${post.id}`} className="block">Reason (optional)</label>
            <textarea id={`report-${post.id}`} name="reason" maxLength={500} rows={3}
              className="block w-full min-w-0 resize-y rounded-xl border-2 border-ink p-3" />
            <button type="submit" className="min-h-11 w-full rounded-lg border-2 border-ink bg-cream px-3 py-2 font-semibold sm:w-auto">Send report</button>
          </form>
        </details>
        {(canDelete || admin) && <DeletePostButton slug={post.startupSlug} postId={post.id} returnToStartup={onPostPage} />}
      </footer>
    </article>
  );
}
