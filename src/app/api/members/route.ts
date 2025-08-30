import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const session = await requireSession();
  const body = await req.json();

  const {
    firstName,
    lastName,
    gender,
    birthDate,
    notes,
    imageUrl,
    linkMotherId,
    linkFatherId,
    linkChildId,
    linkKind = "BIOLOGICAL",
  } = body;

  if (!firstName) {
    return NextResponse.json({ error: "firstName required" }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(" "),
      gender,
      birthDate: birthDate ? new Date(birthDate) : null,
      notes,
      imageUrl,
      createdById: session.user.id,
    },
    select: { id: true, gender: true },
  });

  const edges: Array<Parameters<typeof prisma.parentChild.createMany>[0]["data"][number]> = [];

  if (linkMotherId) edges.push({
    parentId: linkMotherId,
    childId: person.id,
    role: "MOTHER",
    kind: linkKind,
  });
  if (linkFatherId) edges.push({
    parentId: linkFatherId,
    childId: person.id,
    role: "FATHER",
    kind: linkKind,
  });
  if (linkChildId) edges.push({
    parentId: person.id,
    childId: linkChildId,
    role: person.gender === "FEMALE" ? "MOTHER" : person.gender === "MALE" ? "FATHER" : "PARENT",
    kind: linkKind,
  });

  if (edges.length) {
    await prisma.parentChild.createMany({ data: edges, skipDuplicates: true });
  }

  return NextResponse.json({ personId: person.id }, { status: 201 });
});
