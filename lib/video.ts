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
import { mediaLimits, videoFastPresetPixels } from "@/lib/media";
import { claimVideoJob, completeVideoJob, failVideoJob, validateVideoJobSource } from "@/lib/video-jobs";

const require = createRequire(import.meta.url);
const scale = "scale=w='max(2,trunc(iw*min(1,1080/max(iw,ih))/2)*2)':h='max(2,trunc(ih*min(1,1080/max(iw,ih))/2)*2)':flags=lanczos,setsar=1";
const diskInputLimit = 400 * 1024 * 1024;
const diskOutputLimit = 60 * 1024 * 1024;
const safetyMarginMs = 60000;
const jobBudgetMs = 710000;

// Single-thread local recipe measurements, multiplied by 2.5 for a 1 vCPU
// function. See AGENTS.md for the corpus, compute timings and derivation.
export const videoEncodeFactors = {
  hd: { slow: 2.1, fast: 1.35 },
  uhd: { slow: 3.15, fast: 2.39 },
  eightK: { fast: 11.81 },
};

type VideoMetadata = { width: number; height: number; duration: number };
type EncodingEstimate = { preset: "slow" | "fast"; estimate: number; downloadEstimate: number; remainingSeconds: number };
type EncodingPlan = EncodingEstimate & ({ status: "encode" } | { status: "raw"; reason: "budget" });

export function videoDownloadEstimate(bytes: number) {
  return 60 + Math.ceil(bytes / (1024 * 1024));
}

export function planVideoEncoding(metadata: VideoMetadata, bytes: number, remainingSeconds = jobBudgetMs / 1000,
  downloadEstimate = videoDownloadEstimate(bytes), inputMode: VideoInput["kind"] = "file"): EncodingPlan {
  const pixels = metadata.width * metadata.height;
  const factors = pixels <= 1920 * 1080 ? videoEncodeFactors.hd : videoEncodeFactors.uhd;
  const fastFactor = pixels > videoFastPresetPixels
    ? videoEncodeFactors.eightK.fast * Math.max(1, pixels / (7680 * 4320)) : factors.fast;
  const fast = { preset: "fast", estimate: metadata.duration * fastFactor, downloadEstimate, remainingSeconds } satisfies EncodingEstimate;
  const fitsBudget = (estimate: number) => {
    const workSeconds = inputMode === "pipe"
      ? Math.max(downloadEstimate, estimate) + 30 : downloadEstimate + estimate;
    return workSeconds + safetyMarginMs / 1000 < remainingSeconds;
  };
  if (pixels <= videoFastPresetPixels) {
    const slow = { ...fast, preset: "slow", estimate: metadata.duration * factors.slow } satisfies EncodingEstimate;
    if (fitsBudget(slow.estimate)) return { ...slow, status: "encode" };
  }
  if (fitsBudget(fast.estimate)) return { ...fast, status: "encode" };
  return { ...fast, status: "raw", reason: "budget" };
}

class VideoBudgetError extends Error {
  constructor(readonly plan: EncodingPlan) {
    super("Video encoding estimate exceeds the remaining job budget.");
  }
}

export function videoDownloadTimeout(bytes: number, remainingMs: number) {
  const available = Math.floor(remainingMs) - safetyMarginMs;
  if (available <= 0) throw new Error("Insufficient video job time.");
  return Math.min(videoDownloadEstimate(bytes) * 1000, available);
}

type VideoInput =
  | { kind: "file"; path: string; bytes: number }
  | { kind: "pipe"; url: string; bytes: number; deadline: number };

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

// Demuxers may open only local files or the explicitly supplied stdin pipe.
async function runFfmpeg(args: string[], signal: AbortSignal, input?: (signal: AbortSignal) => AsyncIterable<Uint8Array>) {
  const feeding = new AbortController();
  const feedSignal = AbortSignal.any([signal, feeding.signal]);
  // Evaluate feed preconditions before spawning a child with an open stdin.
  const source = input?.(feedSignal);
  let childExited = false;
  let feedError: unknown;
  let feed: Promise<void> | undefined;
  const result = new Promise<string>((resolve, reject) => {
    const child = spawn(ffmpegPath(), ["-hide_banner", "-nostdin", "-y", ...args], {
      stdio: ["pipe", "ignore", "pipe"], signal, killSignal: "SIGKILL",
    });
    child.once("exit", () => {
      childExited = true;
      feeding.abort();
    });
    if (source) {
      feed = pipeline(source, child.stdin, { signal: feedSignal }).catch((error: unknown) => {
        // Stdin can close before exit is observed; the exit status decides whether
        // EPIPE/premature close was an early successful probe or an FFmpeg failure.
        const stdinClosed = error instanceof Error && "code" in error
          && (error.code === "EPIPE" || error.code === "ERR_STREAM_PREMATURE_CLOSE");
        if (!childExited && child.exitCode !== 0 && !stdinClosed) {
          feedError = error;
          child.kill("SIGKILL");
        }
      });
    } else child.stdin.end();
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr = (stderr + chunk).slice(-32768); });
    child.once("error", () => reject(new Error("FFmpeg could not run.")));
    child.once("close", (code) => {
      childExited = true;
      feeding.abort();
      if (code === 0) resolve(stderr);
      else reject(new Error("FFmpeg failed."));
    });
  });
  try {
    const stderr = await result;
    await feed;
    if (feedError) throw new Error("Raw video stream failed.");
    return stderr;
  } finally {
    feeding.abort();
    await feed;
  }
}

async function probeVideoInput(input: VideoInput, signal: AbortSignal) {
  // The allowed FFmpeg package has no ffprobe executable. Its demuxer reports the
  // same container duration without decoding frames or fetching remote resources.
  const info = await runFfmpeg(["-protocol_whitelist", "file,pipe", "-threads", "1", "-i", input.kind === "file" ? input.path : "pipe:0",
    "-map", "0:v:0", "-c:v", "copy", "-frames:v", "0", "-f", "null", "-"], AbortSignal.any([signal, AbortSignal.timeout(60000)]),
    input.kind === "pipe" ? (feedSignal) => rawVideoBody(input.url, feedSignal, videoDownloadTimeout(input.bytes, input.deadline - performance.now()), mediaLimits.video, true) : undefined);
  const duration = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(info);
  const dimensions = /Video:[^\n]*?\b([1-9]\d*)x([1-9]\d*)\b/.exec(info);
  if (!duration || !dimensions) throw new Error("Video metadata is unavailable.");
  return {
    duration: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]),
    width: Number(dimensions[1]), height: Number(dimensions[2]),
  };
}

export async function probeVideoFile(input: string, signal = AbortSignal.timeout(60000)) {
  return probeVideoInput({ kind: "file", path: input, bytes: (await stat(input)).size }, signal);
}

export async function transcodeVideoFile(input: string, directory: string, {
  signal = AbortSignal.timeout(jobBudgetMs), deadline = performance.now() + jobBudgetMs, enforceLimits = true, removeInput = false,
  onInputMetadata,
}: { signal?: AbortSignal; deadline?: number; enforceLimits?: boolean; removeInput?: boolean;
  onInputMetadata?: (metadata: { width: number; height: number; duration: number; bytes: number }) => void } = {}) {
  return transcodeVideoInput({ kind: "file", path: input, bytes: (await stat(input)).size }, directory,
    { signal, deadline, enforceLimits, removeInput, onInputMetadata });
}

async function transcodeVideoInput(input: VideoInput, directory: string, {
  signal, deadline, enforceLimits = true, removeInput = false, onInputMetadata,
}: { signal: AbortSignal; deadline: number; enforceLimits?: boolean; removeInput?: boolean;
  onInputMetadata?: (metadata: { width: number; height: number; duration: number; bytes: number }) => void }) {
  const size = input.bytes;
  if (enforceLimits && size > mediaLimits.video) throw new Error("Video exceeds the byte limit.");
  const metadata = await probeVideoInput(input, signal);
  onInputMetadata?.({ ...metadata, bytes: size });
  if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) {
    throw new Error("Video duration is unavailable.");
  }
  // Disk transfer/probe time is already spent; stdin transfers while encoding.
  const plan = planVideoEncoding(metadata, size, (deadline - performance.now()) / 1000,
    input.kind === "pipe" ? videoDownloadEstimate(size) : 0, input.kind);
  if (plan.status === "raw") throw new VideoBudgetError(plan);
  const { preset } = plan;
  const posterFormat = getPosterFormat();
  const videoPath = join(directory, "rendition.mp4");
  const posterPath = join(directory, `poster.${posterFormat.extension}`);
  const start = performance.now();
  const outputLimit = new AbortController();
  const monitor = setInterval(() => {
    void stat(videoPath).then((info) => {
      if (info.size > diskOutputLimit) outputLimit.abort();
    }, () => {});
  }, 250);
  try {
    await runFfmpeg(["-protocol_whitelist", "file,pipe", "-threads", "1", "-i", input.kind === "file" ? input.path : "pipe:0",
      "-map", "0:v:0", "-map", "0:a:0?", "-vf", scale, "-filter_threads", "1",
      "-c:v", "libx264", "-crf", "21", "-preset", preset, "-threads", "1", "-pix_fmt", "yuv420p",
      "-vsync", "0", "-c:a", "aac", "-b:a", "128k", "-map_metadata", "-1", "-movflags", "+faststart", videoPath], AbortSignal.any([signal, outputLimit.signal,
        AbortSignal.timeout(Math.max(0, Math.floor(deadline - performance.now() - safetyMarginMs)))]),
      input.kind === "pipe" ? (feedSignal) => rawVideoBody(input.url, feedSignal, videoDownloadTimeout(input.bytes, input.deadline - performance.now()), mediaLimits.video, true) : undefined);
  } finally {
    clearInterval(monitor);
  }
  if ((await stat(videoPath)).size > diskOutputLimit) throw new Error("Video output exceeds temporary storage budget.");
  const encodeSeconds = (performance.now() - start) / 1000;
  if (removeInput && input.kind === "file") await rm(input.path, { force: true });
  await runFfmpeg(["-protocol_whitelist", "file,pipe", "-ss", String(metadata.duration * 0.1),
    "-threads", "1", "-i", videoPath, "-map", "0:v:0", "-frames:v", "1", "-vf", scale,
    "-filter_threads", "1", ...posterFormat.args, "-update", "1", posterPath], AbortSignal.any([signal, AbortSignal.timeout(60000)]));
  return { videoPath, posterPath, posterExtension: posterFormat.extension, posterContentType: posterFormat.contentType, encodeSeconds, metadata, preset,
    videoBytes: (await stat(videoPath)).size, posterBytes: (await stat(posterPath)).size, plan };
}

async function* rawVideoBody(url: string, signal: AbortSignal, timeoutMs: number, byteLimit: number, headersOnly = false) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const download = new AbortController();
  const expire = () => download.abort(timeoutSignal.reason);
  timeoutSignal.addEventListener("abort", expire, { once: true });
  try {
    const response = await fetch(url, { redirect: "error", cache: "no-store",
      signal: AbortSignal.any([signal, download.signal]) });
    // Detach the header timer: FFmpeg backpressure must use the encode budget.
    if (headersOnly) timeoutSignal.removeEventListener("abort", expire);
    if (!response.ok || !response.body || Number(response.headers.get("content-length")) > byteLimit) {
      await response.body?.cancel();
      throw new Error("Raw video download failed.");
    }
    const reader = response.body.getReader();
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > byteLimit) throw new Error("Raw video exceeds the byte limit.");
        yield value;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
  } finally {
    timeoutSignal.removeEventListener("abort", expire);
  }
}

async function readVideoRange(url: string, start: number, end: number, size: number, signal: AbortSignal) {
  const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` },
    redirect: "error", cache: "no-store", signal });
  if (response.status !== 206 || response.headers.get("content-range") !== `bytes ${start}-${end}/${size}` || !response.body) {
    await response.body?.cancel();
    throw new Error("Video range reads are unavailable.");
  }
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > end - start + 1) throw new Error("Invalid video range.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (bytes !== end - start + 1) throw new Error("Incomplete video range.");
  return Buffer.concat(chunks);
}

async function canPipeVideo(url: string, size: number, signal: AbortSignal) {
  if (size < 16) return false;
  const head = await readVideoRange(url, 0, 15, size, signal);
  // WebM uses a sequential EBML container and does not require a seekable input.
  if (head.readUInt32BE(0) === 0x1a45dfa3) return true;
  if (!["ftyp", "moov", "wide", "free", "skip"].includes(head.toString("ascii", 4, 8))) return false;
  const tailStart = Math.max(0, size - 65536);
  const tail = await readVideoRange(url, tailStart, size - 1, size, signal);
  let offset = 0;
  let mediaSeen = false;
  // Walk actual top-level atom boundaries; a moov byte string inside mdat is not metadata.
  for (let atoms = 0; atoms < 64 && offset + 8 <= size; atoms++) {
    const end = Math.min(size - 1, offset + 15);
    const header = offset === 0 ? head : offset >= tailStart
      ? tail.subarray(offset - tailStart, end - tailStart + 1)
      : await readVideoRange(url, offset, end, size, signal);
    const type = header.toString("ascii", 4, 8);
    const shortSize = header.readUInt32BE(0);
    if (shortSize === 1 && header.length < 16) return false;
    const atomSize = shortSize === 1 ? Number(header.readBigUInt64BE(8)) : shortSize || size - offset;
    if (!Number.isSafeInteger(atomSize) || atomSize < (shortSize === 1 ? 16 : 8) || offset + atomSize > size) return false;
    if (type === "moov") return !mediaSeen;
    if (type === "mdat") mediaSeen = true;
    offset += atomSize;
  }
  return false;
}

export async function transcodeRawVideo(url: string, directory: string, {
  deadline = performance.now() + jobBudgetMs, signal = AbortSignal.timeout(jobBudgetMs), onInputMetadata,
}: { deadline?: number; signal?: AbortSignal;
  onInputMetadata?: (metadata: { width: number; height: number; duration: number; bytes: number }) => void } = {}) {
  const inspectionSignal = AbortSignal.any([signal, AbortSignal.timeout(60000)]);
  const response = await fetch(url, { method: "HEAD", redirect: "error", cache: "no-store", signal: inspectionSignal });
  const length = response.headers.get("content-length");
  const size = length === null ? null : Number(length);
  if (!response.ok || (size !== null && (!Number.isSafeInteger(size) || size <= 0 || size > mediaLimits.video))) {
    throw new Error("Raw video size is unavailable or exceeds the limit.");
  }
  let pipe = false;
  try { pipe = size !== null && await canPipeVideo(url, size, inspectionSignal); }
  catch { signal.throwIfAborted(); }
  const downloadMs = videoDownloadTimeout(size ?? mediaLimits.video, deadline - performance.now());
  let input: VideoInput;
  if (pipe && size !== null) {
    input = { kind: "pipe", url, bytes: size, deadline };
  } else {
    if (size !== null && size > diskInputLimit) throw new Error("Seekable raw video exceeds temporary storage budget.");
    const path = join(directory, "original");
    await pipeline(rawVideoBody(url, signal, downloadMs, diskInputLimit), createWriteStream(path), { signal });
    const downloadedSize = (await stat(path)).size;
    if (size !== null && downloadedSize !== size) throw new Error("Incomplete raw video download.");
    input = { kind: "file", path, bytes: downloadedSize };
  }
  const remainingMs = Math.floor(deadline - performance.now());
  if (remainingMs <= 0) throw new Error("Video job time expired.");
  const output = await transcodeVideoInput(input, directory, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(remainingMs)]), deadline,
    removeInput: true, onInputMetadata,
  });
  return { ...output, inputMode: input.kind };
}

export async function processVideoJob(postId: string, deadline = performance.now() + jobBudgetMs) {
  const signal = AbortSignal.timeout(Math.max(0, Math.floor(deadline - performance.now())));
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
    const output = await transcodeRawVideo(post.raw, directory, {
      signal, deadline,
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
  } catch (error) {
    if (error instanceof VideoBudgetError) {
      console.info("[startupfans video] Retaining original quality.", { postId, ...inputMetadata, ...error.plan });
    } else {
      console.error("[startupfans video] Processing failed; retaining original quality.", { postId, ...inputMetadata });
    }
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
