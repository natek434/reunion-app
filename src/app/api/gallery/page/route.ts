import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function encodeCursor(d: Date, id: string) {
  return Buffer.from(`${d.toISOString()}::${id}`).toString("base64");
}
function decodeCursor(c: string) {
  const raw = Buffer.from(c, "base64").toString("utf8");
  const [ds, id] = raw.split("::");
  return { d: new Date(ds), id };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.max(12, Math.min(60, parseInt(url.searchParams.get("limit") || "24", 10)));
  const cursor = url.searchParams.get("cursor");

  const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

  let items;
  if (cursor) {
    const { d, id } = decodeCursor(cursor);
    items = await prisma.galleryItem.findMany({
      where: {
        OR: [
          { createdAt: { lt: d } },
          { createdAt: d, id: { lt: id } },
        ],
      },
      orderBy,
      take: limit + 1,
      select: { id: true, name: true, mimeType: true, createdAt: true },
    });
  } else {
    items = await prisma.galleryItem.findMany({
      orderBy,
      take: limit + 1,
      select: { id: true, name: true, mimeType: true, createdAt: true },
    });
  }

  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1]!.createdAt, items[items.length - 1]!.id)
    : null;

  return NextResponse.json({
    items,
    nextCursor,
  });
}
