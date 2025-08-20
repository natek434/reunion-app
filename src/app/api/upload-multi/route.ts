// src/app/api/upload-multi/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  if (!driveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive is not configured." },
      { status: 503 }
    );
  }

  // ⬇️ Lazy-load here so env is read only at runtime
  const { uploadToDrive } = await import("@/lib/drive-admin");

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const results: Array<{ id: string; name: string }> = [];

  // (Optional) run in parallel if you like:
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
