// src/app/api/me/family/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [user, members, parentChild, partnerships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { personId: true } }),
    prisma.person.findMany({
      where: { createdById: userId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, displayName: true, gender: true, createdById: true, deletedAt: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.parentChild.findMany({
      where: {
        OR: [
          { parent: { createdById: userId, deletedAt: null } },
          { child: { createdById: userId, deletedAt: null } },
        ],
      },
      select: { id: true, parentId: true, childId: true, role: true, kind: true },
    }),
    prisma.partnership.findMany({
      where: {
        AND: [
          { a: { createdById: userId, deletedAt: null } },
          { b: { createdById: userId, deletedAt: null } },
        ],
      },
      select: { id: true, aId: true, bId: true, kind: true, status: true },
    }),
  ]);

  return NextResponse.json({
    mePersonId: user?.personId ?? null,
    members,
    parentChild,
    partnerships,
  });
}
