import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export const POST = withCsrf<{ params: Params }>(async (_req: Request, { params }): Promise<Response> => {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session?.user)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.person.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true });
});
