import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ personId: null });
  const user = await prisma.user.findUnique({ where: { email }, select: { personId: true } });
  return NextResponse.json({ personId: user?.personId ?? null });
}
