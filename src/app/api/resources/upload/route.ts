import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RES_DIR = process.env.MEDIA_RESOURCES_DIR;

function ensureDir() {
  fs.mkdirSync(RES_DIR, { recursive: true });
  fs.accessSync(RES_DIR, fs.constants.W_OK);
}

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    ensureDir();
  } catch {
    return NextResponse.json({ error: `Not writable: ${RES_DIR}` }, { status: 503 });
  }

  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim() || null;
  const kind = String(form.get("kind") || "other") as any;
  const tags = parseTags(String(form.get("tags") || ""));
  const f = form.get("file") as File | null;

  if (!title || !f) {
    return NextResponse.json({ error: "title and file are required" }, { status: 400 });
  }

  // write file
  const arrayBuf = await f.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const extGuess = (() => {
    const n = (f.name || "").toLowerCase();
    const dot = n.lastIndexOf(".");
    return dot >= 0 ? n.slice(dot) : "";
  })();
  const rid = `res_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const filename = `${rid}${extGuess || ""}`;
  const absPath = path.join(RES_DIR, filename);
  fs.writeFileSync(absPath, buf);

  const created = await prisma.resource.create({
    data: {
      title,
      description,
      kind,
      tags,
      filePath: absPath,
      sizeBytes: buf.length,
      createdBy: session.user.id,
    },
    select: { id: true }
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
