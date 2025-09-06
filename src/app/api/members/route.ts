// src/app/api/members/route.ts (or wherever this lives)
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createPerson } from "@/server/services/members";
import { requireUser } from "@/lib/authz";

const emptyToUndef = (v: unknown) =>
  v === null ? undefined : typeof v === "string" && v.trim() === "" ? undefined : v;

const CreatePersonSchema = z.object({
  firstName: z.preprocess(
    v => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "firstName is required")
  ),
  lastName: z.preprocess(
    emptyToUndef,
    z.string().trim().min(1, "lastName cannot be empty").optional()
  ),
  displayName: z.preprocess(emptyToUndef, z.string().trim().optional()),
  gender: z.preprocess(
    emptyToUndef,
    z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).default("UNKNOWN")
  ),
  birthDate: z.preprocess(
    emptyToUndef,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate must be YYYY-MM-DD")
      .optional()
  ),
  imageUrl: z.preprocess(emptyToUndef, z.string().url("imageUrl must be a URL").optional()),
  notes: z.preprocess(emptyToUndef, z.string().trim().optional()),
  createdByIdOverride: z.preprocess(emptyToUndef, z.string().trim().optional()),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();

    let bodyUnknown: unknown;
    try {
      bodyUnknown = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const body = CreatePersonSchema.parse(bodyUnknown);

    // Pass normalized, trimmed, null-free fields to your service.
    const person = await createPerson(body, actor);
    return NextResponse.json(person, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }

    // If your service throws { status, message }, respect it.
    const anyErr = err as { status?: number; message?: string };
    const status = anyErr?.status && Number.isInteger(anyErr.status) ? anyErr.status! : 500;
    const message = anyErr?.message || "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}
