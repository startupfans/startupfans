import "server-only";

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { del, put } from "@vercel/blob";
import { mediaLimits, videoFastPresetPixels, videoMaximumSeconds } from "@/lib/media";
import { claimVideoJob, completeVideoJob, failVideoJob, validateVideoJobSource } from "@/lib/video-jobs";

const require = createRequire(import.meta.url);
const scale = "scale=w='max(2,trunc(iw*min(1,1080/max(iw,ih))/2)*2)':h='max(2,trunc(ih*min(1,1080/max(iw,ih))/2)*2)':flags=lanczos,setsar=1";

function ffmpegPath() {
  const installer: unknown = require("@ffmpeg-installer/ffmpeg");
  if (typeof installer !== "object" || installer === null || !("path" in installer) || typeof installer.path !== "string") {
    throw new Error("FFmpeg is unavailable.");
  }
  return installer.path;
}

type PosterFormat =
  | { extension: "webp"; contentType: "image/webp"; args: string[] }
  | { extension: "jpg"; contentType: "image/jpeg"; args: string[] };

function selectPosterFormat(): PosterFormat {
  const encoders = spawnSync(ffmpegPath(), ["-hide_banner", "-encoders"], {
    encoding: "utf8", timeout: 15000, maxBuffer: 512 * 1024,
  });
  if (encoders.status === 0 && /\blibwebp\s/.test(encoders.stdout)) {
    return { extension: "webp", contentType: "image/webp", args: ["-c:v", "libwebp", "-quality", "80"] };
  }
  return { extension: "jpg", contentType: "image/jpeg", args: ["-c:v", "mjpeg", "-q:v", "3"] };
}

let posterFormat: PosterFormat | undefined;

function getPosterFormat() {
  posterFormat ??= selectPosterFormat();
  return posterFormat;
}

// Only local files are accepted, including by demuxers which can open nested URLs.
async function runFfmpeg(args: string[], signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(ffmpegPath(), ["-hide_banner", "-nostdin", "-y", ...args], {
      stdio: ["ignore", "ignore", "pipe"], signal, killSignal: "SIGKILL",
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr = (stderr + chunk).slice(-32768); });
    child.once("error", () => reject(new Error("FFmpeg could not run.")));
    child.once("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error("FFmpeg failed."));
    });
  });
}

export async function probeVideoFile(input: string, signal = AbortSignal.timeout(15000)) {
  // The allowed FFmpeg package has no ffprobe executable. Its demuxer reports the
  // same container duration without decoding frames or fetching remote resources.
  const info = await runFfmpeg(["-protocol_whitelist", "file,pipe", "-threads", "1", "-i", input,
    "-map", "0:v:0", "-c:v", "copy", "-frames:v", "0", "-f", "null", "-"], signal);
  const duration = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(info);
  const dimensions = /Video:[^\n]*?\b([1-9]\d*)x([1-9]\d*)\b/.exec(info);
  if (!duration || !dimensions) throw new Error("Video metadata is unavailable.");
  return {
    duration: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]),
    width: Number(dimensions[1]), height: Number(dimensions[2]),
  };
}

export async function transcodeVideoFile(input: string, directory: string, {
  signal = AbortSignal.timeout(720000), enforceLimits = true, removeInput = false,
  onInputMetadata,
}: { signal?: AbortSignal; enforceLimits?: boolean; removeInput?: boolean;
  onInputMetadata?: (metadata: { width: number; height: number; duration: number; bytes: number }) => void } = {}) {
  const size = (await stat(input)).size;
  if (enforceLimits && size > mediaLimits.video) throw new Error("Video exceeds the byte limit.");
  const metadata = await probeVideoFile(input, signal);
  onInputMetadata?.({ ...metadata, bytes: size });
  if (metadata.duration <= 0 || (enforceLimits && metadata.duration > videoMaximumSeconds)) {
    throw new Error("Video exceeds the duration limit.");
  }
  const preset = metadata.width * metadata.height > videoFastPresetPixels || metadata.duration > 120 ? "fast" : "slow";
  const posterFormat = getPosterFormat();
  const videoPath = join(directory, "rendition.mp4");
  const posterPath = join(directory, `poster.${posterFormat.extension}`);
  const start = performance.now();
  await runFfmpeg(["-protocol_whitelist", "file,pipe", "-threads", "1", "-i", input,
    "-map", "0:v:0", "-map", "0:a:0?", "-vf", scale, "-filter_threads", "1",
    "-c:v", "libx264", "-crf", "21", "-preset", preset, "-threads", "1", "-pix_fmt", "yuv420p",
    "-vsync", "0", "-c:a", "aac", "-b:a", "128k", "-map_metadata", "-1", "-movflags", "+faststart", videoPath], signal);
  const encodeSeconds = (performance.now() - start) / 1000;
  if (removeInput) await rm(input, { force: true });
  await runFfmpeg(["-protocol_whitelist", "file,pipe", "-ss", String(metadata.duration * 0.1),
    "-threads", "1", "-i", videoPath, "-map", "0:v:0", "-frames:v", "1", "-vf", scale,
    "-filter_threads", "1", ...posterFormat.args, "-update", "1", posterPath], signal);
  return { videoPath, posterPath, posterExtension: posterFormat.extension, posterContentType: posterFormat.contentType, encodeSeconds, metadata, preset,
    videoBytes: (await stat(videoPath)).size, posterBytes: (await stat(posterPath)).size };
}

async function downloadRawVideo(url: string, path: string, signal: AbortSignal) {
  const response = await fetch(url, { redirect: "error", cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]) });
  if (!response.ok || !response.body || Number(response.headers.get("content-length")) > mediaLimits.video) {
    throw new Error("Raw video download failed.");
  }
  const reader = response.body.getReader();
  async function* limitedBody() {
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > mediaLimits.video) throw new Error("Raw video exceeds the byte limit.");
        yield value;
      }
    } finally {
      await reader.cancel();
    }
  }
  await pipeline(limitedBody(), createWriteStream(path), { signal });
}

export async function processVideoJob(postId: string) {
  const signal = AbortSignal.timeout(780000);
  const uploaded: string[] = [];
  let directory: string | null = null;
  let claimed = false;
  let published = false;
  let inputMetadata: { width: number; height: number; duration: number; bytes: number } | undefined;
  try {
    const post = await claimVideoJob(postId);
    if (!post?.raw) return;
    claimed = true;
    validateVideoJobSource(post.raw, post.slug);
    directory = await mkdtemp(join(tmpdir(), "startupfans-video-"));
    const input = join(directory, "original");
    await downloadRawVideo(post.raw, input, signal);
    const output = await transcodeVideoFile(input, directory, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(720000)]), removeInput: true,
      onInputMetadata: (metadata) => { inputMetadata = metadata; },
    });
    const prefix = `startups/${post.slug}/${randomUUID()}`;
    const video = await put(`${prefix}.mp4`, createReadStream(/* turbopackIgnore: true */ output.videoPath), {
      access: "public", contentType: "video/mp4", addRandomSuffix: false, abortSignal: signal,
    });
    uploaded.push(video.url);
    const poster = await put(`${prefix}.${output.posterExtension}`, createReadStream(/* turbopackIgnore: true */ output.posterPath), {
      access: "public", contentType: output.posterContentType, addRandomSuffix: false, abortSignal: signal,
    });
    uploaded.push(poster.url);
    const saved = await completeVideoJob(postId, video.url, poster.url);
    if (saved) {
      published = true;
      try { await del(post.raw, { abortSignal: AbortSignal.timeout(10000) }); }
      catch { console.error("[startupfans video] Raw cleanup failed.", { postId }); }
    }
  } catch {
    console.error("[startupfans video] Processing failed; retaining original.", { postId, ...inputMetadata });
    try { await failVideoJob(postId, claimed ? "encoding" : "processing"); }
    catch { console.error("[startupfans video] Could not save processing fallback.", { postId }); }
  } finally {
    if (uploaded.length && !published) {
      try { await del(uploaded, { abortSignal: AbortSignal.timeout(10000) }); }
      catch { console.error("[startupfans video] Rendition cleanup failed.", { postId }); }
    }
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
