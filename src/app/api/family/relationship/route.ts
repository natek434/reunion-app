// src/app/api/family/relationship/route.ts
import { NextResponse } from "next/server";
import { describeRelationship } from "@/lib/kinship";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get("a");
  const b = searchParams.get("b");
  if (!a || !b) return NextResponse.json({ error: "Missing a/b" }, { status: 400 });
  const label = await describeRelationship(a, b);
  return NextResponse.json({ ok: true, label });
}
