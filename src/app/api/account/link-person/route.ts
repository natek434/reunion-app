import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { personId } = await req.json().catch(() => ({}));
  if (!personId) return NextResponse.json({ error: "Missing personId" }, { status: 400 });

  const person = await prisma.person.findUnique({
    where: { id: personId, deletedAt: null },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  try {
    await prisma.user.update({ where: { email }, data: { personId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "This person is already linked" }, { status: 409 });
    }
    console.error("link-person error", e);
    return NextResponse.json({ error: "Failed to link person" }, { status: 500 });
  }
});
