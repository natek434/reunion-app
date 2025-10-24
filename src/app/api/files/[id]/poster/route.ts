import { spawn } from "node:child_process";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocalMeta } from "@/lib/localstorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MIN_WIDTH = 160;
const MAX_WIDTH = 1280;
const DEFAULT_WIDTH = 640;
const GENERATION_TIMEOUT_MS = 7_000;

type PosterError = NodeJS.ErrnoException & {
  code?: NodeJS.ErrnoException["code"] | number | null;
  signal?: NodeJS.Signals | null;
  stderr?: string;
};

async function generateVideoPoster(absPath: string, width: number) {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    "0",
    "-i",
    absPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${width}:-2`,
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "pipe:1",
  ];

  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, GENERATION_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timer);
    };

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));

    child.once("error", (err) => {
      cleanup();
      reject(err);
    });

    child.once("close", (code, signal) => {
      cleanup();
      if (code !== 0 || stdout.length === 0) {
        const err = new Error(
          `ffmpeg exited with code ${code ?? "unknown"}: ${Buffer.concat(stderr).toString("utf8")}`
        ) as PosterError;
        err.code = code ?? null;
        err.signal = signal ?? null;
        err.stderr = Buffer.concat(stderr).toString("utf8");
        reject(err);
        return;
      }

      resolve(Buffer.concat(stdout));
    });
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const widthParam = parseInt(url.searchParams.get("w") || "", 10);
  const width = Number.isFinite(widthParam)
    ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, widthParam))
    : DEFAULT_WIDTH;

  const item = await prisma.galleryItem.findUnique({
    where: { id },
    select: { id: true, mimeType: true, fileName: true, updatedAt: true },
  });

  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  if (!item.mimeType.startsWith("video/")) {
    return new Response("Unsupported media", { status: 400 });
  }

  if (!item.fileName) {
    return new Response("Missing file", { status: 500 });
  }

  const meta = await getLocalMeta(item.fileName);
  const etag = `"vp-${item.id}-${Math.floor(meta.mtimeMs)}-w${width}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }

  try {
    const buffer = await generateVideoPoster(meta.abs, width);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=86400",
        ETag: etag,
      },
    });
  } catch (error) {
    const err = error as PosterError;

    if (err?.code === "ENOENT") {
      console.error("[gallery-poster] ffmpeg binary not found", err);
      return new Response("Poster generation unavailable", { status: 501 });
    }

    if (err?.signal === "SIGKILL") {
      console.error("[gallery-poster] ffmpeg timed out", { id, width });
      return new Response("Poster generation timed out", { status: 504 });
    }

    console.error("[gallery-poster] failed to render poster", {
      id,
      width,
      error: err,
      stderr: err?.stderr,
    });
    return new Response("Poster unavailable", { status: 503 });
  }
}
