import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const data = await req.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });

  return NextResponse.json({ ok: true });
}
