import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/authz";

/*
 * Relationship request API
 *
 * This file defines both the POST handler used to create new relationship
 * requests and the GET handler used to list pending/handled requests.
 *
 * Highlights:
 *  - Uses `actor.userId` consistently.
 *  - Immediately links edges when the current user owns both people.
 *  - Deduplicates requests via a stable `openHash`.
 *  - GET supports scope/status filters, and an optional rich view
 *    (`detail=full`) that hydrates people + their owners WITHOUT relying
 *    on fragile Prisma relation names on RelationshipRequest.
 */

// ────────────── Validation ──────────────

const ParentChildSchema = z.object({
  type: z.literal("PARENT_CHILD"),
  parentId: z.string().min(1),
  childId: z.string().min(1),
  role: z.enum(["MOTHER", "FATHER", "PARENT"]),
  kind: z.enum(["BIOLOGICAL", "WHANGAI"]).default("BIOLOGICAL"),
  message: z.string().optional(),
});

const PartnershipSchema = z.object({
  type: z.literal("PARTNERSHIP"),
  aId: z.string().min(1),
  bId: z.string().min(1),
  status: z
    .enum(["ACTIVE", "SEPARATED", "DIVORCED", "WIDOWED", "ENDED"])
    .default("ACTIVE"),
  kind: z
    .enum(["MARRIED", "PARTNER", "CIVIL_UNION", "DE_FACTO", "OTHER"])
    .default("PARTNER"),
  message: z.string().optional(),
});

const BodySchema = z.union([ParentChildSchema, PartnershipSchema]);

// ────────────── Helpers ──────────────

/** Deterministic short hash to dedupe "open" requests. */
function mkHash(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

// this route mutates & lists frequently; never statically optimize
export const dynamic = "force-dynamic";

// ────────────── POST: create or directly link ──────────────

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = BodySchema.parse(await req.json());

    // person ids involved in the operation
    const ids = body.type === "PARENT_CHILD" ? [body.parentId, body.childId] : [body.aId, body.bId];

    // validate persons exist and are not deleted
    const people = await prisma.person.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, createdById: true },
    });
    if (people.length !== ids.length) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const creatorIds = new Set(people.map((p) => p.createdById));
    const youOwnAll = [...creatorIds].every((uid) => uid === actor.userId);

    // If caller owns both people, create the edge immediately.
    if (youOwnAll) {
      if (body.type === "PARENT_CHILD") {
        await prisma.parentChild.upsert({
          where: {
            parentId_childId_kind: {
              parentId: body.parentId,
              childId: body.childId,
              kind: body.kind,
            },
          },
          create: {
            parentId: body.parentId,
            childId: body.childId,
            role: body.role as any,
            kind: body.kind as any,
            createdById: actor.userId,
          },
          update: {
            role: body.role as any,
            kind: body.kind as any,
          },
        });
      } else {
        const [A, B] = body.aId < body.bId ? [body.aId, body.bId] : [body.bId, body.aId];
        await prisma.partnership.upsert({
          where: { aId_bId: { aId: A, bId: B } },
          create: {
            aId: A,
            bId: B,
            status: body.status,
            kind: body.kind,
            createdById: actor.userId,
          },
          update: {
            status: body.status,
            kind: body.kind,
          },
        });
      }
      return NextResponse.json({ ok: true, linked: true }, { status: 201 });
    }

    // Otherwise, create approval requests for each distinct other owner.
    const approverIds = [...creatorIds].filter((uid) => uid !== actor.userId);
    if (approverIds.length === 0) {
      return NextResponse.json({ error: "No approver determined" }, { status: 400 });
    }

    const base =
      body.type === "PARENT_CHILD"
        ? {
            fromPersonId: body.parentId,
            toPersonId: body.childId,
            kind: "PARENT_CHILD" as const,
            role: body.role,
            pcKind: body.kind,
          }
        : {
            fromPersonId: body.aId < body.bId ? body.aId : body.bId,
            toPersonId: body.aId < body.bId ? body.bId : body.aId,
            kind: "PARTNERSHIP" as const,
            role: null as any,
            pcKind: null as any,
          };

    const created: any[] = [];
    for (const approverUserId of approverIds) {
      const openHash = mkHash([
        base.kind,
        base.fromPersonId,
        base.toPersonId,
        base.role ?? "",
        base.pcKind ?? "",
        approverUserId,
      ]);
      const row = await prisma.relationshipRequest.upsert({
        where: { openHash },
        create: {
          openHash,
          createdByUserId: actor.userId,
          approverUserId,
          fromPersonId: base.fromPersonId,
          toPersonId: base.toPersonId,
          kind: base.kind,
          role: base.role ?? undefined,
          pcKind: base.pcKind ?? undefined,
          message: "message" in body ? (body as any).message : undefined,
          status: "PENDING",
        },
        update: {}, // no change if already pending
      });
      created.push(row);
    }

    return NextResponse.json({ ok: true, linked: false, requests: created }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: err?.status ?? 500 });
  }
}

// ────────────── GET: list requests (with optional hydration) ──────────────

type MiniUser = { id: string; name: string | null; email: string | null };
type MiniPerson = {
  id: string;
  preferredName: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  createdById: string | null;
  owner?: MiniUser | null; // hydrated later
};

export async function GET(req: NextRequest) {
  const actor = await requireUser();
  const params = (req as any).nextUrl?.searchParams ?? new URL(req.url).searchParams;

  const scope = params.get("scope") || "received"; // "received" | "sent"
  const status = params.get("status"); // "PENDING" | "APPROVED" | "REJECTED" | "CANCELED"
  const detail = params.get("detail") === "full"; // hydrate people & owners

  const where: any = {};
  if (scope === "sent") where.createdByUserId = actor.userId;
  else where.approverUserId = actor.userId;

  if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELED"].includes(status)) {
    where.status = status as any;
  }

  // 1) base list — no fragile includes on RelationshipRequest
  const requests = await prisma.relationshipRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (!detail || requests.length === 0) {
    return NextResponse.json({ ok: true, requests }, { status: 200 });
  }

  // 2) load involved people once
  const personIds = Array.from(
    new Set(
      requests.flatMap((r) => [r.fromPersonId, r.toPersonId].filter(Boolean) as string[]),
    ),
  );

  const people: MiniPerson[] = await prisma.person.findMany({
    where: { id: { in: personIds }, deletedAt: null },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      createdById: true,
    },
  });
  const peopleById = new Map(people.map((p) => [p.id, p]));

  // 3) load owners (users) for those people
  const ownerIds = Array.from(new Set(people.map((p) => p.createdById).filter(Boolean) as string[]));
  const owners: MiniUser[] = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const ownersById = new Map(owners.map((u) => [u.id, u]));

  // attach owner to each person
  for (const p of people) {
    p.owner = p.createdById ? ownersById.get(p.createdById) ?? null : null;
  }

  // 4) shape hydrated response
  const hydrated = requests.map((r) => ({
    ...r,
    fromPerson: peopleById.get(r.fromPersonId) ?? null,
    toPerson: peopleById.get(r.toPersonId) ?? null,
  }));

  return NextResponse.json({ ok: true, requests: hydrated }, { status: 200 });
}
