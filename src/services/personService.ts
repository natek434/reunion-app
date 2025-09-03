// services/personService.ts
import { prisma } from "@/lib/db";
import { assertOwnerOrAdmin, requireUser, isAdmin } from "@/lib/authorization";

export async function createPerson(data: {
  firstName: string;
  lastName?: string;
  gender?: string;
  birthDate?: Date | null;
  notes?: string;
  imageUrl?: string;
}, link?: { parentId?: string; childId?: string; role?: ParentRole; kind?: ParentKind; }) {
  const session = await requireUser();

  // basic validation
  if (!data.firstName) throw new Error("firstName is required");
  const person = await prisma.person.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: [data.firstName, data.lastName].filter(Boolean).join(" "),
      gender: data.gender ?? "UNKNOWN",
      birthDate: data.birthDate ?? undefined,
      notes: data.notes,
      imageUrl: data.imageUrl,
      createdById: session.user.id,
    },
  });

  // optional relationship on create
  if (link) {
    await createRelationship({
      fromId: link.parentId ?? person.id,
      toId: link.childId ?? person.id,
      type: "PARENT_CHILD",
      role: link.role ?? (data.gender === "FEMALE" ? "MOTHER" : data.gender === "MALE" ? "FATHER" : "PARENT"),
      kind: link.kind ?? "BIOLOGICAL",
    });
  }

  return person;
}

export async function updatePerson(id: string, updates: Partial<Person>) {
  const session = await requireUser();
  const record = await prisma.person.findUnique({ where: { id, deletedAt: null }, select: { createdById: true } });
  if (!record) throw new Error("Not found");
  assertOwnerOrAdmin(session, record.createdById);
  return prisma.person.update({
    where: { id },
    data: {
      ...updates,
      displayName: updates.firstName || updates.lastName
        ? [updates.firstName ?? record.firstName, updates.lastName ?? record.lastName]
            .filter(Boolean)
            .join(" ")
        : undefined,
    },
  });
}

export async function deletePerson(id: string) {
  const session = await requireUser();
  const record = await prisma.person.findUnique({ where: { id, deletedAt: null }, select: { createdById: true } });
  if (!record) throw new Error("Not found");
  assertOwnerOrAdmin(session, record.createdById);
  // also soft‑delete related relationships
  await prisma.$transaction([
    prisma.relationship.updateMany({ where: { OR: [{ fromId: id }, { toId: id }], deletedAt: null }, data: { deletedAt: new Date() } }),
    prisma.person.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  return { ok: true };
}
