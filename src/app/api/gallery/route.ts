import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withCsrf } from "@/lib/csrf-server";

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
    DRIVE_CLIENT_ID && DRIVE_CLIENT_SECRET && GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN && GOOGLE_DRIVE_FOLDER_ID
  );
}

export const DELETE = withCsrf<{ params: Params }>(async (_req: NextRequest, { params }): Promise<Response> => {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) return new Response("Not found", { status: 404 });

  if (item.userId !== (session.user as any).id) {
    return new Response("Forbidden", { status: 403 });
  }

  if (driveConfigured()) {
    try {
      const { deleteLocalFile } = await import("@/lib/localstorage");
      await deleteLocalFile(item.fileName);
    } catch (e) {
      console.warn("Drive delete failed (ignored):", e);
    }
  }

  await prisma.galleryItem.delete({ where: { id } });
  return new Response(null, { status: 204 });
});
