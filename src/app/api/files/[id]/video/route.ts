// src/app/api/files/[id]/video/route.ts
import { Readable } from "node:stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocalMeta, createLocalReadStream } from "@/lib/localstorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  // Adjust 'fileName' if your column is named differently
  const item = await prisma.galleryItem.findUnique({
    where: { id },
    select: { id: true, name: true, mimeType: true, fileName: true, size: true, userId: true }, 
  });
  if (!item || !item.fileName) return new Response("Not found", { status: 404 });

  const role = (session.user as any)?.role;
  if (item.userId !== (session.user as any).id && role !== "ADMIN" && role !== "EDITOR") {
    return new Response("Forbidden", { status: 403 });
  }

  const meta = await getLocalMeta(item.fileName);
  const totalSize = Number(item.size || meta.size);
  const mime = item.mimeType || meta.mime;

  const headersBase: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Type": mime,
    "Cache-Control": "private, no-store, no-transform",
    "Content-Disposition": `inline; filename="${encodeURIComponent(item.name)}"`,
  };

  const range = req.headers.get("range");
  if (range && /^bytes=\d+-\d*$/.test(range) && totalSize > 0) {
    const [startStr, endStr] = range.replace("bytes=", "").split("-");
    const start = Math.max(0, parseInt(startStr, 10));
    const CHUNK = 2 * 1024 * 1024 - 1; // default chunk size if end not specified
    const end = Math.min(endStr ? parseInt(endStr, 10) : start + CHUNK, totalSize - 1);

    const stream = createLocalReadStream(item.fileName, { start, end });
    try {
      (req as any).signal?.addEventListener(
        "abort",
        () => (stream as any).destroy?.(),
        { once: true }
      );
    } catch {}

    return new Response(Readable.toWeb(stream as any), {
      status: 206,
      headers: {
        ...headersBase,
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Content-Length": String(end - start + 1),
      },
    });
  } else {
    const stream = createLocalReadStream(item.fileName);
    const extra: Record<string, string> = {};
    if (totalSize) extra["Content-Length"] = String(totalSize);

    try {
      (req as any).signal?.addEventListener(
        "abort",
        () => (stream as any).destroy?.(),
        { once: true }
      );
    } catch {}

    return new Response(Readable.toWeb(stream as any), {
      status: 200,
      headers: { ...headersBase, ...extra },
    });
  }
}
