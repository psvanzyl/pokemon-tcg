import { NextResponse } from "next/server";
import { findUserByEmail, normalizeEmail, updateUser } from "@/lib/accounts";
import {
  authConfigured,
  clientIp,
  originAllowed,
  rateLimit,
  serverErrorResponse,
  verifyPassword,
  withSessionCookie,
} from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

/** One generic failure for every bad-credential case — never reveal whether the email exists. */
const BAD = { error: "invalid_credentials", message: "Wrong email or password." };

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
  const byIp = rateLimit(`login-ip:${ip}`, 30, 900_000);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts — try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  const byEmail = rateLimit(`login-email:${email}`, 10, 900_000);
  if (!byEmail.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts for this account — try again later." },
      { status: 429, headers: { "Retry-After": String(byEmail.retryAfter) } },
    );
  }

  try {
    const user = email ? await findUserByEmail(email) : undefined;
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      return NextResponse.json(BAD, { status: 401 });
    }

    await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    const res = NextResponse.json({ ok: true, user: { email: user.email, name: user.name ?? null } });
    return withSessionCookie(res, req, user.id);
  } catch (e) {
    // Without this the 500 has an empty body and the browser reports
    // "Unexpected end of JSON input" instead of anything useful.
    return serverErrorResponse(e, "login");
  }
};

export const POST = jsonRoute("auth-login", { POST: handler_POST });
