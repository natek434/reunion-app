import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

 // Validate file size and type.
 const MAX_SIZE = 50 * 1024 * 1024; // 50 MiB
 if (file.size > MAX_SIZE) {
   return NextResponse.json({ error: "File too large" }, { status: 413 });
 }
 const allowed = ["image/", "video/"];
 if (!allowed.some((t) => (file.type || "").startsWith(t))) {
   return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
}
  // Sanitize the original filename.
 const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");

  // Read the file into a buffer and upload.  Wrap in try/catch to handle Drive errors.
 try {
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadToDrive({
    fileName: safeName,
    mimeType: file.type || "application/octet-stream",
    buffer,
   });

   const saved = await prisma.galleryItem.create({
    data: {
      userId: (session.user).id,
      driveFileId: uploaded.id!,
     mimeType: uploaded.mimeType || file.type,
      name: uploaded.name || safeName,
      size: uploaded.size ? parseInt(uploaded.size as any, 10) : null,
      webViewLink: uploaded.webViewLink || null,
    },
  });
   return NextResponse.json({ ok: true, id: saved.id, driveId: saved.driveFileId });
 } catch (e: any) {
   console.error("Upload failed", e);
   return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
 }
}
