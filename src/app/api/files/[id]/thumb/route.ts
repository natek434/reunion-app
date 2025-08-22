// src/app/api/files/[id]/thumb/route.ts
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocalMeta, createLocalReadStream } from "@/lib/localstorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const w = Math.max(100, Math.min(1600, parseInt(url.searchParams.get("w") || "480", 10)));
  const q = Math.max(30, Math.min(90, parseInt(url.searchParams.get("q") || "70", 10)));

  const item = await prisma.galleryItem.findUnique({
    where: { id },
    // select whatever you have — note fileName (not fileName)
    select: { id: true, userId: true, name: true, mimeType: true, createdAt: true, fileName: true },
  });
  if (!item) return new Response("Not found", { status: 404 });

  // which path do we have?
  const relPath = item.fileName;   // <-- fallback
  if (!relPath) return new Response("No stored path", { status: 500 });

  const role = (session.user as any)?.role;
  if (item.userId !== (session.user as any).id && role !== "ADMIN" && role !== "EDITOR") {
    return new Response("Forbidden", { status: 403 });
  }

  // ETag from file mtime so thumbs invalidate on replace
  const meta = await getLocalMeta(relPath);
  const etag = `"t-${item.id}-${Math.floor(meta.mtimeMs)}-w${w}-q${q}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });

  // read → resize → return (buffered, avoids HTTP/2/3 flakiness)
  const src = createLocalReadStream(relPath);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    src.on("data", (c: Buffer) => chunks.push(c));
    src.once("end", resolve);
    src.once("error", reject);
  });
  const input = Buffer.concat(chunks);

  const accept = req.headers.get("accept") || "";
  const format: "avif" | "webp" | "jpeg" =
    accept.includes("image/avif") ? "avif" :
    accept.includes("image/webp") ? "webp" : "jpeg";

  const out = await sharp(input)
    .rotate()
    .resize({ width: w, fit: "inside", withoutEnlargement: true })
    .toFormat(format, { quality: q })
    .toBuffer();

  return new Response(out, {
    headers: {
      "Content-Type": `image/${format}`,
      "Content-Length": String(out.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
