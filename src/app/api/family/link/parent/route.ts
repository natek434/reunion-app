// app/api/family/link/parent/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Kind = "BIOLOGICAL" | "WHANGAI";

// OPTIONAL: force dynamic to avoid caching oddities
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(userRole === "ADMIN" || userRole === "EDITOR")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { parentId, childId, role: parentRole, kind } = await req.json().catch(() => ({}));
  const parentKind: Kind = kind === "WHANGAI" ? "WHANGAI" : "BIOLOGICAL";

  if (!parentId || !childId || parentId === childId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }
  if (parentRole !== "MOTHER" && parentRole !== "FATHER") {
    return NextResponse.json({ error: "role must be MOTHER or FATHER" }, { status: 400 });
  }

  const [p, c] = await Promise.all([
    prisma.person.findFirst({ where: { id: parentId, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: childId, deletedAt: null } }),
  ]);
  if (!p || !c) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  if ((p.locked || c.locked) && userRole !== "ADMIN") return NextResponse.json({ error: "Locked person (admin only)" }, { status: 403 });

  if (parentRole === "MOTHER" && p.gender !== "FEMALE") {
    return NextResponse.json({ error: "Selected mother is not FEMALE" }, { status: 400 });
  }
  if (parentRole === "FATHER" && p.gender !== "MALE") {
    return NextResponse.json({ error: "Selected father is not MALE" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.parentChild.deleteMany({ where: { childId, kind: parentKind, role: parentRole } });
    await tx.parentChild.upsert({
      // requires @@unique([parentId, childId, kind]) in Prisma
      where: { parentId_childId_kind: { parentId, childId, kind: parentKind } },
      update: { role: parentRole },
      create: { parentId, childId, role: parentRole, kind: parentKind },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(userRole === "ADMIN" || userRole === "EDITOR")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // accept JSON body OR query params
  let parentId: string | null = null;
  let childId: string | null = null;
  let kindParam: string | null = null;

  try {
    const j = await req.json();
    parentId = j?.parentId ?? null;
    childId = j?.childId ?? null;
    kindParam = j?.kind ?? null;
  } catch {
    const url = new URL(req.url);
    parentId = url.searchParams.get("parentId");
    childId = url.searchParams.get("childId");
    kindParam = url.searchParams.get("kind");
  }

  const parentKind: Kind = kindParam === "WHANGAI" ? "WHANGAI" : "BIOLOGICAL";
  if (!parentId || !childId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  await prisma.parentChild.deleteMany({
    where: { parentId, childId, kind: parentKind },
  });

  return NextResponse.json({ ok: true });
}
