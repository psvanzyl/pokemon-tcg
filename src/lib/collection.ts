/**
 * Collection model + valuation + the bulk-import matcher. Server-only: it reads the catalogue
 * through @/lib/data (fs) so it must never be imported by a client component.
 *
 * Ownership is per (card, print variant) — a Holofoil Charizard and a Normal one are different
 * holdings and TCGplayer prices them separately (card.pv). The headline price on the site is the
 * cheapest variant, so a collection valued off that number alone would be wrong.
 *
 * Valuation is MARKET PRICE ONLY (boss decision, 2026-10-18): a variant with no TCGplayer market
 * price counts as UNPRICED and is left out of the total, never silently valued off `mid` or `low`.
 * (The catalogue has a card whose only reported price is a bogus mid of $100,000 — market-only
 * keeps that out of the headline number.)
 */
import { getCardContent, getCardMap, getCards, getSets, searchLocalised } from "@/lib/data";
import { mutateCollection, readCollection, type CollectionDoc } from "@/lib/accounts";
import type { Card, CardLanguage } from "@/lib/types";

export interface CollectionLine {
  cardId: number;
  name: string;
  set: number;
  setName: string;
  abbr: string;
  num: string;
  variant: string;
  qty: number;
  unit: number | null;
  value: number | null;
  img: string;
}

export interface SetRollup {
  set: number;
  name: string;
  abbr: string;
  cards: number;
  value: number;
}

export interface CollectionTotals {
  /** sum of qty x market price over every PRICED item */
  value: number;
  /** total cards owned (sum of quantities) */
  cards: number;
  /** distinct (card, variant) rows */
  distinct: number;
  /** rows with a market price */
  priced: number;
  /** rows with no market price — listed separately, excluded from `value` */
  unpriced: number;
  /** rows whose card id is no longer in the catalogue */
  missing: number;
  bySet: SetRollup[];
  top: CollectionLine[];
  snapshot: string | null;
  updatedAt: string | null;
}

export interface CollectionView {
  totals: CollectionTotals;
  lines: CollectionLine[];
  matchedCount: number;
}

export type SortKey = "value" | "value-asc" | "name" | "set" | "recent";

export function itemKey(cardId: number, variant: string): string {
  return `${cardId}|${variant}`;
}

export function parseItemKey(key: string): { cardId: number; variant: string } {
  const i = key.indexOf("|");
  if (i < 0) return { cardId: Number(key), variant: "" };
  return { cardId: Number(key.slice(0, i)), variant: key.slice(i + 1) };
}

/** The variant the site headlines: TCGplayer's primary print (`px` is pv[0].mkt in the data). */
export function primaryVariant(card: Card): string {
  return card.pv[0]?.v ?? "";
}

export function variantNames(card: Card): string[] {
  return card.pv.map((v) => v.v);
}

/**
 * Guard for direct writes (the card page and the collection page): the card has to exist and the
 * print has to be one it actually carries. Without this a typo — or a stale tab — stores a row that
 * can never be priced and only ever shows up as "missing" in the totals.
 */
export function checkItem(
  cardId: number,
  variant: string,
): { ok: true } | { ok: false; error: string; variants?: string[] } {
  const card = getCardMap().get(cardId);
  if (!card) return { ok: false, error: "unknown_card" };
  const names = variantNames(card);
  if (names.length > 0 && variant && !names.includes(variant)) {
    return { ok: false, error: "unknown_variant", variants: names };
  }
  return { ok: true };
}

/** Market price for one owned copy, or null when TCGplayer reports none for that variant. */
export function unitPrice(card: Card, variant: string): number | null {
  if (!variant) return card.px ?? null;
  const hit = card.pv.find((v) => v.v === variant);
  if (hit) return hit.mkt ?? null;
  return null;
}

/* ------------------------------------------------------------------ valuation */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['\u2019`]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same normalisation the importer uses — also exported for the catalogue search endpoint. */
export const normalizeText = normalize;

export async function buildCollection(
  userId: string,
  opts: { q?: string; sort?: SortKey; offset?: number; limit?: number } = {},
): Promise<CollectionView> {
  const doc = await readCollection(userId);
  const cardMap = getCardMap();
  const setMap = new Map(getSets().map((s) => [s.id, s]));

  const lines: CollectionLine[] = [];
  let missing = 0;

  for (const [key, item] of Object.entries(doc.items)) {
    const { cardId, variant } = parseItemKey(key);
    if (!Number.isFinite(cardId)) continue;
    const card = cardMap.get(cardId);
    if (!card) {
      missing += 1;
      continue;
    }
    const set = setMap.get(card.set);
    const unit = unitPrice(card, variant);
    lines.push({
      cardId,
      name: card.n,
      set: card.set,
      setName: set?.name ?? `Set ${card.set}`,
      abbr: set?.abbr ?? "",
      num: card.num,
      variant,
      qty: item.q,
      unit,
      value: unit == null ? null : Math.round(unit * item.q * 100) / 100,
      img: card.img,
    });
  }

  let value = 0;
  let cards = 0;
  let priced = 0;
  let unpriced = 0;
  const setRoll = new Map<number, SetRollup>();

  for (const l of lines) {
    cards += l.qty;
    if (l.value == null) {
      unpriced += 1;
    } else {
      priced += 1;
      value += l.value;
      const r = setRoll.get(l.set) ?? { set: l.set, name: l.setName, abbr: l.abbr, cards: 0, value: 0 };
      r.cards += l.qty;
      r.value += l.value;
      setRoll.set(l.set, r);
    }
  }

  const bySet = [...setRoll.values()]
    .map((r) => ({ ...r, value: Math.round(r.value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
  const top = lines
    .filter((l): l is CollectionLine & { value: number } => l.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const totals: CollectionTotals = {
    value: Math.round(value * 100) / 100,
    cards,
    distinct: lines.length,
    priced,
    unpriced,
    missing,
    bySet,
    top,
    snapshot: null,
    updatedAt: doc.updatedAt ?? null,
  };

  // filter + sort + page for the list itself (totals above always describe the whole collection)
  let view = lines;
  const q = (opts.q ?? "").trim();
  if (q) {
    const nq = normalize(q);
    view = view.filter(
      (l) =>
        normalize(l.name).includes(nq) ||
        normalize(l.num).includes(nq) ||
        normalize(l.abbr).includes(nq) ||
        normalize(l.setName).includes(nq) ||
        normalize(l.variant).includes(nq),
    );
  }
  const sort = opts.sort ?? "value";
  const numKey = (num: string) => {
    const m = num.match(/\d+/);
    return m ? parseInt(m[0], 10) : 99999;
  };
  view = [...view].sort((a, b) => {
    switch (sort) {
      case "value-asc":
        return (a.value ?? -1) - (b.value ?? -1);
      case "name":
        return a.name.localeCompare(b.name) || numKey(a.num) - numKey(b.num);
      case "set":
        return a.setName.localeCompare(b.setName) || numKey(a.num) - numKey(b.num);
      case "recent":
        return b.cardId - a.cardId;
      case "value":
      default:
        return (b.value ?? -1) - (a.value ?? -1);
    }
  });

  const matchedCount = view.length;
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  return { totals, lines: view.slice(offset, offset + limit), matchedCount };
}

/* --------------------------------------------------------------- write helpers */

export async function addToCollection(
  userId: string,
  cardId: number,
  variant: string,
  qty: number,
): Promise<CollectionDoc> {
  const delta = Math.max(1, Math.min(999, Math.floor(qty)));
  return mutateCollection(userId, (doc) => {
    const key = itemKey(cardId, variant);
    const prev = doc.items[key];
    doc.items[key] = {
      q: Math.min(9999, (prev?.q ?? 0) + delta),
      at: prev?.at ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return doc;
  });
}

export async function setCollectionQty(
  userId: string,
  cardId: number,
  variant: string,
  qty: number,
): Promise<CollectionDoc> {
  const q = Math.max(0, Math.min(9999, Math.floor(qty)));
  return mutateCollection(userId, (doc) => {
    const key = itemKey(cardId, variant);
    if (q === 0) {
      delete doc.items[key];
    } else {
      const prev = doc.items[key];
      doc.items[key] = { q, at: prev?.at ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
    return doc;
  });
}

export async function removeFromCollection(
  userId: string,
  cardId: number,
  variant: string,
): Promise<CollectionDoc> {
  return mutateCollection(userId, (doc) => {
    delete doc.items[itemKey(cardId, variant)];
    return doc;
  });
}

/* ------------------------------------------------------------- bulk import */

export interface ImportRow {
  line: string;
  qty: number;
  name: string;
  num: string | null;
  numOnly: number | null;
  variantHint: string | null;
  setHint: number | null;
}

export interface ImportMatched {
  line: string;
  qty: number;
  cardId: number;
  name: string;
  setName: string;
  abbr: string;
  num: string;
  variant: string;
  unit: number | null;
  /** Set when the line was recognised by a non-English printed name rather than the English one. */
  printedAs?: string;
  lang?: CardLanguage;
}

export interface ImportOption {
  cardId: number;
  name: string;
  setName: string;
  num: string;
}

export interface ImportAmbiguous {
  line: string;
  reason: string;
  options: ImportOption[];
}

export interface ImportReport {
  rows: number;
  matched: ImportMatched[];
  ambiguous: ImportAmbiguous[];
  unmatched: { line: string; reason: string }[];
  combined: number;
}

/** "043/102" -> "43/102", "SWSH039" -> "SWSH39" — the same normalisation for data and input. */
export function normNum(num: string): string {
  const s = (num || "").trim().toUpperCase();
  if (s.includes("/")) {
    return s
      .split("/")
      .map((p) => String(parseInt(p.replace(/\D+/g, ""), 10) || 0))
      .join("/");
  }
  return s.replace(/(\d+)/g, (d) => String(parseInt(d, 10)));
}

const VARIANT_HINTS: { re: RegExp; label: string }[] = [
  { re: /\breverse\s*holo(?:foil)?\b|\brev\s*holo\b/, label: "Reverse Holofoil" },
  { re: /\b1st\s*edition\b|\bfirst\s*edition\b|\b1st\s*ed\b/, label: "1st Edition" },
  { re: /\bshadowless\b/, label: "Shadowless" },
  { re: /\bunlimited\b/, label: "Unlimited" },
  { re: /\bnon[-\s]?holo(?:foil)?\b/, label: "Normal" },
  { re: /\bholo(?:foil)?\b/, label: "Holofoil" },
  { re: /\bnormal\b/, label: "Normal" },
];

let numIndex: Map<string, Card[]> | null = null;
let leftNumIndex: Map<string, Card[]> | null = null;
let nameIndex: Map<string, Card[]> | null = null;
let setNames: { id: number; norm: string; kind: "name" | "abbr" }[] | null = null;

function buildIndexes() {
  if (numIndex) return;
  numIndex = new Map();
  leftNumIndex = new Map();
  nameIndex = new Map();
  for (const c of getCards()) {
    const nn = normNum(c.num);
    (numIndex.get(nn) ?? numIndex.set(nn, []).get(nn)!).push(c);
    const left = nn.split("/")[0];
    (leftNumIndex.get(left) ?? leftNumIndex.set(left, []).get(left)!).push(c);
    const n = normalize(c.n);
    (nameIndex.get(n) ?? nameIndex.set(n, []).get(n)!).push(c);
  }
  setNames = getSets()
    .flatMap((s) => {
      const rows = [
        { id: s.id, norm: normalize(s.name), kind: "name" as const },
        { id: s.id, norm: normalize(s.abbr), kind: "abbr" as const },
      ];
      // "SWSH10: Astral Radiance" is also just "Astral Radiance" on a decklist.
      const tail = s.name.split(":").slice(1).join(":").trim();
      if (tail) {
        const n = normalize(tail);
        if (n.length >= 3 && n !== normalize(s.name)) rows.push({ id: s.id, norm: n, kind: "name" as const });
      }
      return rows;
    })
    .filter((s) => s.norm.length >= 3)
    .sort((a, b) => b.norm.length - a.norm.length);
}

export function parseImportText(text: string): ImportRow[] {
  buildIndexes();
  const out: ImportRow[] = [];
  const rawLines = text.split(/\r?\n/).slice(0, 5000);
  for (const raw of rawLines) {
    let line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;

    let qty = 1;
    const qm = line.match(/^(\d{1,4})\s*(?:x|\*)?\s+(.+)$/i);
    if (qm) {
      qty = Math.max(1, Math.min(999, parseInt(qm[1], 10)));
      line = qm[2].trim();
    }

    let variantHint: string | null = null;
    for (const h of VARIANT_HINTS) {
      if (h.re.test(line)) {
        variantHint = h.label;
        line = line.replace(h.re, " ");
        break;
      }
    }

    let num: string | null = null;
    let numOnly: number | null = null;
    let presetHint: number | null = null;
    const slash = line.match(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/);
    if (slash) {
      num = normNum(`${slash[1]}/${slash[2]}`);
      line = line.replace(slash[0], " ");
    } else {
      const promo = line.match(/\b([A-Za-z]{2,6})(\d{1,3})\b/) || line.match(/\b(SWSH|SM|XY|BW|DP|HGSS|PR|SV|ME|NXD|PL|RC)\s*-?\s*(\d{1,3})\b/);
      const hash = line.match(/#\s*(\d{1,4})\b/);
      if (hash) {
        numOnly = parseInt(hash[1], 10);
        line = line.replace(hash[0], " ");
      } else if (promo) {
        // "SWSH10" / "SV6" are set codes: a card number is never letters followed by digits.
        const asSet = setNames?.find((s) => s.kind === "abbr" && s.norm === normalize(`${promo[1]}${promo[2]}`));
        if (asSet) presetHint = asSet.id;
        else num = normNum(`${promo[1]}${promo[2]}`);
        line = line.replace(promo[0], " ");
      }
    }

    // a set name inside the line ("Charizard Base Set 4/102") is a disambiguator, not part of the name
    let setHint: number | null = presetHint;
    let probe = ` ${normalize(line)} `;
    for (const s of setHint == null ? setNames ?? [] : []) {
      // A set CODE that is also a card name must not swallow the name: the 151 set's abbr is MEW and
      // "Mew" is a card, so "1 Mew #9" is a Mew card numbered 9 — not 009/165 of set MEW.
      if (s.kind === "abbr" && nameIndex?.has(s.norm)) continue;
      if (probe.includes(` ${s.norm} `)) {
        setHint = s.id;
        probe = probe.replace(` ${s.norm} `, " ");
        break;
      }
    }
    const name = probe.trim().replace(/\s+/g, " ");
    if (!name && num == null && numOnly == null) continue;

    out.push({ line: raw.trim(), qty, name, num, numOnly, variantHint, setHint });
  }
  return out;
}

function pickVariant(card: Card, hint: string | null): string {
  if (!hint) return primaryVariant(card);
  const h = normalize(hint);
  const exact = card.pv.find((v) => normalize(v.v) === h);
  if (exact) return exact.v;
  const loose = card.pv.find((v) => normalize(v.v).includes(h) || h.includes(normalize(v.v)));
  if (loose) return loose.v;
  return primaryVariant(card);
}

function option(c: Card, setMap: Map<number, { name: string }>): ImportOption {
  return { cardId: c.id, name: c.n, setName: setMap.get(c.set)?.name ?? `Set ${c.set}`, num: c.num };
}

/**
 * Match one candidate card against a name probe — its English name or any printed name it
 * carries. Only ever called on a small pool (the cards sharing a number / in a hinted set),
 * because it walks the card's whole name record.
 *   2 = exact, 1 = loose, 0 = no match
 */
function printedMatch(c: Card, probe: string): 0 | 1 | 2 {
  const names = [normalize(c.n)];
  const rec = getCardContent(c);
  if (rec?.n) {
    for (const [lang, nm] of Object.entries(rec.n)) {
      if (lang === "en" || !nm) continue;
      names.push(normalize(nm));
    }
  }
  let loose: 0 | 1 = 0;
  for (const n of names) {
    if (!n) continue;
    if (n === probe) return 2;
    if (n.includes(probe) || probe.includes(n)) loose = 1;
  }
  return loose;
}

let idIndex: Map<number, Card> | null = null;

/**
 * The importer is English-first because the catalogue is — but the whole point of the identity
 * layer is that "Hisuian Growlithe", "Caninos de Hisui" and "Hisui-Fukano" name the same card, so
 * a collection list written in French must import as happily as one written in English. When no
 * English name matches, ask the printed-name index (the same one /api/lookup serves) before
 * giving up.
 *
 * The index covers every product, not only the ones TCGdex describes, so a French list can also
 * name the promo prints that have no identity at all.
 */
function localisedMatch(
  name: string,
  setHint: number | null = null,
): { cards: Card[]; lang: CardLanguage; printed: string } | null {
  if (!idIndex) {
    idIndex = new Map();
    for (const c of getCards()) idIndex.set(c.id, c);
  }
  const best = searchLocalised(name, 12);
  const top = best.matches[0];
  if (!top) return null;
  const cards: Card[] = [];
  const seenIds = new Set<number>();
  for (const hit of best.matches) {
    const c = idIndex.get(hit.id);
    if (!c || seenIds.has(c.id)) continue;
    seenIds.add(c.id);
    cards.push(c);
  }
  const scoped = setHint == null ? cards : cards.filter((c) => c.set === setHint);
  const use = scoped.length ? scoped : cards;
  return use.length ? { cards: use, lang: top.lang, printed: top.name } : null;
}

export function matchImportText(text: string): ImportReport {
  buildIndexes();
  const setMap = new Map(getSets().map((s) => [s.id, s]));
  const rows = parseImportText(text);
  const matched: ImportMatched[] = [];
  const ambiguous: ImportAmbiguous[] = [];
  const unmatched: { line: string; reason: string }[] = [];
  const seen = new Map<string, ImportMatched>();
  let combined = 0;

  for (const row of rows) {
    let candidates: Card[] | null = null;
    if (row.num) candidates = numIndex?.get(row.num) ?? [];
    else if (row.numOnly != null) candidates = leftNumIndex?.get(String(row.numOnly)) ?? [];

    let chosen: Card | null = null;
    let printedAs: string | undefined;
    let matchedLang: CardLanguage | undefined;

    if (candidates) {
      const scoped = row.setHint ? candidates.filter((c) => c.set === row.setHint) : candidates;
      const pool = scoped.length ? scoped : candidates;
      if (row.name) {
        const exact = pool.filter((c) => printedMatch(c, row.name) === 2);
        if (exact.length === 1) chosen = exact[0];
        else if (exact.length > 1) {
          ambiguous.push({
            line: row.line,
            reason: `${exact.length} cards share that name in this set — add a print variant or the card number`,
            options: exact.slice(0, 5).map((c) => option(c, setMap)),
          });
          continue;
        } else {
          const contains = pool.filter((c) => printedMatch(c, row.name) >= 1);
          if (contains.length === 1) chosen = contains[0];
          else {
            ambiguous.push({
              line: row.line,
              reason:
                contains.length === 0
                  ? `no card at ${row.num ?? row.numOnly} matches the name "${row.name}"`
                  : `${contains.length} candidates for "${row.name}"`,
              options: (contains.length ? contains : pool).slice(0, 5).map((c) => option(c, setMap)),
            });
            continue;
          }
        }
      } else if (pool.length === 1) {
        chosen = pool[0];
      } else {
        ambiguous.push({
          line: row.line,
          reason: `${pool.length} cards carry the number ${row.num ?? row.numOnly} — add the card name`,
          options: pool.slice(0, 5).map((c) => option(c, setMap)),
        });
        continue;
      }
    } else if (row.name) {
      const byName = nameIndex?.get(row.name) ?? [];
      if (byName.length === 1) chosen = byName[0];
      else if (byName.length > 1) {
        ambiguous.push({
          line: row.line,
          reason: `${byName.length} cards are named "${row.name}" — add the set or the card number`,
          options: byName.slice(0, 5).map((c) => option(c, setMap)),
        });
        continue;
      } else {
        const scan = getCards().filter((c) => normalize(c.n).includes(row.name));
        if (scan.length === 1) chosen = scan[0];
        else if (scan.length > 1) {
          ambiguous.push({
            line: row.line,
            reason: `${scan.length} cards match "${row.name}"`,
            options: scan.slice(0, 5).map((c) => option(c, setMap)),
          });
          continue;
        }
      }
    }

    if (!chosen && row.name) {
      const local = localisedMatch(row.name, row.setHint);
      if (local && local.cards.length === 1) {
        chosen = local.cards[0];
        printedAs = local.printed;
        matchedLang = local.lang;
      } else if (local) {
        ambiguous.push({
          line: row.line,
          reason: `${local.cards.length} cards match the printed name "${row.name}" — add the set or the card number`,
          options: local.cards.slice(0, 5).map((c) => option(c, setMap)),
        });
        continue;
      }
    }

    if (!chosen) {
      unmatched.push({ line: row.line, reason: row.name ? `no card named "${row.name}"` : "no card identified" });
      continue;
    }

    const variant = pickVariant(chosen, row.variantHint);
    const key = itemKey(chosen.id, variant);
    const existing = seen.get(key);
    if (existing) {
      existing.qty = Math.min(999, existing.qty + row.qty);
      combined += 1;
      continue;
    }
    const entry: ImportMatched = {
      line: row.line,
      qty: row.qty,
      cardId: chosen.id,
      name: chosen.n,
      setName: setMap.get(chosen.set)?.name ?? `Set ${chosen.set}`,
      abbr: setMap.get(chosen.set)?.abbr ?? "",
      num: chosen.num,
      variant,
      unit: unitPrice(chosen, variant),
    };
    if (printedAs && matchedLang) {
      entry.printedAs = printedAs;
      entry.lang = matchedLang;
    }
    seen.set(key, entry);
    matched.push(entry);
  }

  return { rows: rows.length, matched, ambiguous, unmatched, combined };
}

/** Apply matched rows (the client sends back what it previewed, re-validated server-side). */
export async function applyImport(
  userId: string,
  rows: { cardId: number; variant: string; qty: number }[],
): Promise<{ applied: number; skipped: number }> {
  const cardMap = getCardMap();
  let applied = 0;
  let skipped = 0;
  const clean: { cardId: number; variant: string; qty: number }[] = [];
  for (const r of rows.slice(0, 5000)) {
    const card = cardMap.get(Number(r.cardId));
    if (!card) {
      skipped += 1;
      continue;
    }
    const variant =
      r.variant && variantNames(card).includes(r.variant) ? r.variant : primaryVariant(card);
    const qty = Math.max(1, Math.min(999, Math.floor(Number(r.qty) || 1)));
    clean.push({ cardId: card.id, variant, qty });
    applied += 1;
  }
  await mutateCollection(userId, (doc) => {
    for (const r of clean) {
      const key = itemKey(r.cardId, r.variant);
      const prev = doc.items[key];
      doc.items[key] = {
        q: Math.min(9999, (prev?.q ?? 0) + r.qty),
        at: prev?.at ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return doc;
  });
  return { applied, skipped };
}
