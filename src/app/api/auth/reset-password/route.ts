import { NextResponse } from "next/server";
import { findUserByEmail, updateUser } from "@/lib/accounts";
import { consumeResetToken } from "@/lib/reset-tokens";
import {
  PASSWORD_MIN,
  authConfigured,
  clientIp,
  hashPassword,
  isValidPassword,
  originAllowed,
  rateLimit,
  serverErrorResponse,
  withSessionCookie,
} from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

const INVALID = {
  error: "invalid_or_expired_link",
  message: "This reset link is invalid or has expired. Request a new one.",
};

/**
 * POST /api/auth/reset-password  { token, password }
 *
 * Consumes the single-use token (POST-only; the emailed link is a GET and never
 * consumes), verifies the password against the registration policy, stores the new
 * scrypt hash, and signs the user straight in.
 */
const handler_POST = async (req: Request) => {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "auth_unavailable", message: "Sign-in is not configured on this server yet." },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const byIp = rateLimit(`reset-ip:${ip}`, 30, 900_000);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts — try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } },
    );
  }

  let body: { token?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  const email = await consumeResetToken(token);
  if (!email) return NextResponse.json(INVALID, { status: 400 });

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "invalid_password", message: `Use at least ${PASSWORD_MIN} characters.` },
      { status: 400 },
    );
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || user.passwordHash.startsWith("google:")) {
      return NextResponse.json(INVALID, { status: 400 });
    }
    await updateUser(user.id, { passwordHash: await hashPassword(password) });
    const res = NextResponse.json({ ok: true, user: { email: user.email, name: user.name ?? null } });
    return withSessionCookie(res, req, user.id);
  } catch (e) {
    return serverErrorResponse(e, "reset-password");
  }
};

export const POST = jsonRoute("auth-reset-password", { POST: handler_POST });
