import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Who am I — the header widget asks this on every page, so it must stay cheap (no collection read). */
const handler_GET = async (req: Request) => {
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
};

export const GET = jsonRoute("auth-me", { GET: handler_GET });
