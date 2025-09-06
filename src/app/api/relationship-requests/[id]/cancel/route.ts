import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, isAdminish } from "@/lib/authz";

// Enforce dynamic rendering for this endpoint. Without this, Next.js may
// statically optimise the route which can cause stale data to be served.
export const dynamic = "force-dynamic";

/**
 * Cancel a pending relationship request. Only the user who created the
 * request (or an admin) may cancel it. If the request is not found or
 * has already been handled, an appropriate error is returned. Upon
 * success the request’s status is set to CANCELED.
 */
export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const r = await prisma.relationshipRequest.findUnique({ where: { id } });
  if (!r) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (r.createdByUserId !== actor.userId && !isAdminish(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (r.status !== "PENDING") {
    return NextResponse.json({ error: "Already handled" }, { status: 409 });
  }
  await prisma.relationshipRequest.update({
    where: { id },
    data: { status: "CANCELED" },
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}
