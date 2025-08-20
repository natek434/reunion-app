import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/authz";

async function canEditEdge(session: any, parentId: string, childId: string) {
  if (isAdmin(session)) return true;
  const ends = await prisma.person.findMany({
    where: { id: { in: [parentId, childId] } },
    select: { createdById: true },
  });
  const myId = session.user.id;
  return ends.some(e => e.createdById === myId);
}

export async function POST(req: Request) {
  const session = await requireSession();
  const { parentId, childId, role = "PARENT", kind = "BIOLOGICAL" } = await req.json();

  if (!(parentId && childId)) {
    return NextResponse.json({ error: "parentId and childId required" }, { status: 400 });
  }
  if (!(await canEditEdge(session, parentId, childId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.parentChild.create({
    data: { parentId, childId, role, kind },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const edge = await prisma.parentChild.findUnique({
    where: { id },
    select: { parentId: true, childId: true },
  });
  if (!edge || !(await canEditEdge(session, edge.parentId, edge.childId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.parentChild.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
