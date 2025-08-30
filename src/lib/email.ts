import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function makeTransporter() {
  const { EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD } = process.env;

  if (!EMAIL_SERVER_HOST) return null; // dev fallback to console

  const port = Number(EMAIL_SERVER_PORT || 587);
  const secure = port === 465; // true = TLS/SMTPS, 465; false = STARTTLS, 587

  return nodemailer.createTransport({
    host: EMAIL_SERVER_HOST,
    port,
    secure,
    auth: {
      user: EMAIL_SERVER_USER,
      pass: EMAIL_SERVER_PASSWORD,
    },
    // pool: true, // enable if you’ll send bursts
  });
}

export function getTransporter() {
  if (!cachedTransporter) cachedTransporter = makeTransporter();
  return cachedTransporter;
}

export async function verifyEmailTransport() {
  const t = getTransporter();
  if (!t) return { ok: false, reason: "No SMTP env set; will log emails to console." };
  await t.verify();
  return { ok: true };
}

export async function sendMail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  const t = getTransporter();
  const defaultFrom =
    process.env.EMAIL_FROM ||
    `no-reply@${new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname}`;

  if (!t) {
    // DEV fallback: no SMTP configured → just log
    console.log(`[DEV MAIL] To: ${to}\nSubject: ${subject}\n\n${text || html}`);
    return;
  }

  await t.sendMail({
    from: from || defaultFrom,
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html,
  });
}
