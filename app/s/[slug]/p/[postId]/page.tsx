import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getPostMembership, getPublicPost } from "@/lib/posts";
import { PostCard } from "../../post-card";
import { getCommentAccess, getPublicComments } from "@/lib/comments";
import { CommentList, ReplyComposer } from "./comments";

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
  const query = await searchParams;
  const reportMessage = query.report === "thanks" ? "Thanks for reporting this post. We'll review it."
    : query.report === "invalid" ? "Use up to 500 characters for your report."
      : query.report === "failed" ? "We couldn't save your report. Try again." : null;

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn={user !== null} next={`/s/${slug}/p/${postId}`} />
      <AppShell className="max-w-3xl">
        <PageHeader title={<><span className="sr-only">An update from </span><span className="min-w-0 max-w-full">{post.startupName}</span></>} tabs={{ label: "Startup navigation", items: [
          { href: `/s/${slug}`, label: "Page" },
          { href: `/s/${slug}/team`, label: "Team" },
          ...(member?.role === "owner" || isAdmin(user) ? [{ href: `/s/${slug}/settings`, label: "Settings" }] : []),
        ] }} />
        {reportMessage && <p role={query.report === "thanks" ? "status" : "alert"}
          className="mb-6 rounded-xl border-2 border-ink bg-sun p-4">{reportMessage}</p>}
        <PostCard post={post} showStartup canDelete={canDelete} onPostPage />
        <section id="replies" aria-labelledby="replies-heading" className="mt-8 scroll-mt-6">
          <h2 id="replies-heading" className="font-display text-2xl font-extrabold">Replies <span className="text-ink/60">({comments.length})</span></h2>
          <CommentList comments={comments} slug={slug} postId={postId} viewerId={user?.id ?? null}
            canReply={Boolean(access?.canReply)} canModerate={Boolean(access?.canModerate)} />
          <ReplyComposer slug={slug} postId={postId} canReply={Boolean(access?.canReply)} signedIn={user !== null} />
        </section>
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { PostPage as default };
