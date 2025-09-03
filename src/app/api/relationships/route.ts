// src/app/api/relationships/route.ts
import { NextResponse } from "next/server";
import { createRelationship, updateRelationship, deleteRelationship } from "@/services/relationshipService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const relationship = await createRelationship(body);
    return NextResponse.json({ ok: true, id: relationship.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    await updateRelationship(id, updates);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? (await req.json()).id;
    await deleteRelationship(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
