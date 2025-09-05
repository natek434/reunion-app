import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, assertPersonOwnerOrAdmin } from "@/lib/authz";
import { updatePerson, softDeletePerson } from "@/server/services/members";

const UpdatePersonSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  displayName: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).optional(),
  birthDate: z.string().optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    await assertPersonOwnerOrAdmin(params.id, actor.userId, actor.role);
    const body = UpdatePersonSchema.parse(await req.json());
    const person = await updatePerson(params.id, body, actor);
    return NextResponse.json(person);
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    await assertPersonOwnerOrAdmin(params.id, actor.userId, actor.role);
    const person = await softDeletePerson(params.id);
    return NextResponse.json(person);
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}
