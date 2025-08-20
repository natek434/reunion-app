// src/app/api/upload-multi/[id]/route.ts  (or your actual path for this GET route)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // Next 15: params is a Promise
  const { id } = await context.params;

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) return new Response("Not found", { status: 404 });

  // allow owner or admins/editors
  const role = (session.user as any)?.role;
  if (
    item.userId !== (session.user as any).id &&
    role !== "ADMIN" &&
    role !== "EDITOR"
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!driveConfigured()) {
    return new Response("Google Drive is not configured.", { status: 503 });
  }

  try {
    // 🔻 lazy import so envs are read at runtime, not build time
    const { getDriveFileStream } = await import("@/lib/drive-admin");
    const nodeStream = await getDriveFileStream(item.driveFileId);

    // If the helper returns a Node stream, convert to Web stream for Response
    const body =
      nodeStream && typeof (nodeStream as any).pipe === "function" && !(nodeStream as any).getReader
        ? (Readable as any).toWeb(nodeStream)
        : (nodeStream as any);

    return new Response(body, {
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
