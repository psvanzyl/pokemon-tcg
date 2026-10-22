import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createUser, findUserByEmail, normalizeEmail } from "@/lib/accounts";
import {
  PASSWORD_MIN,
  authConfigured,
  clientIp,
  hashPassword,
  isValidEmail,
  isValidPassword,
  originAllowed,
  rateLimit,
  serverErrorResponse,
  withSessionCookie,
} from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

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
  const rl = rateLimit(`register:${ip}`, 8, 3600_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many sign-ups from this address — try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
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

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "That does not look like an email address." },
      { status: 400 },
    );
  }
  if (!isValidPassword(password)) {
    return NextResponse.json(
      {
        error: "invalid_password",
        message: `Use at least ${PASSWORD_MIN} characters.`,
        minLength: PASSWORD_MIN,
      },
      { status: 400 },
    );
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "email_taken", message: "That email already has an account — sign in instead." },
      { status: 409 },
    );
  }

  try {
    const user = await createUser({
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });

    const res = NextResponse.json({ ok: true, user: { email: user.email, name: user.name ?? null } });
    return withSessionCookie(res, req, user.id);
  } catch (e) {
    // createUser raises this when the address is taken (e.g. two concurrent sign-ups
    // for the same address) -- that is a conflict, not a server fault.
    if (e instanceof Error && e.message === "email_taken") {
      return NextResponse.json(
        { error: "email_taken", message: "That email already has an account - sign in instead." },
        { status: 409 },
      );
    }
    return serverErrorResponse(e, "register");
  }
};

export const POST = jsonRoute("auth-register", { POST: handler_POST });
