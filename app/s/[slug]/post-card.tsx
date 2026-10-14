import { SubmitButton } from "@/app/components/submit-button";
import { Handle } from "@/app/components/handle";
import { ProfileImage } from "@/app/components/profile-image";
import Link from "next/link";
import { FlagIcon, LinkIcon, postIconButtonClass } from "@/app/components/icons";
import { Markdown } from "@/app/components/markdown";
import { PostMedia } from "@/app/components/post-media";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import type { PublicPost, TimelineItem } from "@/lib/posts";
import { relativeDate } from "@/lib/relative-date";
import { mentionSegments, parseMentions, resolveMentionHandles } from "@/lib/mentions";
import { DeletePostButton } from "./composer";
import { RepliesPanel } from "./replies-panel";
import { ReactionBar } from "./reaction-bar";
import { ReshareButton, ReshareFollowButton, ResharePanel } from "./reshare-button";
import { reportPost } from "./post-actions";

export { relativeDate } from "@/lib/relative-date";

export async function PostCard({ post, showStartup = false, canDelete = false, onPostPage = false, instanceId = post.id }: {
  post: PublicPost;
  showStartup?: boolean;
  canDelete?: boolean;
  onPostPage?: boolean;
  instanceId?: string;
}) {
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const postPath = `/s/${post.startupSlug}/p/${post.id}`;
  const authorName = post.authorName?.trim() || post.authorHandle;
  return (
    <article className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-5 shadow-sticker [&>footer>div:last-child]:flex-1 [&>footer>div:last-child]:justify-start">
      <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/60">
        {post.authorAvatarUrl ? (
          <ProfileImage src={post.authorAvatarUrl} alt="" width={32} height={32} sizes="32px" referrerPolicy="no-referrer"
            className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold text-ink">
            {authorName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 max-w-full break-words font-bold text-ink">{authorName}</span>
        {post.authorName?.trim() ? <Handle handle={post.authorHandle} /> : null}
        <span aria-hidden="true">·</span>
        {showStartup && <>
          <Link href={`/s/${post.startupSlug}`} className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-semibold text-ink hover:underline">
            {post.startupLogoUrl ? (
              <ProfileImage src={post.startupLogoUrl} alt="" width={20} height={20} sizes="20px"
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
      <PostMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} mediaPosterUrl={post.mediaPosterUrl} mediaStatus={post.mediaStatus} />
      <ResharePanel postId={post.id} postUrl={postPath} signedIn={user !== null} count={post.reshareCount} reshared={post.viewerReshared}>
        <RepliesPanel slug={post.startupSlug} postId={post.id}
          snapshot={{ replyCount: post.replyCount, preview: onPostPage ? null : post.repliesPreview ?? null }}
          onPostPage={onPostPage}>
          <ReactionBar postId={post.id} postUrl={postPath} signedIn={user !== null}
            snapshot={{ kind: post.viewerReaction, counts: post.reactionCounts }} />
          <ReshareButton />
          <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-2">
            <Link href={postPath} title="View post" aria-label="View post" className={postIconButtonClass}><LinkIcon /></Link>
            <details className="min-w-0 max-w-full text-sm">
              <summary title="Report post" aria-label="Report post"
                className={`${postIconButtonClass} ml-auto cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><FlagIcon /></summary>
              <form action={reportPost.bind(null, post.startupSlug, post.id)} className="absolute top-full right-0 z-10 mt-2 w-full min-w-0 max-w-sm space-y-2 rounded-xl border-2 border-ink bg-cream p-3 shadow-sticker">
                <label htmlFor={`report-${instanceId}`} className="block">Reason (optional)</label>
                <textarea id={`report-${instanceId}`} name="reason" maxLength={500} rows={3}
                  className="block w-full min-w-0 resize-y rounded-lg border-2 border-ink bg-white p-3" />
                <SubmitButton pendingLabel="Sending…" className="min-h-10 rounded-lg border-2 border-ink bg-white px-3 py-2 font-semibold">Send report</SubmitButton>
              </form>
            </details>
            {(canDelete || admin) && <DeletePostButton slug={post.startupSlug} postId={post.id} returnToStartup={onPostPage} />}
          </div>
        </RepliesPanel>
      </ResharePanel>
    </article>
  );
}

export async function TimelineCard({ item }: { item: TimelineItem }) {
  switch (item.kind) {
    case "post": return <PostCard post={item.post} showStartup />;
    case "reshare": return <ReshareItem item={item} />;
    default: {
      const unreachable: never = item;
      throw new Error(`Unknown timeline item: ${unreachable}`);
    }
  }
}

export async function ReshareItem({ item }: { item: Extract<TimelineItem, { kind: "reshare" }> }) {
  const viewer = await getCurrentUser();
  const name = item.resharer.name?.trim() || item.resharer.handle;
  const tokens = parseMentions(item.note ?? "", false);
  const resolved = await resolveMentionHandles(tokens.map((token) => token.handle));
  const segments = mentionSegments(item.note ?? "", resolved, tokens);
  return <section aria-label={`${name} reshared`} className="min-w-0 rounded-3xl border-[3px] border-ink bg-cream p-4 shadow-sticker sm:p-5">
    <header className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
      <Link href={`/u/${item.resharer.handle}`} className="flex min-w-0 max-w-full flex-wrap items-center gap-2 hover:underline">
        {item.resharer.avatarUrl ? <ProfileImage src={item.resharer.avatarUrl} alt="" width={28} height={28} sizes="28px" referrerPolicy="no-referrer"
          className="h-7 w-7 shrink-0 rounded-full border-2 border-ink object-cover" />
          : <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold">{name.charAt(0).toUpperCase()}</span>}
        <span className="min-w-0 break-words font-bold">{name}</span><Handle handle={item.resharer.handle} />
      </Link>
      <span>reshared</span>
      <time dateTime={item.createdAt.toISOString()} title={item.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} className="text-ink/60">{relativeDate(item.createdAt)}</time>
    </header>
    {item.note && <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed">{segments.map((segment, index) => segment.handle === null ? segment.text
      : <Link key={index} href={`/u/${segment.handle}`} className="font-bold underline decoration-transparent decoration-4 underline-offset-4 hover:decoration-sun">{segment.text}</Link>)}</p>}
    <div className="mt-4 min-w-0">
      <PostCard post={item.post} showStartup instanceId={`reshare-${item.id}`} />
    </div>
    {!item.post.viewerMember && <div className="mt-4 min-w-0">
      <ReshareFollowButton slug={item.post.startupSlug} name={item.post.startupName}
        signedIn={viewer !== null} memberNo={item.post.viewerFanNo} />
    </div>}
  </section>;
}
