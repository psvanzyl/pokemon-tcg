import { NextResponse } from "next/server";
import { getCards, getSets } from "@/lib/data";
import { normalizeText, primaryVariant } from "@/lib/collection";

export const dynamic = "force-dynamic";

type Card = ReturnType<typeof getCards>[number];

/**
 * GET /api/cards/search?q=charizard&limit=25
 * Lightweight catalogue search for the collection's add box — the full /api/cards payload is 1.4 MB
 * compressed, which is the right thing for browsing the whole catalogue and the wrong thing for
 * "add this one card to my collection".
 *
 * Every word has to appear somewhere in the card's name, number, set name or set code, so
 * "charizard base set" and "charizard 4/102" both land. Results are then ranked: exact name, then
 * name prefix, then name substring, then the rest by price.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 25) || 25));
  const noStore = { headers: { "Cache-Control": "no-store" } };
  if (q.length < 2) return NextResponse.json({ results: [] }, noStore);

  const nq = normalizeText(q);
  const tokens = nq.split(/\s+/).filter(Boolean);
  const setMap = new Map(getSets().map((s) => [s.id, s]));
  const scored: { c: Card; rank: number; px: number }[] = [];

  for (const c of getCards()) {
    const name = normalizeText(c.n);
    const set = setMap.get(c.set);
    const hay = `${name} ${normalizeText(c.num)} ${normalizeText(set?.name ?? "")} ${normalizeText(set?.abbr ?? "")}`;
    if (!tokens.every((t) => hay.includes(t))) continue;
    const rank = name === nq ? 0 : name.startsWith(nq) ? 1 : name.includes(nq) ? 2 : 3;
    let px = -1;
    for (const v of c.pv) if (v.mkt != null && v.mkt > px) px = v.mkt;
    scored.push({ c, rank, px });
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.px - a.px ||
      a.c.n.localeCompare(b.c.n) ||
      a.c.num.localeCompare(b.c.num),
  );

  const results = scored.slice(0, limit).map(({ c }) => {
    const set = setMap.get(c.set);
    return {
      id: c.id,
      name: c.n,
      num: c.num,
      setName: set?.name ?? `Set ${c.set}`,
      abbr: set?.abbr ?? "",
      img: c.img,
      primary: primaryVariant(c),
      variants: c.pv.map((v) => ({ v: v.v, mkt: v.mkt ?? null })),
    };
  });

  return NextResponse.json({ results }, noStore);
}
