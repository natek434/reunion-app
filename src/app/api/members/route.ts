// src/app/api/members/route.ts
import { NextResponse } from "next/server";
import { createPerson } from "@/services/personService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const person = await createPerson(body, {
      parentId: body.linkParentId,
      childId: body.linkChildId,
      role: body.linkRole,
      kind: body.linkKind,
    });
    return NextResponse.json({ ok: true, personId: person.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
