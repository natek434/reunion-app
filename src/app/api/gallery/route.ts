import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteDriveFile } from "@/lib/drive-admin";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const item = await prisma.galleryItem.findUnique({ where: { id: id } });
  if (!item) return new Response("Not found", { status: 404 });

  if (item.userId !== (session.user).id) {
    return new Response("Forbidden", { status: 403 });
  }

  // delete from Drive first; ignore if already gone
  try { await deleteDriveFile(item.driveFileId); } catch {}

  await prisma.galleryItem.delete({ where: { id: id } });
  return new Response(null, { status: 204 });
}
