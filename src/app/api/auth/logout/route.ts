import { NextResponse } from "next/server";
import { originAllowed, withClearedSessionCookie } from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

const handler_POST = async (req: Request) => {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  return withClearedSessionCookie(NextResponse.json({ ok: true }));
};

export const POST = jsonRoute("auth-logout", { POST: handler_POST });
