import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToLocal } from "@/lib/localstorage";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const results: Array<{ id: string; name: string }> = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToLocal({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });
    const saved = await prisma.galleryItem.create({
      data: {
        userId,
        fileName: uploaded.name,
        mimeType: uploaded.mimeType || file.type,
        name: uploaded.name || file.name,
        size: uploaded.size,
      },
      select: { id: true, name: true },
    });
    results.push(saved);
  }

  return NextResponse.json({ ok: true, items: results });
});
