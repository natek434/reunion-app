import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { withCsrf } from "@/lib/csrf-server";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(7),
});

export const runtime = "nodejs";

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const data = await req.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });
  return NextResponse.json({ ok: true });
});
