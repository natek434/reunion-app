// src/app/api/albums/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

type Params = Promise<{ id: string }>;

export async function DELETE(_: Request, { params }: { params: Params }) {
  const { id } = await params;                     // <-- await the Promise
  const session = await getServerSession(authOptions);
  const userId = (session?.user)?.id;
  if (!userId) return unauthorized();

  const alb = await prisma.album.findUnique({
    where: { id: id },
    select: { createdById: true },
  });
  if (!alb) return notFound();
  if (alb.createdById !== userId) return forbidden();

  // Cascades will remove AlbumItem rows; uploaded media stays in user gallery.
  await prisma.album.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user)?.id;
  const { id } = await params;                     // <-- await the Promise
  if (!userId) return unauthorized();

  const album = await prisma.album.findFirst({
    where: { id, createdById: userId },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { media: { select: { id: true, name: true, mimeType: true } } },
      },
    },
  });
  if (!album) return notFound();

  const slides = album.items.map((it) => ({
    albumItemId: it.id,
    galleryItemId: it.galleryItemId,
    name: it.media.name,
    mimeType: it.media.mimeType,
    src: `/api/files/${it.media.id}`,
  }));

  return NextResponse.json({
    album: { id: album.id, name: album.name, description: album.description, slides },
  });
}
