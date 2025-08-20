import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [people, parents] = await Promise.all([
    prisma.person.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
        gender: true,
        locked: true,
        birthDate: true,
        notes: true,
      },
    }),
    prisma.parentChild.findMany({
      where: { parent: { deletedAt: null }, child: { deletedAt: null } },
      select: { parentId: true, childId: true, role: true, kind: true },
    }),
  ]);

  return NextResponse.json({
    nodes: people.map((p) => ({
      id: p.id,
      label: `${p.firstName} ${p.lastName}`,
      imageUrl: p.imageUrl ?? null,
      gender: p.gender,
      locked: p.locked,
      birthDate: p.birthDate ? p.birthDate.toISOString() : null,
      notes: p.notes ?? null,
    })),
    edges: parents.map((e) => ({
      id: `pc:${e.parentId}-${e.childId}-${e.kind}`,
      source: e.parentId,
      target: e.childId,
      type: "parent",
      role: e.role,   // "MOTHER" | "FATHER"
      kind: e.kind,   // "BIOLOGICAL" | "WHANGAI"
    })),
  });
}
