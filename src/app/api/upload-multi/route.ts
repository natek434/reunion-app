// src/app/api/upload-multi/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user).id;

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const results: any[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToDrive({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    const saved = await prisma.galleryItem.create({
      data: {
        userId,
        driveFileId: uploaded.id!,
        mimeType: uploaded.mimeType || file.type,
        name: uploaded.name || file.name,
        size: uploaded.size ? parseInt(uploaded.size as any, 10) : null,
        webViewLink: uploaded.webViewLink || null,
      },
      select: { id: true, name: true },
    });
    results.push(saved);
  }

  return NextResponse.json({ ok: true, items: results });
}
