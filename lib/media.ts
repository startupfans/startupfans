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

export const mediaLimits = { image: 10 * 1024 * 1024, video: 200 * 1024 * 1024 };

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
