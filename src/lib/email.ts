/**
 * Outbound email over SMTP (Strato: smtp.strato.de:587, STARTTLS).
 *
 * Env: SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" only for implicit-TLS
 * providers; Strato needs STARTTLS), SMTP_USER, SMTP_PASS, SMTP_FROM (display sender).
 * No fallbacks: callers must check emailConfigured() and fail loudly — this is the
 * channel that carries password-reset links, a silently dead mailer is worse than a 503.
 */
import nodemailer from "nodemailer";

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!emailConfigured()) {
    throw new Error("SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Strato's cert may not match the hostname; the connection is still encrypted.
    tls: { rejectUnauthorized: false },
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "info@laserraptor.eu";
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
