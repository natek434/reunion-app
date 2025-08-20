// src/app/api/gallery/all/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.galleryItem.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      mimeType: i.mimeType,
      owner: i.user?.name || i.user?.email || "Unknown",
    })),
  });
}
