import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getPostMembership } from "@/lib/posts";
import { getImageUploadMaximum, getMediaFormat, isMediaFilename, mediaLimits } from "@/lib/media";
import { isValidSlug } from "@/lib/slug";
import { getStartupBySlug } from "@/lib/startups";

const unavailableMessage = "Attachments are unavailable because the Vercel Blob store is not configured. You can still post text.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUploadBody(value: unknown): value is HandleUploadBody {
  if (!isRecord(value) || !isRecord(value.payload)) return false;
  const payload = value.payload;
  if (value.type === "blob.generate-client-token") {
    return typeof payload.pathname === "string" && typeof payload.multipart === "boolean"
      && (payload.clientPayload === null || typeof payload.clientPayload === "string");
  }
  if (value.type === "blob.upload-completed" && isRecord(payload.blob)) {
    const blob = payload.blob;
    return typeof blob.url === "string" && typeof blob.pathname === "string"
      && typeof blob.downloadUrl === "string" && typeof blob.contentType === "string"
      && typeof blob.contentDisposition === "string"
      && (payload.tokenPayload === undefined || payload.tokenPayload === null || typeof payload.tokenPayload === "string");
  }
  return false;
}

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: unavailableMessage }, { status: 503 });
  }
  return Response.json({ ready: true });
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: unavailableMessage }, { status: 503 });
  }
  try {
    const body: unknown = await request.json();
    if (!isUploadBody(body)) return Response.json({ error: "Invalid upload request." }, { status: 400 });

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in before uploading.");
        if (pathname.startsWith("users/")) {
          const prefix = pathname.startsWith(`users/${user.id}/replies/`)
            ? `users/${user.id}/replies/` : `users/${user.id}/avatar/`;
          const filename = pathname.slice(prefix.length);
          if (!pathname.startsWith(prefix) || !isMediaFilename(filename) || getMediaFormat(filename)?.type !== "image") {
            throw new Error("Upload an image to your own avatar or replies folder.");
          }
          const format = getMediaFormat(filename);
          if (!format) throw new Error("Choose a supported image.");
          const role = prefix.endsWith("/replies/") ? "reply" : "avatar";
          return {
            allowedContentTypes: [format.contentType],
            maximumSizeInBytes: getImageUploadMaximum(role, format.contentType),
            addRandomSuffix: true,
          };
        }
        const payload: unknown = JSON.parse(clientPayload ?? "null");
        if (!isRecord(payload) || typeof payload.slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(payload.slug)) {
          throw new Error("Choose a startup before uploading.");
        }
        const profilePrefix = `startups/${payload.slug}/profile/`;
        const isProfile = pathname.startsWith(profilePrefix);
        const member = await getPostMembership(payload.slug, user.id);
        if (isProfile && !isAdmin(user)) {
          if (member) {
            if (member.role !== "owner") throw new Error("Only owners can upload profile images.");
          } else if (!isValidSlug(payload.slug) || await getStartupBySlug(payload.slug)) {
            throw new Error("Choose an unused page address before uploading a logo.");
          }
        } else if (!isProfile && !member) {
          throw new Error("Only signed-in team members can upload here.");
        }
        const rawPrefix = `startups/${payload.slug}/raw/`;
        const isRawVideo = pathname.startsWith(rawPrefix);
        const prefix = isProfile ? profilePrefix : isRawVideo ? rawPrefix : `startups/${payload.slug}/`;
        const filename = pathname.slice(prefix.length);
        const format = getMediaFormat(filename);
        if (!pathname.startsWith(prefix) || !isMediaFilename(filename) || !format
          || (isProfile && (format.type !== "image" || !filename.startsWith(`${user.id}-`)))
          || (isRawVideo ? format.type !== "video" : format.type === "video")) {
          throw new Error("Upload an image or video to this startup's media folder.");
        }
        if (isRawVideo && !process.env.MEDIA_JOB_SECRET) throw new Error("Video processing is unavailable.");
        const profileRole = /-cover\.[^.]+$/.test(filename) ? "cover" : "logo";
        if (isProfile && !/-(cover|logo)\.[^.]+$/.test(filename)) {
          throw new Error("Choose a logo or cover image before uploading.");
        }
        return {
          allowedContentTypes: [format.contentType],
          maximumSizeInBytes: format.type === "video" ? mediaLimits.video
            : getImageUploadMaximum(isProfile ? profileRole : "post", format.contentType),
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Couldn't authorize this upload. Check your team membership and file type, then try again." }, { status: 400 });
  }
}
