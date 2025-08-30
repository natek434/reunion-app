import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

export const PATCH = withCsrf(async (req: Request): Promise<Response> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { personId } = await req.json();
  if (!personId) return NextResponse.json({ error: "Missing personId" }, { status: 400 });

  const p = await prisma.person.findUnique({
    where: { id: personId },
    select: { createdById: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin(session) && p.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { personId },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withCsrf(async (_req: Request): Promise<Response> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { personId: null },
  });
  return NextResponse.json({ ok: true });
});
