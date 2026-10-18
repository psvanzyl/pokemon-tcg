import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Who am I — the header widget asks this on every page, so it must stay cheap (no collection read). */
export async function GET(req: Request) {
  const user = await currentUser(req);
  return NextResponse.json(
    {
      authenticated: Boolean(user),
      user: user
        ? { email: user.email, name: user.name ?? null, createdAt: user.createdAt }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
