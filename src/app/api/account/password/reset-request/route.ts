import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { getBaseUrl } from "@/lib/base-url";
import { randomBytes, createHash } from "crypto";
import { withCsrf } from "@/lib/csrf-server";
import { renderPasswordResetEmail } from "@/lib/emails/password-reset";

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
  if (!user) return NextResponse.json({ ok: true }); // don’t leak existence

  await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const url = `${getBaseUrl()}/reset?token=${raw}`;
  const { subject, html, text } = renderPasswordResetEmail({
    appName: "Rangi & Rarati Hanara Reunion",
    resetUrl: url,
    minutes: EXPIRY_MINUTES,
    supportEmail: "admin@rangiandararatinanara.com",
  });

  await sendMail({
    to: user.email!,
    subject,
    html,
    text,
    // Helpful for analytics in Mailtrap
    headers: {
      "X-MT-Category": "password_reset",
      "X-MT-Custom-Variables": JSON.stringify({ flow: "password_reset", expires_minutes: EXPIRY_MINUTES }),
    },
  });

  return NextResponse.json({ ok: true });
});
