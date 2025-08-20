// src/app/api/account/use-person-avatar/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const image = session?.user?.image || null;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { personId: true },
  });
  if (!user?.personId) {
    return NextResponse.json({ error: "Not linked to a person" }, { status: 400 });
  }

  await prisma.person.update({
    where: { id: user.personId },
    data: { imageUrl: image ?? undefined },
  });

  return NextResponse.json({ ok: true, image });
}
