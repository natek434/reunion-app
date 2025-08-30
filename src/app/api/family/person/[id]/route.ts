import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withCsrf } from "@/lib/csrf-server";

function forbid() { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
function unauthorized() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export const DELETE = withCsrf<{ params: Params }>(async (_req: NextRequest, { params }): Promise<Response> => {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user)?.role;
  if (!session?.user?.id) return unauthorized();
  if (!(role === "ADMIN" || role === "EDITOR")) return forbid();

  const p = await prisma.person.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.locked && role !== "ADMIN") return forbid();

  await prisma.$transaction(async (tx) => {
    await tx.parentChild.deleteMany({ where: { OR: [{ parentId: id }, { childId: id }] } });
    await tx.person.update({ where: { id }, data: { deletedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
});

export const PATCH = withCsrf<{ params: Params }>(async (req: NextRequest, { params }): Promise<Response> => {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user)?.role;
  if (!session?.user?.id) return unauthorized();
  if (role !== "ADMIN") return forbid();

  const { locked } = await req.json().catch(() => ({}));
  if (typeof locked !== "boolean") {
    return NextResponse.json({ error: "locked must be boolean" }, { status: 400 });
  }
  await prisma.person.update({ where: { id }, data: { locked } });
  return NextResponse.json({ ok: true, locked });
});
