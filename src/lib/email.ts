import mjml2html from "mjml";
import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Pluggable email delivery. Starts with SMTP (works with any provider);
 * a hosted Cloud tier can swap this for a high-deliverability API later.
 */

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
    : undefined,
});

export async function renderMjml(mjml: string): Promise<string> {
  const { html, errors } = await mjml2html(mjml, { validationLevel: "soft" });
  if (errors.length > 0) {
    // Soft validation: log but still send the best-effort HTML.
    console.warn(
      "MJML render warnings:",
      errors.map((e: { formattedMessage: string }) => e.formattedMessage),
    );
  }
  return html;
}

export interface SendArgs {
  to: string;
  subject: string;
  mjml: string;
  /** If provided, adds RFC 8058 one-click unsubscribe headers (POST). */
  unsubscribeUrl?: string;
}

export async function sendEmail({
  to,
  subject,
  mjml,
  unsubscribeUrl,
}: SendArgs): Promise<void> {
  const html = await renderMjml(mjml);
  const headers: Record<string, string> = {};
  if (unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    headers,
  });
}
