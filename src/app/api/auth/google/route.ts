import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createUser, findUserByEmail, normalizeEmail, updateUser } from "@/lib/accounts";
import { verifyGoogleIdToken } from "@/lib/google-oauth";
import {
  authConfigured,
  clientIp,
  originAllowed,
  rateLimit,
  serverErrorResponse,
  withSessionCookie,
} from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Google sign-in: the browser hands us a Google ID token, we verify it against Google's JWKS, then
 * find-or-create the account by verified email. An existing password account with the same verified
 * email gets the Google subject linked to it, so both routes reach the same collection.
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

  const rl = rateLimit(`google:${clientIp(req)}`, 30, 900_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts — try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: { credential?: unknown };
  try {
    body = (await req.json()) as { credential?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const credential = String(body.credential ?? "");
  if (!credential) {
    return NextResponse.json({ error: "missing_credential" }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(credential);
  } catch (e) {
    return NextResponse.json(
      {
        error: "google_verification_failed",
        message: `Google sign-in could not be verified (${e instanceof Error ? e.message : "unknown"}).`,
      },
      { status: 401 },
    );
  }

  try {
    const email = normalizeEmail(identity.email);
    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({
        id: randomUUID(),
        email,
        passwordHash: "google:oauth",
        name: identity.name,
        googleSub: identity.sub,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      user = (await updateUser(user.id, {
        googleSub: user.googleSub ?? identity.sub,
        name: user.name ?? identity.name,
        lastLoginAt: new Date().toISOString(),
      })) ?? user;
    }

    const res = NextResponse.json({ ok: true, user: { email: user.email, name: user.name ?? null } });
    return withSessionCookie(res, req, user.id);
  } catch (e) {
    // The account write can fail (e.g. the data volume is not writable). A 500 with an
    // empty body here showed up in the browser as "Unexpected end of JSON input".
    return serverErrorResponse(e, "google");
  }
};

export const POST = jsonRoute("auth-google", { POST: handler_POST });
