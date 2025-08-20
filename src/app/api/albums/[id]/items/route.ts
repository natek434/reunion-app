// src/app/api/albums/[id]/items/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" } as const, { status: 401 });
const forbidden    = () => NextResponse.json({ error: "Forbidden" } as const, { status: 403 });
const badRequest   = (m: string) => NextResponse.json({ error: m } as const, { status: 400 });

type Params = Promise<{ id: string }>;

async function ensureOwner(albumId: string, userId: string) {
  const a = await prisma.album.findFirst({
    where: { id: albumId, createdById: userId },
    select: { id: true },
  });
  return !!a;
}

/* ------------------------- POST: add items to album ------------------------- */
const addBody = z.object({ galleryItemIds: z.array(z.string().min(1)).min(1) });

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;                    // <-- await the Promise
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  if (!(await ensureOwner(id, userId))) return forbidden();

  const parsed = addBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("galleryItemIds required");
  const { galleryItemIds } = parsed.data;

  const existing = await prisma.galleryItem.findMany({
    where: { id: { in: galleryItemIds } },
    select: { id: true },
  });
  const ids = existing.map(x => x.id);
  if (!ids.length) return badRequest("No matching items");

  const maxOrder = await prisma.albumItem.aggregate({
    _max: { order: true }, where: { albumId: id },
  });
  const base = (maxOrder._max.order ?? -1) + 1;

  await prisma.$transaction(
    ids.map((gid, i) =>
      prisma.albumItem.upsert({
        where: { albumId_galleryItemId: { albumId: id, galleryItemId: gid } },
        update: {},
        create: { albumId: id, galleryItemId: gid, order: base + i },
      }),
    ),
  );

  return NextResponse.json({ ok: true } as const);
}

/* ---------------------- DELETE: remove one album item ---------------------- */
const delBody = z.object({ albumItemId: z.string().min(1) });

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;                    // <-- await the Promise
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  if (!(await ensureOwner(id, userId))) return forbidden();

  const parsed = delBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("albumItemId required");
  const { albumItemId } = parsed.data;

  // Ensure the item belongs to this album before deleting
  const item = await prisma.albumItem.findUnique({
    where: { id: albumItemId },
    select: { albumId: true },
  });
  if (!item || item.albumId !== id) return forbidden();

  await prisma.albumItem.delete({ where: { id: albumItemId } });
  return NextResponse.json({ ok: true } as const);
}
