import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isAdmin } from "@/lib/authz";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

export const PATCH = withCsrf(async (req: Request, { params }: { params: { id: string } }): Promise<Response> => {
  const session = await requireSession();
  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const { firstName, lastName, gender, birthDate, notes, imageUrl } = body;

  const person = await prisma.person.findUnique({
    where: { id, deletedAt: null },
    select: { createdById: true },
  });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin(session) && person.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.person.update({
    where: { id },
    data: {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(" "),
      gender,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      notes,
      imageUrl,
    },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withCsrf(async (_req: Request, { params }: { params: { id: string } }): Promise<Response> => {
  const session = await requireSession();
  const id = params.id;

  const person = await prisma.person.findUnique({
    where: { id, deletedAt: null },
    select: { createdById: true },
  });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin(session) && person.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.person.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
