import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { SiteFooter, TopNav } from "@/app/components/sticker";
import { SubNav } from "@/app/components/sub-nav";
import { getCurrentUser } from "@/lib/auth";
import { getPostMembership, getPublicPost } from "@/lib/posts";
import { PostCard, relativeDate } from "../../post-card";
import { getCommentAccess, getPublicComments, type PublicComment } from "@/lib/comments";
import { CommentComposer, DeleteCommentButton, InlineReply } from "./comments";
import { LikeButton } from "./like-button";

type PostPageProps = { params: Promise<{ slug: string; postId: string }> };

function plainText(node: ReactNode): string {
  return Children.toArray(node).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (!isValidElement<{ children?: ReactNode; alt?: string }>(child)) return "";
    if (child.type === "img") return child.props.alt ?? "";
    const text = plainText(child.props.children);
    const block = typeof child.type === "string" && /^(p|h[1-6]|li|blockquote|pre|br|hr)$/.test(child.type);
    return block ? `${text} ` : text;
  }).join("");
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug, postId } = await params;
  const post = await getPublicPost(slug, postId);
  if (!post) notFound();
  const description = plainText(
    ReactMarkdown({ children: post.body, skipHtml: true }),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return {
    title: post.startupName,
    description,
    openGraph: { title: post.startupName, description },
    twitter: { title: post.startupName, description },
  };
}

function CommentContent({ comment, slug, postId, canDelete, canReply, signedIn }: {
  comment: PublicComment;
  slug: string;
  postId: string;
  canDelete: boolean;
  canReply: boolean;
  signedIn: boolean;
}) {
  return (
    <article id={`comment-${comment.id}`} className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink/60">
        {comment.avatarUrl ? <Image src={comment.avatarUrl} alt="" width={32} height={32} unoptimized referrerPolicy="no-referrer"
          className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" /> : (
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-bold text-ink">
            {comment.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 max-w-full break-words font-bold text-ink">{comment.displayName}</span>
        <time dateTime={comment.createdAt.toISOString()} title={comment.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })}>{relativeDate(comment.createdAt)}</time>
        {canDelete && <div className="ml-auto">
          <DeleteCommentButton slug={slug} postId={postId} commentId={comment.id} />
        </div>}
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <LikeButton commentId={comment.id} count={comment.likeCount} liked={comment.liked}
          signedIn={signedIn} postUrl={`/s/${slug}/p/${postId}`} />
        {canReply && <InlineReply slug={slug} postId={postId} commentId={comment.id} />}
      </div>
    </article>
  );
}

export async function PostPage({ params, searchParams }: PostPageProps & {
  searchParams: Promise<{ report?: string | string[] }>;
}) {
  const { slug, postId } = await params;
  const [post, user] = await Promise.all([getPublicPost(slug, postId), getCurrentUser()]);
  if (!post) notFound();
  const member = user ? await getPostMembership(slug, user.id) : null;
  const canDelete = member !== null && (member.role === "owner" || user?.id === post.authorId);
  const [comments, access] = await Promise.all([
    getPublicComments(postId, user?.id ?? null),
    user ? getCommentAccess(post.startupId, user) : null,
  ]);
  const threads = new Map<string, { parent: PublicComment | null; replies: PublicComment[] }>();
  for (const comment of comments) {
    const threadId = comment.parentId ?? comment.id;
    const thread = threads.get(threadId) ?? { parent: null, replies: [] };
    if (comment.parentId === null) thread.parent = comment;
    else thread.replies.push(comment);
    threads.set(threadId, thread);
  }
  const canDeleteComment = (comment: PublicComment) => Boolean(access?.canModerate || user?.id === comment.userId);
  const query = await searchParams;
  const reportMessage = query.report === "thanks" ? "Thanks for reporting this post. We'll review it."
    : query.report === "invalid" ? "Use up to 500 characters for your report."
      : query.report === "failed" ? "We couldn't save your report. Try again." : null;

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-3xl break-words px-5 py-10 sm:py-16">
      <TopNav signedIn={user !== null} next={`/s/${slug}/p/${postId}`} />
      <SubNav aria-label="Startup navigation" items={[
        { href: `/s/${slug}`, label: "Page" },
        { href: `/s/${slug}/team`, label: "Team" },
      ]} />
      <h1 className="sr-only">An update from {post.startupName}</h1>
      {reportMessage && <p role={query.report === "thanks" ? "status" : "alert"}
        className="mb-6 rounded-xl border-2 border-ink bg-sun p-4">{reportMessage}</p>}
      <PostCard post={post} showStartup canDelete={canDelete} onPostPage />
      <section id="replies" aria-labelledby="replies-heading" className="mt-8 scroll-mt-6">
        <h2 id="replies-heading" className="font-display text-2xl font-extrabold">Replies <span className="text-ink/60">({comments.length})</span></h2>
        {comments.length === 0 ? <p className="mt-4 text-ink/60">No replies yet.</p> : (
          <ol className="mt-4 space-y-4">
            {Array.from(threads, ([threadId, thread]) => (
              <li key={threadId} className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-sticker">
                {thread.parent && <CommentContent comment={thread.parent} slug={slug} postId={postId}
                  canDelete={canDeleteComment(thread.parent)} canReply={Boolean(access?.canReply)} signedIn={user !== null} />}
                {thread.replies.length > 0 && <ol aria-label="Thread replies"
                  className={`${thread.parent ? "mt-4" : ""} ml-2 min-w-0 space-y-4 border-l-2 border-ink pl-3 sm:ml-4 sm:pl-4`}>
                  {thread.replies.map((reply) => (
                    <li key={reply.id} className="min-w-0">
                      <CommentContent comment={reply} slug={slug} postId={postId}
                        canDelete={canDeleteComment(reply)} canReply={Boolean(thread.parent && access?.canReply)} signedIn={user !== null} />
                    </li>
                  ))}
                </ol>}
              </li>
            ))}
          </ol>
        )}
        {access?.canReply ? <CommentComposer slug={slug} postId={postId} /> : (
          <Link href={user ? `/s/${slug}` : `/login?${new URLSearchParams({ next: `/s/${slug}/p/${postId}#replies` })}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-xl border-2 border-ink bg-sun px-4 py-2 font-semibold shadow-sticker">
            {user ? "Become a fan to reply" : "Sign in to reply"}
          </Link>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

export { PostPage as default };
