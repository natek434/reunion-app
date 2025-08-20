import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

export async function POST(_: Request, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;                     // <-- await the Promise
  const role = (session?.user)?.role;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.person.update({ where: { id: id }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true });
}
