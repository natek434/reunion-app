// src/lib/localstorage.ts
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import mime from "mime-types";

/**
 * Root upload directory. In Docker/compose set:
 *   LOCAL_UPLOAD_DIR=/data/uploads
 * and bind-mount the host path to /data/uploads.
 */
const ROOT = path.resolve(process.env.LOCAL_UPLOAD_DIR || "uploads");

/** Make sure a directory exists (recursive). */
async function ensureDir(absDir: string) {
  await fsp.mkdir(absDir, { recursive: true });
}

/** Prevent path traversal: join to ROOT and verify the result stays inside ROOT. */
function safeJoin(rel: string) {
  const cleaned = rel.replace(/^[/\\]+/, ""); // strip leading slashes
  const abs = path.resolve(ROOT, cleaned);
  if (!(abs === ROOT || abs.startsWith(ROOT + path.sep))) {
    throw new Error("Invalid path");
  }
  return abs;
}

/** Create a safe filename with original base + random suffix to avoid collisions. */
function uniqueSafeName(orig: string) {
  const base = path.basename(orig).replace(/[^A-Za-z0-9._-]/g, "_");
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length) || "file";
  const rand = crypto.randomBytes(6).toString("hex");
  return `${stem}.${rand}${ext}`;
}

/** Public: upload buffer to disk. Optionally into a subdirectory (e.g. userId). */
export async function uploadToLocal(opts: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  subdir?: string; // e.g. a userId to bucket files
}) {
  const { fileName, mimeType, buffer, subdir } = opts;

  // Choose target directory
  const relDir = subdir ? subdir.replace(/^[\\/]+/, "").replace(/\.\./g, "_") : "";
  const absDir = safeJoin(relDir);
  await ensureDir(absDir);

  // Pick a unique file name (keeps original stem + random suffix)
  const safeName = uniqueSafeName(fileName);
  const relPath = path.join(relDir, safeName);
  const absPath = safeJoin(relPath);

  // Atomic-ish write: write to temp then rename
  const tmpPath = absPath + ".tmp." + process.pid + "." + Date.now();
  await fsp.writeFile(tmpPath, buffer);
  await fsp.rename(tmpPath, absPath);

  return {
    id: safeName,              // legacy-style id (file name only)
    name: safeName,
    mimeType,
    size: buffer.length,
    path: relPath,             // ← relative path you should store in DB (e.g. galleryItem.fileName)
  };
}

/** Metadata for a stored file (size, mime, mtime). Accepts relative path. */
export async function getLocalMeta(relPath: string) {
  const abs = safeJoin(relPath);
  const st = await fsp.stat(abs);
  const m = (mime.lookup(abs) || "application/octet-stream").toString();
  return { abs, size: st.size, mime: m, mtimeMs: st.mtimeMs };
}

/** Create a read stream. Supports optional byte range. Accepts relative path. */
export function createLocalReadStream(
  relPath: string,
  range?: { start?: number; end?: number }
) {
  const abs = safeJoin(relPath);
  const opts =
    range && (typeof range.start === "number" || typeof range.end === "number")
      ? { start: range.start, end: range.end }
      : undefined;
  return fs.createReadStream(abs, opts);
}

/** Read entire file into a Buffer (use for thumbnails/small files). */
export async function getLocalFileBuffer(relPath: string) {
  const abs = safeJoin(relPath);
  return fsp.readFile(abs);
}

/** Delete a file. Silently ignore if missing. */
export async function deleteLocalFile(relPath: string) {
  const abs = safeJoin(relPath);
  try {
    await fsp.unlink(abs);
  } catch (e: any) {
    if (e?.code !== "ENOENT") throw e;
  }
}

/* ───────────── Backward-compat aliases (if your code calls these) ──────────── */

/** Legacy name kept for compatibility; returns a Buffer. Prefer getLocalFileBuffer. */
export const getLocalFileStream = getLocalFileBuffer;
