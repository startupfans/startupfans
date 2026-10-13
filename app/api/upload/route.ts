import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { getPostMembership } from "@/lib/posts";
import { getMediaContentTypes, getMediaFormat, isMediaFilename, mediaLimits } from "@/lib/media";

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
        const payload: unknown = JSON.parse(clientPayload ?? "null");
        if (!isRecord(payload) || typeof payload.slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(payload.slug)) {
          throw new Error("Choose a startup before uploading.");
        }
        const user = await getCurrentUser();
        if (!user || !await getPostMembership(payload.slug, user.id)) {
          throw new Error("Only signed-in team members can upload here.");
        }
        const prefix = `startups/${payload.slug}/`;
        const filename = pathname.slice(prefix.length);
        const format = getMediaFormat(filename);
        if (!pathname.startsWith(prefix) || !isMediaFilename(filename) || !format) {
          throw new Error("Upload an image or video to this startup's media folder.");
        }
        return {
          allowedContentTypes: getMediaContentTypes(format.type),
          maximumSizeInBytes: mediaLimits[format.type],
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Couldn't authorize this upload. Check your team membership and file type, then try again." }, { status: 400 });
  }
}
