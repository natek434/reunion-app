import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export async function GET() {
  const items = await prisma.resource.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true, title: true, description: true, kind: true, tags: true,
      sizeBytes: true, externalUrl: true, filePath: true, updatedAt: true
    }
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim() || null;
  const kind = String(form.get("kind") || "other") as any;
  const tags = parseTags(String(form.get("tags") || ""));
  const externalUrl = String(form.get("externalUrl") || "").trim();

  if (!title || !externalUrl) {
    return NextResponse.json({ error: "title and externalUrl are required" }, { status: 400 });
  }

  const created = await prisma.resource.create({
    data: {
      title,
      description,
      kind,
      tags,
      externalUrl,
      createdBy: session.user.id,
    },
    select: { id: true }
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
