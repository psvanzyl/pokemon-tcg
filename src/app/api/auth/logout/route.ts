import { NextResponse } from "next/server";
import { originAllowed, withClearedSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  return withClearedSessionCookie(NextResponse.json({ ok: true }));
}
