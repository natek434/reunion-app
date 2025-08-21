// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToLocal } from "@/lib/localstorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // Read multipart form-data
  const form = await req.formData();
  const file = form.get("file") as File | null; // <-- define file
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // (optional) basic validation
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MiB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }
  const allowedPrefixes = ["image/", "video/"];
  if (!allowedPrefixes.some((p) => (file.type || "").startsWith(p))) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  // sanitize and save
  const safeName = (file.name || "upload.bin").replace(/[^A-Za-z0-9._-]/g, "_"); // <-- define safeName
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToLocal({
      fileName: safeName,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    const saved = await prisma.galleryItem.create({
      data: {
        userId,
        fileName: uploaded.name,                    // keep consistent with your schema
        mimeType: uploaded.mimeType || file.type,
        name: uploaded.name || safeName,
        size: uploaded.size,
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({ ok: true, id: saved.id, name: saved.name });
  } catch (e) {
    console.error("Local upload failed:", e);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
