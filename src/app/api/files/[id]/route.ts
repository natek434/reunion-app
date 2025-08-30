// src/app/api/files/[id]/route.ts (or your current path)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await context.params;
  const item = await prisma.galleryItem.findUnique({ where: { id }, select: { userId: true, fileName: true, mimeType: true, name: true } });
  if (!item) return new Response("Not found", { status: 404 });
  const role = (session.user as any)?.role;
  if (item.userId !== (session.user as any).id && role !== "ADMIN" && role !== "EDITOR") {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const { getLocalFileStream } = await import("@/lib/localstorage");
    const data = await getLocalFileStream(item.fileName); // ensure field is `filename`

    return new Response(data, {
      headers: {
        "Content-Type": item.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(item.name)}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (e) {
    console.error("Local file read error", e);
    return new Response("Error retrieving file", { status: 500 });
  }
}
