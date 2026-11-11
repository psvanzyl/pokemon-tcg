import { NextResponse } from "next/server";
import { findUserByEmail, normalizeEmail } from "@/lib/accounts";
import { createResetToken } from "@/lib/reset-tokens";
import { emailConfigured, sendMail } from "@/lib/email";
import { authConfigured, clientIp, originAllowed, rateLimit, serverErrorResponse } from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Sends a 30-minute, single-use password-reset link. Answers identically whether or not
 * the account exists (no account-existence leak). Google-only accounts ("google:oauth"
 * marker) have no password to reset — same generic answer, no mail.
 */

function baseUrl(req: Request): string {
  const env = process.env.APP_URL;
  if (env) return env.replace(/\/+$/, "");
  const host = req.headers.get("host");
  if (host) return `https://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

const OK = NextResponse.json({
  ok: true,
  message: "If an account exists for this email, a reset link has been sent.",
});

const handler_POST = async (req: Request) => {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  // Loud on server misconfiguration (before any user lookup, so the answer never hints
  // at account existence) — a silently dead mailer is worse than a visible 503.
  if (!authConfigured() || !emailConfigured()) {
    return NextResponse.json(
      { error: "mail_unavailable", message: "Password reset is not configured on this server yet." },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const byIp = rateLimit(`forgot-ip:${ip}`, 30, 900_000);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts — try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } },
    );
  }

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const email = normalizeEmail(String(body.email ?? ""));
  if (!email) return OK;

  const byEmail = rateLimit(`forgot-email:${email}`, 5, 900_000);
  if (!byEmail.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests for this account — try again later." },
      { status: 429, headers: { "Retry-After": String(byEmail.retryAfter) } },
    );
  }

  try {
    const user = email ? await findUserByEmail(email) : undefined;
    if (!user || user.passwordHash.startsWith("google:")) return OK;

    const token = await createResetToken(email, 30);
    const base = baseUrl(req);
    const link = `${base}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your password — Pokédex",
      text:
        `You asked to reset your password for ${base}.\n\n` +
        `Open this link to choose a new password:\n\n${link}\n\n` +
        `The link is valid for 30 minutes and can be used once.\n` +
        `If you did not request this, ignore the email — your password stays unchanged.`,
      html:
        `<p>You asked to reset your password for <a href="${base}">${base}</a>.</p>` +
        `<p><a href="${link}">Choose a new password</a></p>` +
        `<p>The link is valid for 30 minutes and can be used once.<br>` +
        `If you did not request this, ignore the email — your password stays unchanged.</p>`,
    });
    return OK;
  } catch (e) {
    return serverErrorResponse(e, "forgot-password");
  }
};

export const POST = jsonRoute("auth-forgot-password", { POST: handler_POST });
