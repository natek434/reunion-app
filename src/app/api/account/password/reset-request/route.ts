import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { getBaseUrl } from "@/lib/base-url";
import { randomBytes, createHash } from "crypto";
import { withCsrf } from "@/lib/csrf-server";

export const runtime = "nodejs";
const EXPIRY_MINUTES = 60;

export const POST = withCsrf(async (req: Request): Promise<Response> => {
  const { email } = await req.json();
  const target = String(email || "").trim().toLowerCase();
  if (!target) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email: target },
    select: { id: true, email: true },
  });
  if (!user) return NextResponse.json({ ok: true });

  await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const url = `${getBaseUrl()}/reset?token=${raw}`;
  await sendMail({
    to: user.email!,
    subject: "Reset your password",
    html: `<p>Click the link to set a new password (expires in ${EXPIRY_MINUTES} minutes):</p>
           <p><a href="${url}">${url}</a></p>`,
  });

  return NextResponse.json({ ok: true });
});
