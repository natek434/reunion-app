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

  await prisma.relationshipRequest.update({
    where: { id: r.id },
    data: { status: "REJECTED" },
  });

  return NextResponse.json({ ok: true });
}
