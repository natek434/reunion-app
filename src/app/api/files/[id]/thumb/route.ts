// src/app/api/files/[id]/thumb/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import { createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { spawnSync } from "child_process";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Config
const THUMBS_DIR  = process.env.MEDIA_THUMBS_DIR  || "/tmp/thumbs";
const UPLOADS_DIR = process.env.MEDIA_UPLOADS_DIR;
const MAX_W = 1600, MIN_W = 48;
const MAX_Q = 90,  MIN_Q = 30;
const LOG_NS = "thumb";

// ------- tiny logger + debug header collector -------
type Lvl = "debug" | "info" | "warn" | "error";
function log(level: Lvl, msg: string, extra: Record<string, unknown> = {}) {
  try {
    // keep single-line JSON logs for grep
    // eslint-disable-next-line no-console
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      JSON.stringify({ ns: LOG_NS, level, msg, ...extra })
    );
  } catch {}
}
function startTimer() {
  const t0 = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - t0) / 1e6; // ms
}
function addDebug(h: Headers, key: string, val: string | number | boolean | null | undefined) {
  if (val === undefined) return;
  h.append(`X-Thumb-${key}`, String(val));
}
// ----------------------------------------------------

let thumbsReady = false;
function ensureThumbsDir() {
  if (thumbsReady) return;
  try {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
    fs.accessSync(THUMBS_DIR, fs.constants.W_OK);
    thumbsReady = true;
    log("debug", "thumbs dir ready", { THUMBS_DIR });
  } catch (e) {
    thumbsReady = false;
    log("error", "thumbs dir not writable", { THUMBS_DIR, err: (e as Error)?.message });
  }
}

function pickFormat(accept: string | null | undefined) {
  const can = sharp.format;
  const wantsAvif = (accept || "").toLowerCase().includes("image/avif");
  const wantsWebp = (accept || "").toLowerCase().includes("image/webp");
  if (wantsAvif && can.avif?.output) return "avif" as const;
  if (wantsWebp && can.webp?.output) return "webp" as const;
  if (can.webp?.output) return "webp" as const;
  return "png" as const;
}
function nextFallback(fmt: "avif" | "webp" | "png") {
  if (fmt === "avif") return "webp";
  if (fmt === "webp") return "png";
  return null;
}
function sha1(s: string) { return crypto.createHash("sha1").update(s).digest("hex"); }
function safeBaseName(p: string) {
  const base = path.parse(p).name || "file";
  return base.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80);
}
function cacheKeyFor(srcPath: string) { return sha1(srcPath).slice(0, 8); }
function subdirFor(key: string) { return path.join(THUMBS_DIR, key.slice(0, 2), key.slice(2, 4)); }
function cacheBasename(srcPath: string, key: string, w: number, q: number) {
  return `${safeBaseName(srcPath)}-${key}-${w}-${q}`;
}
function cachePath(srcPath: string, w: number, q: number, fmt: "avif" | "webp" | "png") {
  const key = cacheKeyFor(srcPath);
  const sub = subdirFor(key);
  fs.mkdirSync(sub, { recursive: true });
  const name = cacheBasename(srcPath, key, w, q);
  return path.join(sub, `${name}.${fmt}`);
}
function findAnyCached(srcPath: string, w: number, q: number) {
  const key = cacheKeyFor(srcPath);
  const sub = subdirFor(key);
  const name = cacheBasename(srcPath, key, w, q);
  for (const ext of ["avif", "webp", "png"] as const) {
    const p = path.join(sub, `${name}.${ext}`);
    if (fs.existsSync(p)) return { path: p, fmt: ext as "avif" | "webp" | "png" };
  }
  return null;
}
function etagFor(fp: string) {
  const st = fs.statSync(fp);
  const h = sha1(`${fp}:${st.size}:${st.mtimeMs}`).slice(0, 16);
  return `"t-${h}"`;
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
    log("warn", "ffmpeg no frame", { status: out.status, stderrLen: out.stderr?.length ?? 0 });
  } catch (e) {
    log("warn", "ffmpeg error", { err: (e as Error)?.message });
  }
  return null;
}
async function generateThumb(
  meta: { path: string; mimeType: string },
  w: number, q: number, preferFmt: "avif" | "webp" | "png"
) {
  const stop = startTimer();
  let inputBuffer: Buffer | null = null;

  if (meta.mimeType.startsWith("image/")) {
    // read file via sharp(meta.path)
    log("debug", "generateThumb: image path", { path: meta.path, w, q, preferFmt });
  } else if (meta.mimeType.startsWith("video/")) {
    log("debug", "generateThumb: video probe", { path: meta.path });
    inputBuffer = ffmpegFrame(meta.path);
    if (!inputBuffer) {
      log("warn", "video frame fallback to 1x1", { path: meta.path });
      return {
        buffer: Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63600000020001575fe2660000000049454e44ae426082", "hex"),
        fmt: "png" as const,
      };
    }
  } else if (meta.mimeType === "image/svg+xml") {
    log("debug", "generateThumb: svg rasterize", { path: meta.path });
  } else {
    log("warn", "unsupported mime", { mime: meta.mimeType, path: meta.path });
    return null;
  }

  let fmt: "avif" | "webp" | "png" | null = preferFmt;
  while (fmt) {
    try {
      let p = inputBuffer ? sharp(inputBuffer) : sharp(meta.path);
      p = p.rotate().resize({ width: w, withoutEnlargement: true });
      if (fmt === "avif") p = p.avif({ quality: q });
      else if (fmt === "webp") p = p.webp({ quality: q });
      else p = p.png({ compressionLevel: 9 });
      const out = await p.toBuffer();
      log("info", "thumb generated", { fmt, ms: stop() });
      return { buffer: out, fmt };
    } catch (e) {
      log("warn", "encode failed, falling back", { fmt, err: (e as Error)?.message });
      fmt = nextFallback(fmt);
    }
  }
  log("error", "all encoders failed");
  return null;
}

function isLikelyId(s: string) {
  // Adjust if you use UUID/ULID; this catches Prisma cuid-like
  return /^c[a-z0-9]{10,}$/i.test(s);
}
function guessMime(fp: string): string {
  const ext = path.extname(fp).toLowerCase();
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if ([".mp4", ".m4v"].includes(ext)) return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

// Resolve id or filename to { path, mimeType }, with logs at each branch
async function resolveMeta(idOrName: string): Promise<{ path: string; mimeType: string } | null> {
  log("debug", "resolveMeta: start", { idOrName, UPLOADS_DIR });

  // 1) If it looks like an id, hit DB
  if (isLikelyId(idOrName)) {
    try {
      const row = await prisma.galleryItem.findUnique({
        where: { id: idOrName },
        select: { fileName: true, mimeType: true },
      });
      if (row?.fileName) {
        const fp = path.join(UPLOADS_DIR, row.fileName);
        log("debug", "resolveMeta: DB hit", { fileName: row.fileName, fp, exists: fs.existsSync(fp) });
        if (fs.existsSync(fp)) return { path: fp, mimeType: row.mimeType || guessMime(fp) };
      } else {
        log("warn", "resolveMeta: DB miss", { idOrName });
      }
    } catch (e) {
      log("error", "resolveMeta: DB error", { err: (e as Error)?.message });
    }
  }

  // 2) Try as literal filename
  const fp = path.join(UPLOADS_DIR, idOrName);
  if (fs.existsSync(fp)) {
    log("debug", "resolveMeta: literal filename exists", { fp });
    return { path: fp, mimeType: guessMime(fp) };
  } else {
    log("debug", "resolveMeta: literal filename missing", { fp });
  }

  // 3) Last resort: lookup by fileName in DB
  try {
    const byName = await prisma.galleryItem.findFirst({
      where: { fileName: idOrName },
      select: { fileName: true, mimeType: true },
    });
    if (byName?.fileName) {
      const fp2 = path.join(UPLOADS_DIR, byName.fileName);
      log("debug", "resolveMeta: DB byName", { fileName: byName.fileName, fp2, exists: fs.existsSync(fp2) });
      if (fs.existsSync(fp2)) return { path: fp2, mimeType: byName.mimeType || guessMime(fp2) };
    }
  } catch (e) {
    log("error", "resolveMeta: DB byName error", { err: (e as Error)?.message });
  }

  log("warn", "resolveMeta: failed", { idOrName });
  return null;
}

export async function HEAD(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  ensureThumbsDir();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const w = Math.max(MIN_W, Math.min(MAX_W, parseInt(url.searchParams.get("w") || "480", 10)));
  const q = Math.max(MIN_Q, Math.min(MAX_Q, parseInt(url.searchParams.get("q") || "70", 10)));
  const preferFmt = pickFormat(req.headers.get("accept"));

  const meta = await resolveMeta(id);
  if (!meta) {
    log("info", "HEAD: 404 meta", { id, w, q, preferFmt });
    return new NextResponse(null, { status: 404 });
  }

  const existing = findAnyCached(meta.path, w, q);
  if (!existing) {
    log("info", "HEAD: 404 no cache", { id, src: meta.path, w, q });
    return new NextResponse(null, { status: 404 });
  }

  const h = headersFor(existing.path, `image/${existing.fmt}`);
  if (debug) {
    addDebug(h, "Mode", "HEAD");
    addDebug(h, "Src", meta.path);
    addDebug(h, "Cached", existing.path);
    addDebug(h, "Fmt", existing.fmt);
    addDebug(h, "W", w);
    addDebug(h, "Q", q);
    addDebug(h, "TimeMs", stop().toFixed(2));
  }
  log("info", "HEAD: 200 cache-hit", { id, fmt: existing.fmt, path: existing.path, ms: stop() });
  return new NextResponse(null, { status: 200, headers: h });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  ensureThumbsDir();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const w = Math.max(MIN_W, Math.min(MAX_W, parseInt(url.searchParams.get("w") || "480", 10)));
  const q = Math.max(MIN_Q, Math.min(MAX_Q, parseInt(url.searchParams.get("q") || "70", 10)));
  const preferFmt = pickFormat(req.headers.get("accept"));

  const baseHeaders = new Headers();
  if (debug) {
    addDebug(baseHeaders, "Mode", "GET");
    addDebug(baseHeaders, "Accept", req.headers.get("accept") || "");
    addDebug(baseHeaders, "PreferFmt", preferFmt);
    addDebug(baseHeaders, "W", w);
    addDebug(baseHeaders, "Q", q);
    addDebug(baseHeaders, "UploadsDir", UPLOADS_DIR);
    addDebug(baseHeaders, "ThumbsDir", THUMBS_DIR);
  }

  if (!thumbsReady) {
    addDebug(baseHeaders, "Error", "Thumbs dir not writable");
    log("error", "GET: 503 thumbs dir not writable", { THUMBS_DIR });
    return new NextResponse(
      JSON.stringify({ error: "Thumb cache dir not writable", dir: THUMBS_DIR }),
      { status: 503, headers: baseHeaders }
    );
  }

  try {
    const meta = await resolveMeta(id);
    if (!meta) {
      addDebug(baseHeaders, "Error", "Meta not found");
      log("info", "GET: 404 meta", { id });
      return new NextResponse(JSON.stringify({ error: "Not found" }), { status: 404, headers: baseHeaders });
    }

    addDebug(baseHeaders, "Src", meta.path);
    addDebug(baseHeaders, "SrcMime", meta.mimeType);

    const existing = findAnyCached(meta.path, w, q);
    if (existing) {
      const h = headersFor(existing.path, `image/${existing.fmt}`);
      // copy base debug headers
      if (debug) {
        for (const [k, v] of baseHeaders.entries()) h.append(k, v);
        addDebug(h, "Cached", existing.path);
        addDebug(h, "Fmt", existing.fmt);
        addDebug(h, "Hit", true);
        addDebug(h, "TimeMs", stop().toFixed(2));
      }
      if (req.headers.get("if-none-match") === h.get("ETag")) {
        log("info", "GET: 304", { id, path: existing.path, ms: stop() });
        return new NextResponse(null, { status: 304, headers: h });
      }
      log("info", "GET: 200 cache-hit", { id, path: existing.path, ms: stop() });
      return new NextResponse(createReadStream(existing.path) as any, { status: 200, headers: h });
    }

    addDebug(baseHeaders, "Hit", false);
    log("debug", "GET: cache-miss, generating", { id, w, q, preferFmt });

    const gen = await generateThumb(meta, w, q, preferFmt);
    if (!gen) {
      addDebug(baseHeaders, "Error", "Encode unsupported");
      log("warn", "GET: 415 unsupported encode", { id, mime: meta.mimeType });
      return new NextResponse(
        JSON.stringify({ error: "Unsupported media type or encoder not available" }),
        { status: 415, headers: baseHeaders }
      );
    }

    const outPath = cachePath(meta.path, w, q, gen.fmt);
    fs.writeFileSync(outPath, gen.buffer);
    log("info", "GET: wrote cache", { outPath });

    const h = headersFor(outPath, `image/${gen.fmt}`);
    if (debug) {
      for (const [k, v] of baseHeaders.entries()) h.append(k, v);
      addDebug(h, "Cached", outPath);
      addDebug(h, "Fmt", gen.fmt);
      addDebug(h, "TimeMs", stop().toFixed(2));
    }

    log("info", "GET: 200 generated", { id, fmt: gen.fmt, ms: stop() });
    return new NextResponse(createReadStream(outPath) as any, { status: 200, headers: h });
  } catch (e) {
    addDebug(baseHeaders, "Error", (e as Error)?.message || "unknown");
    log("error", "GET: 500", { id, err: (e as Error)?.message });
    return new NextResponse(JSON.stringify({ error: "Thumb generation failed" }), { status: 500, headers: baseHeaders });
  }
}
