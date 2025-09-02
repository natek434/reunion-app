// src/lib/emails/password-reset.ts
export function renderPasswordResetEmail(opts: {
  appName: string;
  resetUrl: string;
  minutes: number;
  supportEmail?: string;
}) {
  const { appName, resetUrl, minutes, supportEmail } = opts;

  const subject = `${appName}: reset your password`;

  const text = [
    `${appName} password reset`,
    ``,
    `Someone requested a password reset for your account.`,
    `Use the link below to set a new password (expires in ${minutes} minutes):`,
    resetUrl,
    ``,
    `If you didn’t request this, you can ignore this email.`,
    supportEmail ? `Need help? Contact ${supportEmail}` : ``,
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7f9;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:20px 24px;background:#111;color:#fff;font-weight:600;font-size:16px;">
                ${appName}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#111;">Reset your password</h1>
                <p style="margin:0 0 16px 0;font-size:14px;color:#444;">
                  Someone requested a password reset for your account. This link expires in <b>${minutes} minutes</b>.
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px 0;">
                  <tr>
                    <td>
                      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                        Set a new password
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 12px 0;font-size:13px;color:#666;">
                  If the button doesn’t work, copy and paste this link into your browser:
                </p>

                <p style="margin:0 0 16px 0;font-size:12px;color:#555;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#0b57d0;text-decoration:underline;">${resetUrl}</a>
                </p>

                <p style="margin:0 0 4px 0;font-size:12px;color:#666;">
                  If you didn’t request this, you can safely ignore this email.
                </p>
                ${supportEmail ? `<p style="margin:0;font-size:12px;color:#666;">Questions? Contact <a href="mailto:${supportEmail}" style="color:#0b57d0;text-decoration:underline;">${supportEmail}</a></p>` : ``}
              </td>
            </tr>

            <tr>
              <td style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;color:#888;font-size:11px;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </td>
            </tr>
          </table>

          <div style="font-size:0;line-height:0;height:24px;">&nbsp;</div>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, html, text };
}
