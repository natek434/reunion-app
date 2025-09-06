import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireUser();
  const r = await prisma.relationshipRequest.findUnique({ where: { id: params.id } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (r.approverUserId !== actor.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (r.status !== "PENDING") return NextResponse.json({ error: "Already handled" }, { status: 409 });

  if (r.kind === "PARENT_CHILD") {
    await prisma.parentChild.upsert({
  where: {
    parentId_childId_kind: {
      parentId: r.fromPersonId,
      childId:  r.toPersonId,
      kind:     (r.pcKind as any) ?? "BIOLOGICAL",
    },
  },
  create: {
    parentId: r.fromPersonId,
    childId:  r.toPersonId,
    role:     (r.role as any)   ?? "PARENT",
    kind:     (r.pcKind as any) ?? "BIOLOGICAL",
    createdById: actor.id, // or r.createdByUserId
  },
  update: {
    role: (r.role as any) ?? "PARENT",
    kind: (r.pcKind as any) ?? "BIOLOGICAL",
  },
});
  } else {
    const [A, B] = r.fromPersonId < r.toPersonId ? [r.fromPersonId, r.toPersonId] : [r.toPersonId, r.fromPersonId];
    await prisma.partnership.upsert({
      where: { aId_bId: { aId: A, bId: B } },
      create: { aId: A, bId: B, status: "ACTIVE", kind: "PARTNER" },
      update: {},
    });
  }

  await prisma.relationshipRequest.update({
    where: { id: r.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
