// src/app/api/resources/[id]/download/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "file";
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const reso = await prisma.resource.findUnique({
    where: { id },
    select: { filePath: true, title: true }
  });

  if (!reso?.filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Normalize to absolute path
  const absPath = path.isAbsolute(reso.filePath)
    ? reso.filePath
    : path.resolve(process.cwd(), reso.filePath);

  if (!fs.existsSync(absPath)) {
    console.error("[download] Missing file", absPath);
    return NextResponse.json({ error: "Missing file" }, { status: 410 });
  }

  const stat = fs.statSync(absPath);
  const stream = fs.createReadStream(absPath);

  // Figure out a sane filename with an extension
  const contentType = (mime.lookup(absPath) || "application/octet-stream").toString();
  const extFromPath = path.extname(absPath).toLowerCase();                // ".pdf"
  const extFromMime = mime.extension(contentType);                         // "pdf" | false
  const realExt = extFromPath || (extFromMime ? `.${extFromMime}` : "");

  let base = sanitize(reso.title || path.basename(absPath));
  if (!path.extname(base) && realExt) base += realExt;

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(stat.size));
  headers.set("Cache-Control", "private, max-age=0, no-store");
  headers.set("Last-Modified", stat.mtime.toUTCString());
  headers.set(
    "Content-Disposition",
    `attachment; filename="${base.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodeURIComponent(base)}`
  );

  return new NextResponse(stream as any, { status: 200, headers });
}
