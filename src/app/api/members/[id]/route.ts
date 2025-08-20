import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canEditPerson } from "@/lib/authz";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  const person = await prisma.person.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true },
  });
  if (!person || !canEditPerson(session, person.createdById)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, gender, birthDate, notes, imageUrl, locked } = body;

  await prisma.person.update({
    where: { id: params.id },
    data: {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(" "),
      gender,
      birthDate: birthDate ? new Date(birthDate) : null,
      notes,
      imageUrl,
      locked: typeof locked === "boolean" ? locked : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  const person = await prisma.person.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true },
  });
  if (!person || !canEditPerson(session, person.createdById)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Hard delete with cascading edges per your schema (onDelete: Cascade)
  await prisma.parentChild.deleteMany({ where: { OR: [{ parentId: params.id }, { childId: params.id }] } });
  await prisma.person.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
