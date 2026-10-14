import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getMediaFormat } from "@/lib/media";
import { allowRateLimit } from "@/lib/ratelimit";
import { assertPublicHttpUrl, safeFetch } from "@/lib/safe-fetch";
import { isValidSlug } from "@/lib/slug";

const headers = { "Cache-Control": "private, no-store" };
const IMAGE_LIMIT = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in to save an image." }, { status: 401, headers });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ message: "Uploads are off here." }, { status: 503, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Send an image address and page address." }, { status: 400, headers });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ message: "Send an image address and page address." }, { status: 400, headers });
  }
  const imageUrl = "imageUrl" in body && typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const slug = "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
  if (!imageUrl || imageUrl.length > 2000 || !isValidSlug(slug)) {
    return Response.json({ message: "Choose a valid page address and image first." }, { status: 400, headers });
  }

  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  if (!await allowRateLimit(`brand-import:${user.id}`, 20, db, windowStart)) {
    return Response.json({ message: "Slow down a little." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }

  try {
    assertPublicHttpUrl(imageUrl);
    const { response, body: bytes } = await safeFetch(imageUrl, {
      maxBytes: IMAGE_LIMIT,
      headers: { Accept: "image/*,*/*;q=0.1" },
    });
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const pathFormat = getMediaFormat(new URL(imageUrl).pathname);
    const extension = allowedTypes.get(contentType)
      ?? (pathFormat?.type === "image" ? pathFormat.extensions[0] : null);
    if (!extension) {
      return Response.json({ message: "Use a JPEG, PNG, WebP, GIF or AVIF image." }, { status: 400, headers });
    }
    const storedType = contentType === "image/jpg" || extension === "jpg"
      ? "image/jpeg"
      : (allowedTypes.has(contentType) ? contentType : `image/${extension}`);
    const pathname = `startups/${slug}/profile/${user.id}-${randomBytes(16).toString("hex")}.${extension}`;
    const blob = await put(pathname, Buffer.from(bytes), {
      access: "public",
      contentType: storedType,
      addRandomSuffix: false,
      abortSignal: AbortSignal.timeout(15_000),
    });
    return Response.json({ url: blob.url }, { headers });
  } catch (error) {
    console.error("[startupfans] Brand image import failed.", error);
    return Response.json({ message: "We couldn't save that image. Try another or upload your own." }, { status: 502, headers });
  }
}
