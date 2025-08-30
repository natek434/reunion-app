import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { eventId, status, guests = 0, note = "" } = body as {
    eventId: string; status: "YES" | "NO" | "PENDING"; guests?: number; note?: string;
  };

  if (!eventId || !["YES","NO","PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rsvp = await prisma.rSVP.upsert({
    where: { eventId_userId: { eventId, userId: (session.user).id } },
    update: { status: status as any, guests, note },
    create: { eventId, userId: (session.user).id, status: status as any, guests, note },
  });
  return NextResponse.json({ ok: true, rsvp });
});
