// src/app/api/relationship-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/authz";

const ParentChildSchema = z.object({
  type: z.literal("PARENT_CHILD"),
  parentId: z.string().min(1),
  childId: z.string().min(1),
  role: z.enum(["MOTHER","FATHER","PARENT"]),
  kind: z.enum(["BIOLOGICAL","WHANGAI"]).default("BIOLOGICAL"),
  message: z.string().optional(),
});

const PartnershipSchema = z.object({
  type: z.literal("PARTNERSHIP"),
  aId: z.string().min(1),
  bId: z.string().min(1),
  status: z.enum(["ACTIVE","SEPARATED","DIVORCED","WIDOWED","ENDED"]).default("ACTIVE"),
  kind: z.enum(["MARRIED","PARTNER","CIVIL_UNION","DE_FACTO","OTHER"]).default("PARTNER"),
  message: z.string().optional(),
});

const BodySchema = z.union([ParentChildSchema, PartnershipSchema]);

function mkHash(parts: string[]) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(); // must have actor.id
    const body = BodySchema.parse(await req.json());

    // Collect involved person ids
    const ids = body.type === "PARENT_CHILD"
      ? [body.parentId, body.childId]
      : [body.aId, body.bId];

    // Fetch people to find their creators (approvers)
    const people = await prisma.person.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, createdById: true },
    });
    if (people.length !== ids.length) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const creatorIds = new Set(people.map(p => p.createdById));
    const youOwnAll = [...creatorIds].every(uid => uid === actor.id);

    // Shortcut: if you own both sides, link immediately (no request)
    if (youOwnAll) {
      if (body.type === "PARENT_CHILD") {
       await prisma.parentChild.upsert({
  where: {
    parentId_childId_kind: {
      parentId: body.parentId,
      childId: body.childId,
      kind: body.kind,                 // <- required by your unique
    },
  },
  create: {
    parentId: body.parentId,
    childId: body.childId,
    role: body.role as any,
    kind: body.kind as any,
    createdById: actor.id,             // <- REQUIRED by your schema
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
          create: { aId: A, bId: B, status: body.status, kind: body.kind },
          update: { status: body.status, kind: body.kind },
        });
      }
      return NextResponse.json({ ok: true, linked: true }, { status: 201 });
    }

    // Otherwise, create pending requests for each foreign creator
    const approverIds = [...creatorIds].filter(uid => uid !== actor.id);
    if (approverIds.length === 0) {
      // defensive: should not happen if youOwnAll handled above
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

    const created = [];
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
          createdByUserId: actor.id,      // ← THIS was missing/wrong
          approverUserId,
          fromPersonId: base.fromPersonId,
          toPersonId: base.toPersonId,
          kind: base.kind,
          role: base.role ?? undefined,
          pcKind: base.pcKind ?? undefined,
          message: "message" in body ? body.message : undefined,
          status: "PENDING",
        },
        update: {}, // keep existing pending as-is
      });

      created.push(row);
    }

    return NextResponse.json({ ok: true, linked: false, requests: created }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.issues }, { status: 400 });
    }
    const any = err as any;
    return NextResponse.json({ error: any?.message || "Internal error" }, { status: any?.status ?? 500 });
  }
}
