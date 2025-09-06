// src/app/api/relationships/parent-child/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { linkParentChild, unlinkParentChild } from "@/server/services/members";

export const dynamic = "force-dynamic";

const LinkSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1),
  role: z.enum(["MOTHER", "FATHER", "PARENT"]),
  kind: z.enum(["BIOLOGICAL", "WHANGAI"]).default("BIOLOGICAL"),
  metadata: z.record(z.any()).optional(),
});

const UnlinkSchema = z.object({
  id: z.string().optional(),
  parentId: z.string().optional(),
  childId: z.string().optional(),
  kind: z.enum(["BIOLOGICAL", "WHANGAI"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(); // expect { userId, role }
    const body = LinkSchema.parse(await req.json());

    if (body.parentId === body.childId) {
      return NextResponse.json({ error: "Parent and child cannot be the same" }, { status: 400 });
    }

    // Make sure both people exist and check ownership
    const people = await prisma.person.findMany({
      where: { id: { in: [body.parentId, body.childId] }, deletedAt: null },
      select: { id: true, createdById: true },
    });
    if (people.length !== 2) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const ownsBoth = people.every(p => p.createdById === actor.userId);
    const canDirect = actor.role === "ADMIN" || ownsBoth;

    if (!canDirect) {
      // client detects this and posts to /api/relationship-requests
      return NextResponse.json(
        { error: "Needs approval", code: "FORBIDDEN_NEEDS_APPROVAL" },
        { status: 403 }
      );
    }

    // Direct link (service should set createdById = actor.userId)
    const edge = await linkParentChild(body, actor);
    return NextResponse.json(edge, { status: 201 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = UnlinkSchema.parse(await req.json());

    // If id is provided, check edge ownership by id
    if (body.id) {
      const edge = await prisma.parentChild.findUnique({ where: { id: body.id } });
      if (!edge) return NextResponse.json({ ok: true }); // idempotent
      if (actor.role !== "ADMIN" && edge.createdById !== actor.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const res = await unlinkParentChild({ id: body.id });
      return NextResponse.json(res);
    }

    // Otherwise, require pair; kind is strongly recommended
    if (!body.parentId || !body.childId) {
      return NextResponse.json({ error: "Missing id or (parentId, childId)" }, { status: 400 });
    }

    // Resolve edge, respecting kind if provided; try BIOLOGICAL then WHANGAI if omitted
    const tryKinds = body.kind ? [body.kind] as const : (["BIOLOGICAL", "WHANGAI"] as const);
    let edge = null as Awaited<ReturnType<typeof prisma.parentChild.findUnique>> | null;
    for (const k of tryKinds) {
      edge = await prisma.parentChild.findUnique({
        where: { parentId_childId_kind: { parentId: body.parentId, childId: body.childId, kind: k as any } },
      });
      if (edge) break;
    }

    if (!edge) return NextResponse.json({ ok: true });

    if (actor.role !== "ADMIN" && edge.createdById !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const res = await unlinkParentChild({ id: edge.id });
    return NextResponse.json(res);
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status });
  }
}
