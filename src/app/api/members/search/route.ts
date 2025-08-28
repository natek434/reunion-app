// src/app/api/members/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  

  const rows = await prisma.person.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName:  { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
          deletedAt: null,
        }
      : { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, displayName: true, gender: true, birthDate: true },
    orderBy: [{ displayName: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    take: 20,
  });

  // ensure a non-empty label goes to the client
  const out = rows.map(r => ({
    id: r.id,
    displayName: r.displayName && r.displayName.trim().length > 0
      ? r.displayName
      : `${r.firstName}${r.lastName ? " " + r.lastName : ""}`,
    gender: r.gender,
    birthDate: r.birthDate,
  }));

  return NextResponse.json(out);
}
