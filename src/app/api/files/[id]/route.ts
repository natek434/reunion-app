import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDriveFileStream } from '@/lib/drive-admin';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // ⬇️ params is a Promise in Next 15
  const { id } = await context.params;

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) return new Response("Not found", { status: 404 });

  // Authorisation: allow owner or admins/editors to access the file.
   const role = (session.user as any)?.role;
 if (
  item.userId !== (session.user as any).id &&
  role !== "ADMIN" &&
  role !== "EDITOR"
 ) {
  return new Response("Forbidden", { status: 403 });
 }
try {
   const stream = await getDriveFileStream(item.driveFileId);
   return new Response(stream, {
    headers: {
      "Content-Type": item.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(item.name)}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
   });
 } catch (e) {
   console.error("Drive stream error", e);
  return new Response("Error retrieving file", { status: 500 });
 }
}
