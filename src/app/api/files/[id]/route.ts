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
 // Fetch the gallery item by its ID to ensure it exists
  const { id } = await context.params;
  const item = await prisma.galleryItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  // Redirect to dedicated video endpoint.  This avoids buffering large files here.
  const redirectUrl = `/api/files/${id}/video`;
  return new Response(null, {
    status: 302,
    headers: { Location: redirectUrl },
  });
}
