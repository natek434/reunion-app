import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const reso = await prisma.resource.findUnique({
    where: { id },
    select: { filePath: true, title: true, sizeBytes: true }
  });
  if (!reso?.filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!fs.existsSync(reso.filePath)) return NextResponse.json({ error: "Missing file" }, { status: 410 });

  const st = fs.statSync(reso.filePath);
  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Length", String(st.size));
  headers.set("Cache-Control", "private, no-store, no-transform");
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(reso.title || path.basename(reso.filePath))}`);

  return new NextResponse(fs.createReadStream(reso.filePath) as any, { status: 200, headers });
}
