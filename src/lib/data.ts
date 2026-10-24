import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Card, CardContent, CardLanguage, SetInfo, Stats } from "./types";
import { LANGS } from "./types";
import { marketPrice } from "./format";
import {
  buildAliasTable,
  buildNameIndex,
  fold,
  searchPrintedNames,
  speciesOf,
  type NameIndex,
} from "./names";

/**
 * Data resolution order:
 *   1. POKEMON_DATA_DIR (explicit override)
 *   2. /app/data        (Coolify persistent volume — refreshed daily, no redeploy)
 *   3. public/data      (snapshot baked into the image, always present)
 */
const DIRS = [
  process.env.POKEMON_DATA_DIR,
  "/app/data",
  path.join(process.cwd(), "public", "data"),
].filter(Boolean) as string[];

export function resolveDataFile(file: string): string | null {
  for (const dir of DIRS) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readGzJson<T>(file: string): T | null {
  const p = resolveDataFile(file);
  if (!p) return null;
  try {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString("utf-8")) as T;
  } catch {
    return null;
  }
}

function readJson<T>(file: string): T | null {
  const p = resolveDataFile(file);
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

let cardsCache: Card[] | null = null;
let setsCache: SetInfo[] | null = null;
let statsCache: Stats | null = null;
let mapCache: Map<number, Card> | null = null;

export function getCards(): Card[] {
  if (!cardsCache) cardsCache = readGzJson<Card[]>("cards.json.gz") ?? [];
  return cardsCache;
}

export function getSets(): SetInfo[] {
  if (!setsCache) setsCache = readJson<SetInfo[]>("sets.json") ?? [];
  return setsCache;
}

export function getStats(): Stats | null {
  if (!statsCache) statsCache = readJson<Stats>("stats.json");
  return statsCache;
}

export function getCardMap(): Map<number, Card> {
  if (!mapCache) {
    mapCache = new Map();
    for (const c of getCards()) mapCache.set(c.id, c);
  }
  return mapCache;
}

export function getCard(id: number): Card | null {
  return getCardMap().get(id) ?? null;
}

export type History = { dates: string[]; series: Record<string, number[]> };

let historyCache: History | null = null;

export function getHistory(): History | null {
  if (!historyCache) historyCache = readGzJson<History>("history.json.gz");
  return historyCache;
}

/** Sum of the cheapest market price per card — used for set-level value. */
export function setValues(): Map<number, number> {
  const out = new Map<number, number>();
  for (const c of getCards()) {
    const px = marketPrice(c);
    if (px == null) continue;
    out.set(c.set, (out.get(c.set) ?? 0) + px);
  }
  return out;
}

/* ---------- multilingual content ----------
 * content.json.gz is keyed by the language-independent card id, so a card's printings in
 * six languages live in one record: names, attack names, effect text, flavour text,
 * per-language scans, plus the Cardmarket euro prices for that card.
 */

let contentCache: Record<string, CardContent> | null = null;

export function getContent(): Record<string, CardContent> {
  if (!contentCache) contentCache = readGzJson<Record<string, CardContent>>("content.json.gz") ?? {};
  return contentCache;
}

export function getCardContent(card: Card | null | undefined): CardContent | null {
  if (!card?.t) return null;
  return getContent()[card.t] ?? null;
}

/** Accent- and punctuation-insensitive comparison key ("Dracaufeu" === "dracaufeu"). */
export { fold } from "./names";

export type LocalisedHit = {
  /** TCGdex identity of the card, when the product has one. */
  tid: string | null;
  /** our product id (TCGplayer productId) */
  id: number;
  lang: CardLanguage;
  name: string;
  en: string | null;
  /** Low-res scan of the card *as printed in that language*, or null if TCGdex has none. */
  img: string | null;
};

export type LocalisedMatches = {
  query: string;
  matches: LocalisedHit[];
  lang: CardLanguage | null; // language of the strongest hit
  name: string | null; // that hit's printed name
  total: number; // distinct cards matching, before the limit
  truncated: boolean;
};

/**
 * The printed-name index for the whole catalogue, built once per process.
 *
 * It covers every product, not only the ones TCGdex describes: a product without a
 * TCGdex identity still gets the printed names of its species, learned from a sibling
 * print that has one. That is how "Caninos de Hisui" finds the "Deck Exclusives" and
 * "Prize Pack Series Cards" prints of Hisuian Growlithe.
 */
let nameIndexCache: NameIndex | null = null;

export function getNameIndex(): NameIndex {
  if (!nameIndexCache) nameIndexCache = buildNameIndex(getCards(), getContent());
  return nameIndexCache;
}

let aliasCache: Map<string, Partial<Record<CardLanguage, string>>> | null = null;

function getAliasTable(): Map<string, Partial<Record<CardLanguage, string>>> {
  if (!aliasCache) aliasCache = buildAliasTable(getCards(), getContent());
  return aliasCache;
}

/**
 * The names the species is printed under, for a product that has no TCGdex identity.
 *
 * A promo print that TCGdex does not describe has no content record of its own, but
 * its species still prints under a name in every language — "Hisuian Growlithe" is
 * "Caninos de Hisui" in French. These are the names of the SPECIES, not of this
 * particular print, so the page presents them as "also printed as".
 */
export function printedAliasNames(card: Card): { lang: CardLanguage; name: string }[] {
  if (card.t) return [];
  const alias = getAliasTable().get(speciesOf(card.n));
  if (!alias) return [];
  const out: { lang: CardLanguage; name: string }[] = [];
  for (const lang of LANGS) {
    if (lang === "en") continue;
    const name = alias[lang];
    if (name) out.push({ lang, name });
  }
  return out;
}

/**
 * Search the printed names in all six languages.
 *
 * The catalogue payload the browser holds carries English names only, so the browser
 * does the normal instant search locally and falls back to this when an English query
 * finds nothing — which is exactly when "Caninos de Hisui" happens.
 *
 * The match is word-based, not substring-based: "Hisui Caninos" finds "Caninos de
 * Hisui", "Caninos de Husui" finds it despite the typo, and "Caninos de Hisui V"
 * finds it despite the trailing qualifier.
 */
export function searchLocalised(query: string, limit = 120): LocalisedMatches {
  const found = searchPrintedNames(getNameIndex(), getCards(), getContent(), query, limit);
  const matches: LocalisedHit[] = found.hits.map((h) => ({
    tid: h.tid,
    id: h.id,
    lang: h.lang,
    name: h.name,
    en: h.en,
    img: h.img,
  }));
  return {
    query,
    matches,
    lang: found.lang,
    name: found.name,
    total: found.total,
    truncated: found.truncated,
  };
}

/**
 * Every printed name of every product, for the collection's add box.
 *
 * The add box is where a collector adds what they own in the box, so it must accept
 * the name the card was printed under — "Caninos de Hisui" as well as "Hisuian
 * Growlithe" — and it must accept a card number or a set name next to it.
 */
export function searchPrinted(query: string, limit = 25): LocalisedHit[] {
  return searchLocalised(query, limit).matches;
}

/** All localised names of a card, in a stable language order, English excluded. */
export function otherNames(content: CardContent | null): { lang: CardLanguage; name: string }[] {
  if (!content) return [];
  const out: { lang: CardLanguage; name: string }[] = [];
  for (const lang of LANGS) {
    if (lang === "en") continue;
    const name = content.n?.[lang];
    if (name && fold(name) !== fold(content.n?.en ?? "")) out.push({ lang, name });
  }
  return out;
}
