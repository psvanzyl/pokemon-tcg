import { NextResponse } from "next/server";
import { searchLocalised } from "@/lib/data";

/**
 * Multilingual name lookup.
 *
 * The catalogue payload the browser holds carries English names only — keeping five more
 * languages in it would add megabytes to every visitor's first load for a search most of
 * them never make. So: English search stays instant and local, and the client asks *this*
 * route only when an English query found nothing. That is exactly the case where someone
 * types "Caninos de Hisui" or "Dracaufeu".
 */
export const revalidate = 3600;

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 64);
  const match = searchLocalised(q);
  return NextResponse.json(match, {
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
