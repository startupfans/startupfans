import { getFileMediaFormat, getImageUploadMaximum, gifMaximumBytes, imageQuality, imageTargets, mediaLimits, videoMaximumSeconds, type ImageRole } from "@/lib/media";

function checkAborted(signal?: AbortSignal) {
  signal?.throwIfAborted();
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* Older decoders can still use the orientation-aware image element. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Couldn't read this image. Export it as JPEG or PNG and try again.");
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Couldn't compress this image. Choose another file.")), type, quality);
  });
}

function hasAlpha(context: CanvasRenderingContext2D, width: number, height: number) {
  const pixels = context.getImageData(0, 0, width, height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) return true;
  }
  return false;
}

export async function downscaleImage(file: File, role: ImageRole, signal?: AbortSignal): Promise<File> {
  checkAborted(signal);
  const format = getFileMediaFormat(file);
  if (!format || format.type !== "image") throw new Error("Choose a JPEG, PNG, WebP, GIF, AVIF, HEIC or HEIF image.");
  if (format.contentType === "image/gif") {
    if (file.size > gifMaximumBytes) throw new Error("Animated GIFs must be 4 MB or smaller.");
    return file;
  }
  if (file.size > mediaLimits.image) throw new Error("Images must be 10 MB or smaller before compression.");
  let image = file;
  if (format.contentType === "image/heic" || format.contentType === "image/heif") {
    try {
      const { default: heic2any } = await import("heic2any");
      checkAborted(signal);
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const jpeg = Array.isArray(converted) ? converted[0] : converted;
      if (!jpeg) throw new Error("No converted photo.");
      image = new File([jpeg], "image.jpg", { type: "image/jpeg" });
    } catch {
      checkAborted(signal);
      throw new Error("Couldn't convert this photo. Export it as JPEG and try again.");
    }
  }
  checkAborted(signal);
  const decoded = await decodeImage(image);
  try {
    checkAborted(signal);
    const target = imageTargets[role];
    const longEdge = Math.max(decoded.width, decoded.height);
    if (!longEdge) throw new Error("Couldn't read this image. Choose another file.");
    if (longEdge <= target.longEdge && image.size <= target.maximumBytes) return image;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: role === "logo" });
    if (!context) throw new Error("Couldn't compress this image in your browser. Try another browser.");
    let edge = Math.min(longEdge, target.longEdge);
    while (edge >= 1) {
      checkAborted(signal);
      canvas.width = Math.max(1, Math.round(decoded.width * edge / longEdge));
      canvas.height = Math.max(1, Math.round(decoded.height * edge / longEdge));
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      // Canvas has no lossless WebP encoder setting, so transparent logos use PNG.
      const transparentLogo = role === "logo" && hasAlpha(context, canvas.width, canvas.height);
      let blob = await encode(canvas, transparentLogo ? "image/png" : "image/webp", imageQuality.webp);
      if (!transparentLogo && blob.type !== "image/webp") {
        const keepAlpha = hasAlpha(context, canvas.width, canvas.height);
        blob = await encode(canvas, keepAlpha ? "image/png" : "image/jpeg", imageQuality.jpeg);
      }
      // Give small graphics the lossless PNG allowance before reducing their dimensions.
      if ((role === "avatar" || role === "logo") && blob.size > target.maximumBytes) {
        const png = await encode(canvas, "image/png");
        if (png.size <= getImageUploadMaximum(role, png.type)) blob = png;
      }
      checkAborted(signal);
      if (blob.size <= getImageUploadMaximum(role, blob.type)) {
        const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
        return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${extension}`, { type: blob.type });
      }
      if (edge === 1) break;
      edge = Math.max(1, Math.floor(edge * 0.8));
    }
    throw new Error(`Couldn't compress this ${role} image to fit its upload limit. Choose a simpler or smaller image.`);
  } finally {
    decoded.close();
  }
}

export async function validateVideo(file: File, signal?: AbortSignal): Promise<void> {
  checkAborted(signal);
  if (file.size > mediaLimits.video) throw new Error("Videos must be 500 MB or smaller.");
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        video.onloadedmetadata = null;
        video.onerror = null;
      };
      const finish = (error?: Error) => { cleanup(); if (error) reject(error); else resolve(); };
      const abort = () => finish(new DOMException("Upload cancelled.", "AbortError"));
      const timeout = setTimeout(() => finish(new Error("Couldn't read this video's duration. Export it as MP4 and try again.")), 15000);
      signal?.addEventListener("abort", abort, { once: true });
      video.onloadedmetadata = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) finish(new Error("Couldn't read this video's duration. Export it as MP4 and try again."));
        else if (video.duration > videoMaximumSeconds) finish(new Error(`Videos must be ${videoMaximumSeconds / 60} minutes or shorter.`));
        else finish();
      };
      video.onerror = () => finish(new Error("Couldn't read this video. Export it as MP4 and try again."));
      video.preload = "metadata";
      video.src = url;
    });
    checkAborted(signal);
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
