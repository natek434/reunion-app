import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { isAdminish } from "@/lib/authz";

type CreatePersonInput = {
  firstName: string;
  lastName: string;
  displayName?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  birthDate?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  // admin can optionally create on behalf of user:
  createdByIdOverride?: string;
};

export async function createPerson(input: CreatePersonInput, actor: { userId: string; role: "ADMIN" | "EDITOR" | "MEMBER" }) {
  const createdById = isAdminish(actor.role) && input.createdByIdOverride ? input.createdByIdOverride : actor.userId;
  return prisma.person.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.displayName ?? null,
      gender: input.gender ?? "UNKNOWN",
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      imageUrl: input.imageUrl ?? null,
      notes: input.notes ?? null,
      createdById,
    },
  });
}

export async function updatePerson(id: string, data: Partial<Omit<CreatePersonInput, "createdByIdOverride">>, actor: { userId: string; role: "ADMIN" | "EDITOR" | "MEMBER" }) {
  // Ownership checked by route before calling (keeps service focused).
  const toUpdate: Prisma.PersonUpdateInput = {
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName ?? undefined,
    gender: data.gender ?? undefined,
    birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    imageUrl: data.imageUrl ?? undefined,
    notes: data.notes ?? undefined,
  };
  return prisma.person.update({ where: { id }, data: toUpdate });
}

export async function softDeletePerson(id: string) {
  // Also consider cascading deletes on edges (soft-delete strategy: keep edges, respect via queries)
  return prisma.person.update({ where: { id }, data: { deletedAt: new Date() } });
}

/* ---------------- Relationships ---------------- */

export async function linkParentChild(
  input: {
    parentId: string;
    childId: string;
    role: "MOTHER" | "FATHER" | "PARENT";
    kind?: "BIOLOGICAL" | "WHANGAI";
    metadata?: Record<string, any> | null;
  },
  actor: { userId: string; role: "ADMIN" | "EDITOR" | "MEMBER" }
) {
  if (input.parentId === input.childId) throw badReq("Cannot link a person as their own parent.");

  // Cycle prevention: ensure child is not an ancestor of parent
  const cycle = await isDescendant(input.parentId, input.childId); // is parent already a descendant of child?
  if (cycle) throw badReq("Link would create a cycle in the family tree.");

  // Insert edge (unique constraints will guard duplicates)
  return prisma.parentChild.create({
    data: {
      parentId: input.parentId,
      childId: input.childId,
      role: input.role,
      kind: input.kind ?? "BIOLOGICAL",
      metadata: input.metadata ?? undefined,
      createdById: actor.userId,
    },
  });
}

export async function unlinkParentChild(edgeIdOrPair: { id?: string; parentId?: string; childId?: string; kind?: "BIOLOGICAL" | "WHANGAI" }) {
  if (edgeIdOrPair.id) {
    return prisma.parentChild.delete({ where: { id: edgeIdOrPair.id } });
  }
  if (!edgeIdOrPair.parentId || !edgeIdOrPair.childId) throw badReq("Provide edge id or both parentId and childId.");
  // kind-aware if provided
  return prisma.parentChild.deleteMany({
    where: {
      parentId: edgeIdOrPair.parentId,
      childId: edgeIdOrPair.childId,
      ...(edgeIdOrPair.kind ? { kind: edgeIdOrPair.kind } : {}),
    },
  });
}

export async function upsertPartnership(
  input: {
    aId: string;
    bId: string;
    kind?: "MARRIED" | "PARTNER" | "CIVIL_UNION" | "DE_FACTO" | "OTHER";
    status?: "ACTIVE" | "SEPARATED" | "DIVORCED" | "WIDOWED" | "ENDED";
    startDate?: string | null;
    endDate?: string | null;
    metadata?: Record<string, any> | null;
  },
  actor: { userId: string; role: "ADMIN" | "EDITOR" | "MEMBER" }
) {
  if (input.aId === input.bId) throw badReq("Cannot partner a person with themselves.");
  // canonical ordering to satisfy unique (aId, bId)
  const [A, B] = input.aId < input.bId ? [input.aId, input.bId] : [input.bId, input.aId];

  const data: Prisma.PartnershipUpsertArgs["create"] = {
    aId: A,
    bId: B,
    kind: input.kind ?? "PARTNER",
    status: input.status ?? "ACTIVE",
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
    metadata: input.metadata ?? undefined,
    createdById: actor.userId,
  };

  // Try update then create on conflict
  return prisma.partnership.upsert({
    where: { aId_bId: { aId: A, bId: B } },
    update: {
      kind: data.kind,
      status: data.status,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
      metadata: data.metadata ?? undefined,
    },
    create: data,
  });
}

export async function deletePartnershipById(id: string) {
  return prisma.partnership.delete({ where: { id } });
}

/* ---------------- Helpers ---------------- */

function badReq(msg: string) {
  const e = new Error(msg);
  (e as any).status = 400;
  return e;
}

// Detect if `targetId` is a descendant of `sourceId` (i.e., path source -> ... -> target).
async function isDescendant(sourceId: string, targetId: string) {
  if (sourceId === targetId) return true;
  const queue: string[] = [sourceId];
  const visited = new Set<string>();
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const kids = await prisma.parentChild.findMany({
      where: { parentId: cur },
      select: { childId: true },
    });
    for (const k of kids) {
      if (k.childId === targetId) return true;
      queue.push(k.childId);
    }
  }
  return false;
}
