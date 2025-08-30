import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { withCsrf } from "@/lib/csrf-server";

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

const bodySchema = z.object({ order: z.array(z.string().min(1)).min(1) });

export const PATCH = withCsrf<{ params: Params }>(async (req: NextRequest, { params }): Promise<Response> => {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  if (!(await ensureOwner(id, userId))) return forbidden();

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("order array required");
  const { order } = parsed.data;

  const existing = await prisma.albumItem.findMany({
    where: { id: { in: order }, albumId: id },
    select: { id: true },
  });
  if (existing.length !== order.length) {
    return badRequest("one or more albumItemIds do not belong to this album");
  }

  await prisma.$transaction(
    order.map((albumItemId, idx) =>
      prisma.albumItem.update({
        where: { id: albumItemId },
        data: { order: idx },
      }),
    ),
  );

  return NextResponse.json({ ok: true } as const);
});
