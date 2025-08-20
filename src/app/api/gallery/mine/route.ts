// src/app/api/gallery/mine/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.galleryItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, mimeType: true },
  });
  return NextResponse.json({ items });
}
