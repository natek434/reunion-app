// src/app/api/family/person/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  // Auth
  const session = await getServerSession(authOptions);
  let userId = (session?.user)?.id as string | undefined;
  let role = (session?.user)?.role as "ADMIN" | "EDITOR" | "MEMBER" | undefined;

  if (!userId && session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (dbUser) {
      userId = dbUser.id;
      role = dbUser.role as any;
    }
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(role === "ADMIN" || role === "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const firstName = String(payload.firstName || "").trim();
  const lastName  = String(payload.lastName  || "").trim();
  const gender    = String(payload.gender    || "UNKNOWN").toUpperCase();
  const birthDate = payload.birthDate ? new Date(payload.birthDate) : null;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }
  if (!["MALE", "FEMALE", "OTHER", "UNKNOWN"].includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  // Create
  try {
    const person = await prisma.person.create({
      data: { firstName, lastName, gender, birthDate: birthDate || undefined },
      select: { id: true, firstName: true, lastName: true, gender: true },
    });
    return NextResponse.json({ ok: true, person });
  } catch (e: any) {
    console.error("Create person error:", e);
    return NextResponse.json({ error: "Failed to create person" }, { status: 500 });
  }
}
