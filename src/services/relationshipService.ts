// services/relationshipService.ts
import { prisma } from "@/lib/db";
import { requireUser, assertOwnerOrAdmin, isAdmin } from "@/lib/authorization";
import type { RelationshipType, ParentRole, ParentKind } from "@prisma/client";

export interface RelationshipInput {
  fromId: string;
  toId: string;
  type: RelationshipType;
  role?: ParentRole;
  kind?: ParentKind;
  metadata?: any;
}

export async function createRelationship(input: RelationshipInput) {
  const session = await requireUser();
  if (input.fromId === input.toId) throw new Error("Cannot relate a person to themselves");

  // validate persons exist and ownership
  const persons = await prisma.person.findMany({
    where: { id: { in: [input.fromId, input.toId] }, deletedAt: null },
    select: { id: true, createdById: true },
  });
  if (persons.length !== 2) throw new Error("Invalid person ids");
  const ids = persons.map(p => p.createdById);
  if (!isAdmin(session) && ids.some(ownerId => ownerId !== session.user.id)) {
    throw new Error("Forbidden");
  }

  // check circular ancestry for parent‑child
  if (input.type === "PARENT_CHILD") {
    const ancestor = await prisma.relationship.findFirst({
      where: {
        type: "PARENT_CHILD",
        fromId: input.toId,
        toId: input.fromId,
        deletedAt: null,
      },
    });
    if (ancestor) throw new Error("Circular parent/child relationship");
  }

  return prisma.relationship.create({
    data: {
      fromId: input.fromId,
      toId: input.toId,
      type: input.type,
      role: input.role,
      kind: input.kind,
      metadata: input.metadata,
      createdById: session.user.id,
    },
  });
}

export async function updateRelationship(id: string, updates: Partial<RelationshipInput>) {
  const session = await requireUser();
  const rel = await prisma.relationship.findUnique({ where: { id, deletedAt: null } });
  if (!rel) throw new Error("Not found");
  assertOwnerOrAdmin(session, rel.createdById);

  // only allow updates to role/kind/metadata; cannot change the ends or type
  return prisma.relationship.update({
    where: { id },
    data: {
      role: updates.role ?? rel.role,
      kind: updates.kind ?? rel.kind,
      metadata: updates.metadata ?? rel.metadata,
    },
  });
}

export async function deleteRelationship(id: string) {
  const session = await requireUser();
  const rel = await prisma.relationship.findUnique({ where: { id, deletedAt: null } });
  if (!rel) throw new Error("Not found");
  assertOwnerOrAdmin(session, rel.createdById);
  return prisma.relationship.update({ where: { id }, data: { deletedAt: new Date() } });
}
