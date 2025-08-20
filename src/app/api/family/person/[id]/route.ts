import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function forbid() { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
function unauthorized() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;                     // ← params is a Promise in Next 15
  const session = await getServerSession(authOptions);
  const role = (session?.user)?.role;
  if (!session?.user?.id) return unauthorized();
  if (!(role === "ADMIN" || role === "EDITOR")) return forbid();

  // Reject locked people unless ADMIN
  const p = await prisma.person.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.locked && role !== "ADMIN") return forbid();

  // Soft delete + cleanup edges in a tx
  await prisma.$transaction(async (tx) => {
    await tx.parentChild.deleteMany({ where: { OR: [{ parentId: id }, { childId: id }] } });
    await tx.person.update({ where: { id }, data: { deletedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
}

// Toggle lock (ADMIN only)
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;                     // ← params is a Promise in Next 15
  const session = await getServerSession(authOptions);
  const role = (session?.user)?.role;
  if (!session?.user?.id) return unauthorized();
  if (role !== "ADMIN") return forbid();

  const { locked } = await req.json().catch(() => ({}));
  if (typeof locked !== "boolean") {
    return NextResponse.json({ error: "locked must be boolean" }, { status: 400 });
  }
  await prisma.person.update({ where: { id: id }, data: { locked } });
  return NextResponse.json({ ok: true, locked });
}
