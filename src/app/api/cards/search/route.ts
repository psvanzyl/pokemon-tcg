import { NextResponse } from "next/server";
import { getCards, getSets, searchLocalised } from "@/lib/data";
import { normalizeText, primaryVariant } from "@/lib/collection";
import type { CardLanguage } from "@/lib/types";

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
 *
 * The card may also be named as it was PRINTED. A collector in France types "Caninos de Hisui",
 * a collector in Germany types "Hisui-Fukano" — and both must find the card, including the prints
 * that TCGdex does not describe (the "Deck Exclusives" and "Prize Pack Series Cards" Hisuian
 * promos). Those hits are matched on the printed name and ranked with the English ones, so the
 * strongest match of all comes first.
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

  // English search: every word must appear in the card's name, number, set name or set code.
  const englishIds = new Set<number>();
  for (const c of getCards()) {
    const name = normalizeText(c.n);
    const set = setMap.get(c.set);
    const hay = `${name} ${normalizeText(c.num)} ${normalizeText(set?.name ?? "")} ${normalizeText(set?.abbr ?? "")}`;
    if (!tokens.every((t) => hay.includes(t))) continue;
    englishIds.add(c.id);
    const rank = name === nq ? 0 : name.startsWith(nq) ? 1 : name.includes(nq) ? 2 : 3;
    let px = -1;
    for (const v of c.pv) if (v.mkt != null && v.mkt > px) px = v.mkt;
    scored.push({ c, rank, px });
  }

  // Printed-name search: the same card under the name it carries in another print language.
  // A printed hit is stronger than a loose English substring hit, so it takes rank 1.
  const printed = searchLocalised(q, limit * 2);
  const printedById = new Map<
    number,
    { name: string; lang: CardLanguage; img: string | null; tid: string | null }
  >();
  for (const hit of printed.matches) {
    if (!printedById.has(hit.id)) {
      printedById.set(hit.id, {
        name: hit.name,
        lang: hit.lang,
        img: hit.img,
        tid: hit.tid,
      });
    }
  }
  const cardById = new Map(getCards().map((c) => [c.id, c]));
  for (const [id] of printedById) {
    const c = cardById.get(id);
    if (!c) continue;
    let px = -1;
    for (const v of c.pv) if (v.mkt != null && v.mkt > px) px = v.mkt;
    scored.push({ c, rank: 1, px });
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.px - a.px ||
      a.c.n.localeCompare(b.c.n) ||
      a.c.num.localeCompare(b.c.num),
  );

  // One product once, even when it matched both ways.
  const seen = new Set<number>();
  const results = scored
    .filter(({ c }) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .slice(0, limit)
    .map(({ c }) => {
      const set = setMap.get(c.set);
      // The printed name is only worth showing when it is what the visitor typed: if the
      // English search already found this card, the printed name adds nothing.
      const printedHit = printedById.get(c.id);
      const printedOnly = printedHit && !englishIds.has(c.id) ? printedHit : null;
      return {
        id: c.id,
        name: c.n,
        num: c.num,
        setName: set?.name ?? `Set ${c.set}`,
        abbr: set?.abbr ?? "",
        img: printedOnly?.img ?? c.img,
        primary: primaryVariant(c),
        variants: c.pv.map((v) => ({ v: v.v, mkt: v.mkt ?? null })),
        printed: printedOnly,
      };
    });

  return NextResponse.json({ results }, noStore);
}
