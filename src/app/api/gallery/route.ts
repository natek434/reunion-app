// src/app/api/your-route/[id]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = Promise<{ id: string }>;

function driveConfigured() {
  const {
    DRIVE_CLIENT_ID,
    DRIVE_CLIENT_SECRET,
    GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID,
  } = process.env;
  return Boolean(
    DRIVE_CLIENT_ID &&
      DRIVE_CLIENT_SECRET &&
      GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN &&
      GOOGLE_DRIVE_FOLDER_ID
  );
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) return new Response("Not found", { status: 404 });

  // Only owner can delete (keep existing behavior)
  if (item.userId !== (session.user as any).id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Try to delete from Drive (lazy import so it doesn’t execute at build time)
  if (driveConfigured()) {
    try {
      const { deleteDriveFile } = await import("@/lib/drive-admin");
      await deleteDriveFile(item.driveFileId);
    } catch (e) {
      // ignore cloud delete errors; continue to remove DB row
      console.warn("Drive delete failed (ignored):", e);
    }
  }

  await prisma.galleryItem.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
