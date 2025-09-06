// src/app/api/account/person-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const personId: string | null = body?.personId ?? null;

  // Allow unlink
  if (!personId) {
    await prisma.user.update({
      where: { id: userId },
      data: { personId: null },
    });
    return NextResponse.json({ ok: true });
  }

  // Allow linking to ANY existing, non-deleted person
  const person = await prisma.person.findFirst({
    where: { id: personId, deletedAt: null },
    select: { id: true, displayName: true, firstName: true, lastName: true },
  });
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { personId: person.id },
  });

  const label =
    person.displayName ||
    `${person.firstName} ${person.lastName ?? ""}`.trim();

  return NextResponse.json({ ok: true, person: { id: person.id, label } });
}
