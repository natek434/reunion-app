// src/app/api/files/[id]/thumb/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import sharp from "sharp";

export const runtime = "nodejs"; // Sharp needs Node runtime
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // Next 15: params is a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  // Parse query
  const url = new URL(req.url);
  const w = Math.max(100, Math.min(1600, parseInt(url.searchParams.get("w") || "480", 10)));
  const q = Math.max(30, Math.min(90, parseInt(url.searchParams.get("q") || "70", 10)));

  // Look up the item (note: select `filename` not `driveFileId`)
  const item = await prisma.galleryItem.findUnique({
    where: { id },
    select: { id: true, name: true, mimeType: true, fileName: true, createdAt: true, userId: true },
  });
  if (!item) return new Response("Not found", { status: 404 });
  if (!item.mimeType?.startsWith("image/")) return new Response("Unsupported", { status: 415 });

  // Authorisation: allow owner or admins/editors
  const role = (session.user as any)?.role;
  if (
    item.userId !== (session.user as any).id &&
    role !== "ADMIN" &&
    role !== "EDITOR"
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  // Stable ETag based on id + createdAt + params
  const etag = `"t-${item.id}-${item.createdAt.getTime()}-w${w}-q${q}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }

  try {
    // Read the original image from local storage
    const { getLocalFileStream } = await import("@/lib/localstorage");
    const inputBuf = await getLocalFileStream(item.fileName);

    // Content negotiation (AVIF/WebP/JPEG)
    const accept = req.headers.get("accept") || "";
    const format: "avif" | "webp" | "jpeg" =
      accept.includes("image/avif") ? "avif" :
      accept.includes("image/webp") ? "webp" : "jpeg";

    // Transform with sharp
    const outBuf = await sharp(inputBuf)
      .rotate() // respect EXIF orientation
      .resize({ width: w, withoutEnlargement: true, fit: "inside" })
      .toFormat(format, { quality: q })
      .toBuffer();

    return new NextResponse(new Uint8Array(outBuf), {
      status: 200,
      headers: {
        "Content-Type": `image/${format}`,
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
      },
    });
  } catch (e) {
    console.error("Thumbnail generation error", e);
    return new NextResponse("Error generating thumbnail", { status: 500 });
  }
}
