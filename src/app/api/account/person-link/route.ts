// src/app/api/account/person-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { personId } = await req.json().catch(() => ({} as any));
  if (!personId) {
    // unlink allowed
    await prisma.user.update({ where: { id: userId }, data: { personId: null } });
    return NextResponse.json({ ok: true });
  }

  // Ownership check: only link to a person you created (admins can do more elsewhere)
  const owned = await prisma.person.findFirst({ where: { id: personId, createdById: userId, deletedAt: null }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.user.update({ where: { id: userId }, data: { personId } });
  return NextResponse.json({ ok: true });
}
