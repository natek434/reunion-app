import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: (session.user).id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!user.passwordHash) {
    return NextResponse.json({ error: "No local password set" }, { status: 400 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  return NextResponse.json({ ok: true });
}
