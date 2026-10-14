export type MediaType = "image" | "video";
type MediaFormat = { type: MediaType; contentType: string; extensions: string[] };

export const mediaFormats = [
  { type: "image", contentType: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { type: "image", contentType: "image/png", extensions: ["png"] },
  { type: "image", contentType: "image/webp", extensions: ["webp"] },
  { type: "image", contentType: "image/gif", extensions: ["gif"] },
  { type: "image", contentType: "image/avif", extensions: ["avif"] },
  { type: "video", contentType: "video/mp4", extensions: ["mp4"] },
  { type: "video", contentType: "video/webm", extensions: ["webm"] },
  { type: "video", contentType: "video/quicktime", extensions: ["mov"] },
  { type: "video", contentType: "video/x-m4v", extensions: ["m4v"] },
] satisfies MediaFormat[];

const pickerMediaFormats = [
  ...mediaFormats,
  { type: "image", contentType: "image/heic", extensions: ["heic"] },
  { type: "image", contentType: "image/heif", extensions: ["heif"] },
] satisfies MediaFormat[];

export type ImageRole = "post" | "reply" | "cover" | "avatar" | "logo";

export const imageTargets = {
  post: { longEdge: 2048, maximumBytes: 2 * 1024 * 1024 },
  reply: { longEdge: 2048, maximumBytes: 2 * 1024 * 1024 },
  cover: { longEdge: 1800, maximumBytes: 1024 * 1024 },
  avatar: { longEdge: 512, maximumBytes: 250 * 1024 },
  logo: { longEdge: 512, maximumBytes: 250 * 1024 },
} satisfies Record<ImageRole, { longEdge: number; maximumBytes: number }>;

export const imageQuality = { webp: 0.82, jpeg: 0.85 };
export const gifMaximumBytes = 4 * 1024 * 1024;
export const graphicPngMaximumBytes = 1024 * 1024;
export const videoMaximumSeconds = 60;
export const mediaLimits = { image: 10 * 1024 * 1024, video: 50 * 1024 * 1024 };

export function getImageUploadMaximum(role: ImageRole, contentType: string) {
  if (contentType === "image/gif") return gifMaximumBytes;
  if ((role === "avatar" || role === "logo") && contentType === "image/png") return graphicPngMaximumBytes;
  return imageTargets[role].maximumBytes;
}

export function getMediaAccept(type?: MediaType) {
  return pickerMediaFormats.filter((format) => !type || format.type === type)
    .flatMap((format) => [format.contentType, ...format.extensions.map((extension) => `.${extension}`)])
    .join(",");
}

export function getMediaContentTypes(type: MediaType) {
  return mediaFormats.filter((format) => format.type === type).map((format) => format.contentType);
}

function findMediaFormat(pathname: string, formats: MediaFormat[]) {
  const extension = pathname.split(".").at(-1)?.toLowerCase();
  return formats.find((format) => extension !== undefined && format.extensions.includes(extension)) ?? null;
}

export function getMediaFormat(pathname: string) {
  return findMediaFormat(pathname, mediaFormats);
}

export function getFileMediaFormat(file: { name: string; type: string }) {
  return findMediaFormat(file.name, pickerMediaFormats)
    ?? pickerMediaFormats.find((format) => format.contentType === file.type.toLowerCase()) ?? null;
}

export function isMediaFilename(filename: string) {
  return /^[-a-zA-Z0-9_]+[-a-zA-Z0-9_.]*\.[a-zA-Z0-9]+$/.test(filename) && getMediaFormat(filename) !== null;
}

export function isReplyImageUrl(value: string, userId: string) {
  try {
    const url = new URL(value);
    const prefix = `/users/${userId}/replies/`;
    const filename = url.pathname.slice(prefix.length);
    return url.protocol === "https:" && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)
      && url.port === "" && url.username === "" && url.password === ""
      && url.search === "" && url.hash === "" && url.pathname.startsWith(prefix)
      && isMediaFilename(filename) && getMediaFormat(filename)?.type === "image";
  } catch {
    return false;
  }
}
