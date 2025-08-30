import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const { token, newPassword } = await req.json();
  const raw = String(token || "");
  const next = String(newPassword || "");
  if (!raw || next.length < 6) {
    return NextResponse.json(
      { error: "Invalid token or weak password (min 6 chars)" },
      { status: 400 }
    );
  }
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordReset.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);
  return NextResponse.json({ ok: true });
});
