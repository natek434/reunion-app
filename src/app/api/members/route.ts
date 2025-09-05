import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPerson } from "@/server/services/members";
import { requireUser } from "@/lib/authz";

const CreatePersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).optional(),
  birthDate: z.string().optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
  createdByIdOverride: z.string().optional(), // honored only for admins in service
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = CreatePersonSchema.parse(await req.json());
    const person = await createPerson(body, actor);
    return NextResponse.json(person, { status: 201 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}
