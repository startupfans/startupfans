import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { verifyMediaJobToken } from "@/lib/video-jobs";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(request: Request) {
  const deadline = performance.now() + (maxDuration - 90) * 1000;
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  if (typeof body !== "object" || body === null || !("postId" in body) || typeof body.postId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.postId)
    || !verifyMediaJobToken(body.postId, authorization.slice(7))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const postId = body.postId;
  const [post] = await db.select({ status: posts.mediaStatus }).from(posts).where(eq(posts.id, postId));
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  if (post.status !== "processing") return Response.json({ status: post.status });
  after(async () => {
    const { processVideoJob } = await import("@/lib/video");
    await processVideoJob(postId, deadline);
  });
  return Response.json({ status: "processing" }, { status: 202 });
}
