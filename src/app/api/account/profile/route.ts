import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { withCsrf } from "@/lib/csrf-server";

const isProd = process.env.NODE_ENV === "production";
const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
function getAllowedHosts() {
  const set = new Set<string>([
    "lh3.googleusercontent.com",
    "lh4.googleusercontent.com",
    "lh5.googleusercontent.com",
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  try {
    if (appUrl) set.add(new URL(appUrl).hostname);
  } catch {}
  return set;
}
function isAllowedImageUrl(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return getAllowedHosts().has(u.hostname);
  } catch {
    return false;
  }
}
const imageField = z.union([
  z.string().trim().refine(isAllowedImageUrl, "Image must be /api/files/:id or an allowed host URL"),
  z.null(),
]);
const schema = z.object({
  name: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  image: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    imageField.optional()
  ),
});

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: (session.user).id },
    select: { name: true, image: true },
  });
  return NextResponse.json({
    name: user?.name ?? null,
    image: typeof user?.image !== "undefined" ? user.image : null,
  });
}

export const PATCH = withCsrf(async (req: Request): Promise<Response> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return NextResponse.json(
      isProd ? { error: "Invalid payload" } : { error: "Invalid payload", details },
      { status: 400 },
    );
  }
  const { name, image } = parsed.data;
  if (typeof name === "undefined" && typeof image === "undefined") {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (typeof name !== "undefined") data.name = name;
  if (typeof image !== "undefined") data.image = image;

  const user = await prisma.user.update({
    where: { id: (session.user).id },
    data,
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: user.id });
});
