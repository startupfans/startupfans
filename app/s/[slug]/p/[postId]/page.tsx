import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { SiteFooter, TopNav } from "@/app/components/sticker";
import { getCurrentUser } from "@/lib/auth";
import { getPostMembership, getPublicPost } from "@/lib/posts";
import { PostCard } from "../../post-card";

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
  const query = await searchParams;
  const reportMessage = query.report === "thanks" ? "Thanks for reporting this post. We'll review it."
    : query.report === "invalid" ? "Use up to 500 characters for your report."
      : query.report === "failed" ? "We couldn't save your report. Try again." : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10 sm:py-16">
      <TopNav signedIn={user !== null} next={`/s/${slug}/p/${postId}`} />
      <Link href={`/s/${slug}`} className="my-8 inline-block font-display text-xl font-extrabold underline underline-offset-4">← {post.startupName}</Link>
      <h1 className="sr-only">An update from {post.startupName}</h1>
      {reportMessage && <p role={query.report === "thanks" ? "status" : "alert"}
        className="mb-6 rounded-xl border-2 border-ink bg-sun p-4">{reportMessage}</p>}
      <PostCard post={post} showStartup canDelete={canDelete} onPostPage />
      <SiteFooter />
    </main>
  );
}

export { PostPage as default };
