import { getCurrentUser, isValidSessionId } from "@/lib/auth";
import { getCommentAccess, getRepliesPreview, type RepliesPreview } from "@/lib/comments";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const rawLimit = new URL(request.url).searchParams.get("limit") ?? "3";
  if (!isValidSessionId(postId) || !/^\d{1,2}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 20) {
    return Response.json({ message: "Use a valid post and a reply limit between 1 and 20." }, { status: 400, headers });
  }
  const user = await getCurrentUser();
  const preview = await getRepliesPreview(postId, user?.id ?? null, Number(rawLimit));
  if (!preview) return Response.json({ message: "This post couldn't be found." }, { status: 404, headers });
  const access = user ? await getCommentAccess(preview.startupId, user) : null;
  const result: RepliesPreview = {
    comments: preview.comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString() })),
    total: preview.total,
    hasMore: preview.hasMore,
    viewerId: user?.id ?? null,
    canReply: Boolean(access?.canReply),
    canModerate: Boolean(access?.canModerate),
  };
  return Response.json(result, { headers });
}
