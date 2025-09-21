import { NextResponse } from "next/server";
import fs from "fs";
import { createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { spawnSync } from "child_process";
import { getLocalMeta } from "@/lib/localstorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THUMBS_DIR = process.env.MEDIA_THUMBS_DIR || "/mnt/cephfs/container/thumbs";
const MAX_W = 1600, MIN_W = 48;
const MAX_Q = 90, MIN_Q = 30;

// Pick best format the server can actually encode
function pickFormat(accept: string | null | undefined) {
  const can = sharp.format;
  const wantsAvif = (accept || "").toLowerCase().includes("image/avif");
  const wantsWebp = (accept || "").toLowerCase().includes("image/webp");
  if (wantsAvif && can.avif?.output) return "avif" as const;
  if (wantsWebp && can.webp?.output) return "webp" as const;
  if (can.webp?.output) return "webp" as const;
  return "png" as const;
}

// If encoding fails, try a safer fallback chain
function nextFallback(fmt: "avif" | "webp" | "png") {
  if (fmt === "avif") return "webp" as const;
  if (fmt === "webp") return "png" as const;
  return null;
}

function etagFor(fp: string) {
  const st = fs.statSync(fp);
  const h = crypto.createHash("sha1").update(`${fp}:${st.size}:${st.mtimeMs}`).digest("hex").slice(0, 16);
  return `"t-${h}"`;
}

function subdirFor(id: string) {
  return path.join(THUMBS_DIR, id.slice(0, 2), id.slice(2, 4));
}
function cachePath(id: string, w: number, q: number, fmt: "avif"|"webp"|"png") {
  const sub = subdirFor(id);
  fs.mkdirSync(sub, { recursive: true });
  return path.join(sub, `${id}-${w}-${q}.${fmt}`);
}

function headersFor(fp: string, contentType: string, varyAccept = true) {
  const st = fs.statSync(fp);
  const h = new Headers();
  h.set("Content-Type", contentType);
  h.set("Content-Length", String(st.size));
  h.set("Cache-Control", "public, max-age=31536000, immutable");
  h.set("ETag", etagFor(fp));
  if (varyAccept) h.set("Vary", "Accept");
  return h;
}

function ffmpegFrame(srcPath: string): Buffer | null {
  try {
    const out = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-ss", "00:00:01.000",
      "-i", srcPath,
      "-frames:v", "1",
      "-f", "image2pipe",
      "-vcodec", "png",
      "pipe:1",
    ], { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 });
    if (out.status === 0 && out.stdout?.length) return out.stdout as Buffer;
  } catch { /* ignore */ }
  return null;
}

async function generateThumb(meta: { path: string; mimeType: string }, w: number, q: number, preferFmt: "avif"|"webp"|"png") {
  // Build a sharp pipeline from file or from video frame buffer
  let inputBuffer: Buffer | null = null;
  if (meta.mimeType.startsWith("image/")) {
    // sharp can read many formats (jpeg/png/webp/avif/svg/heic if compiled). If unsupported, it will throw which we’ll catch below.
  } else if (meta.mimeType.startsWith("video/")) {
    inputBuffer = ffmpegFrame(meta.path);
    if (!inputBuffer) {
      // Graceful placeholder: 1x1 transparent PNG
      return { buffer: Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63600000020001575fe2660000000049454e44ae426082","hex"), fmt: "png" as const };
    }
  } else if (meta.mimeType === "image/svg+xml") {
    // Allowed; SHARP rasterizes SVG
  } else {
    // Unsupported
    return null;
  }

  let fmt: "avif"|"webp"|"png" | null = preferFmt;
  while (fmt) {
    try {
      let p = inputBuffer ? sharp(inputBuffer) : sharp(meta.path);
      p = p.rotate().resize({ width: w, withoutEnlargement: true });
      if (fmt === "avif") p = p.avif({ quality: q });
      else if (fmt === "webp") p = p.webp({ quality: q });
      else p = p.png({ compressionLevel: 9 });
      const out = await p.toBuffer();
      return { buffer: out, fmt };
    } catch {
      fmt = nextFallback(fmt);
    }
  }
  return null;
}

export async function HEAD(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const w = Math.max(MIN_W, Math.min(MAX_W, parseInt(url.searchParams.get("w") || "480", 10)));
  const q = Math.max(MIN_Q, Math.min(MAX_Q, parseInt(url.searchParams.get("q") || "70", 10)));
  const fmt = pickFormat(req.headers.get("accept"));
  const fp = cachePath(id, w, q, fmt);
  if (!fs.existsSync(fp)) return new NextResponse(null, { status: 404 });
  const h = headersFor(fp, `image/${fmt}`);
  return new NextResponse(null, { status: 200, headers: h });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  ensureThumbsDir();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const w = Math.max(MIN_W, Math.min(MAX_W, parseInt(url.searchParams.get("w") || "480", 10)));
  const q = Math.max(MIN_Q, Math.min(MAX_Q, parseInt(url.searchParams.get("q") || "70", 10)));

  const accept = req.headers.get("accept");
  const preferFmt = pickFormat(accept);
  const cached = cachePath(id, w, q, preferFmt);

  try {
    const meta = await getLocalMeta(id);
    if (!meta?.path || !meta?.mimeType) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (fs.existsSync(cached)) {
      const h = headersFor(cached, `image/${preferFmt}`);
      if (req.headers.get("if-none-match") === h.get("ETag")) {
        return new NextResponse(null, { status: 304, headers: h });
      }
      return new NextResponse(createReadStream(cached) as any, { status: 200, headers: h });
    }

    if (!thumbsReady) {
      return NextResponse.json({ error: "Thumb cache dir not writable" }, { status: 500 });
    }

    const gen = await generateThumb(meta, w, q, preferFmt);
    if (!gen) {
      return NextResponse.json({ error: "Unsupported media type or encoder not available" }, { status: 415 });
    }

    const finalPath = cached.endsWith(`.${gen.fmt}`) ? cached : cached.replace(/\.(avif|webp|png)$/, `.${gen.fmt}`);
    fs.writeFileSync(finalPath, gen.buffer);

    const h = headersFor(finalPath, `image/${gen.fmt}`);
    return new NextResponse(createReadStream(finalPath) as any, { status: 200, headers: h });
  } catch (e) {
    // Last-ditch helpful error to logs
    console.error("thumb error", { id, w, q, preferFmt, err: (e as Error)?.message });
    return NextResponse.json({ error: "Thumb generation failed" }, { status: 500 });
  }
}
