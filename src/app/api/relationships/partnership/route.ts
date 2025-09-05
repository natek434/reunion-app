import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, assertBothOwnedOrAdmin } from "@/lib/authz";
import { upsertPartnership, deletePartnershipById } from "@/server/services/members";

const UpsertSchema = z.object({
  aId: z.string().min(1),
  bId: z.string().min(1),
  kind: z.enum(["MARRIED", "PARTNER", "CIVIL_UNION", "DE_FACTO", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "SEPARATED", "DIVORCED", "WIDOWED", "ENDED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = UpsertSchema.parse(await req.json());
    await assertBothOwnedOrAdmin(body.aId, body.bId, actor.userId, actor.role);
    const p = await upsertPartnership(body, actor);
    return NextResponse.json(p, { status: 201 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireUser();
    const { id } = DeleteSchema.parse(await req.json());
    // Optional: ensure ownership of both ends before delete by looking up the record.
    const record = await (await import("@/lib/db")).prisma.partnership.findUnique({
      where: { id }, select: { aId: true, bId: true }
    });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await (await import("@/lib/authz")).assertBothOwnedOrAdmin(record.aId, record.bId, actor.userId, actor.role);
    const res = await deletePartnershipById(id);
    return NextResponse.json(res);
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}
