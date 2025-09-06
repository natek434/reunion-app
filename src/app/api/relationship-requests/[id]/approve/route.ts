import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, isAdminish } from "@/lib/authz";

// Ensure that the handler always runs dynamically. Relationship approval
// modifies the database and should never be statically cached.
export const dynamic = "force-dynamic";

/**
 * Approve a pending relationship request. Only the designated approver
 * (or an admin) may approve the request. When approving a parent/child
 * request the appropriate parentChild edge is upserted; when approving
 * a partnership request the appropriate partnership edge is upserted.
 * The request status is updated to APPROVED and the approvedAt
 * timestamp is recorded.
 */
export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const r = await prisma.relationshipRequest.findUnique({ where: { id } });
  if (!r) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (r.approverUserId !== actor.userId && !isAdminish(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (r.status !== "PENDING") {
    return NextResponse.json({ error: "Already handled" }, { status: 409 });
  }

  // Perform the actual link creation based on request kind. We use
  // upsert to prevent duplicate edges when multiple approvals race. For
  // parent/child we connect parent and child via their IDs; for
  // partnerships we canonicalise the ordering of person IDs.
  if (r.kind === "PARENT_CHILD") {
    await prisma.parentChild.upsert({
      where: {
        parentId_childId_kind: {
          parentId: r.fromPersonId,
          childId: r.toPersonId,
          kind: r.pcKind as any,
        },
      },
      create: {
        parentId: r.fromPersonId,
        childId: r.toPersonId,
        role: r.role as any,
        kind: r.pcKind as any,
        createdById: actor.userId,
      },
      update: {
        role: r.role as any,
        kind: r.pcKind as any,
      },
    });
  } else {
    const [A, B] =
      r.fromPersonId < r.toPersonId
        ? [r.fromPersonId, r.toPersonId]
        : [r.toPersonId, r.fromPersonId];
    await prisma.partnership.upsert({
      where: { aId_bId: { aId: A, bId: B } },
      create: {
        aId: A,
        bId: B,
        status: "ACTIVE",
        kind: "PARTNER",
        createdById: actor.userId,
      },
      update: {},
    });
  }

  await prisma.relationshipRequest.update({
    where: { id: r.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
