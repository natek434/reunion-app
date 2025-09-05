import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, assertBothOwnedOrAdmin } from "@/lib/authz";
import { linkParentChild, unlinkParentChild } from "@/server/services/members";

const LinkSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1),
  role: z.enum(["MOTHER", "FATHER", "PARENT"]),
  kind: z.enum(["BIOLOGICAL", "WHANGAI"]).optional(),
  metadata: z.record(z.any()).optional(),
});

const UnlinkSchema = z.object({
  id: z.string().optional(),
  parentId: z.string().optional(),
  childId: z.string().optional(),
  kind: z.enum(["BIOLOGICAL", "WHANGAI"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = LinkSchema.parse(await req.json());
    await assertBothOwnedOrAdmin(body.parentId, body.childId, actor.userId, actor.role);
    const edge = await linkParentChild(body, actor);
    return NextResponse.json(edge, { status: 201 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = UnlinkSchema.parse(await req.json());
    // Ownership: if pair is provided, ensure both owned; if id is provided, we’ll trust DB owner via separate check (optional).
    if (body.parentId && body.childId) {
      await assertBothOwnedOrAdmin(body.parentId, body.childId, actor.userId, actor.role);
    }
    const res = await unlinkParentChild(body);
    return NextResponse.json(res);
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}
