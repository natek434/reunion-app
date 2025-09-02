// src/app/api/files/[id]/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  // Require a signed‑in user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch the gallery item by its ID
  const { id } = await context.params;
  const item = await prisma.galleryItem.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true, name: true },
  });
  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  try {
    // Load the file data from local storage
    const { getLocalFileStream } = await import("@/lib/localstorage");
    const data = await getLocalFileStream(item.fileName);

    return new Response(data, {
      headers: {
        "Content-Type": item.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(item.name)}"`,
        // Cache privately on the client; adjust if you want public caching
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (e) {
    console.error("Local file read error", e);
    return new Response("Error retrieving file", { status: 500 });
  }
}
