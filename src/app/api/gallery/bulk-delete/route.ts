// src/app/api/gallery/bulk-delete/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteLocalFile } from "@/lib/localstorage";

export const runtime = "nodejs";
const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  // Only delete the caller’s own uploads
  const items = await prisma.galleryItem.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true, fileName: true },
  });
  if (!items.length) {
    return NextResponse.json({ error: "No matching items" }, { status: 400 });
  }

  // Best effort Drive cleanup; ignore 404s
  await Promise.allSettled(items.map((i) => deleteLocalFile(i.fileName)));

  // Cascade removes AlbumItem links
  await prisma.galleryItem.deleteMany({ where: { id: { in: items.map((i) => i.id) }, userId } });

  return NextResponse.json({ ok: true, deleted: items.length } as const);
}
