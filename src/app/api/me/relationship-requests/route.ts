// src/app/api/me/relationship-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireUser();
  const rows = await prisma.relationshipRequest.findMany({
    where: { approverUserId: actor.userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows, { status: 200 });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
