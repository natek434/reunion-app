// src/app/api/albums/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function unauthorized() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user)?.id;
  if (!userId) return unauthorized();

  const albums = await prisma.album.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ albums });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user)?.id;
  if (!userId) return unauthorized();

  const { name, description } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const album = await prisma.album.create({
    data: { name: name.trim(), description: description?.trim() || null, createdById: userId },
  });
  return NextResponse.json({ ok: true, album });
}
