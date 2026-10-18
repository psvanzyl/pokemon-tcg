import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Card, CardContent, CardLanguage, SetInfo, Stats } from "./types";
import { LANGS } from "./types";
import { marketPrice } from "./format";

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
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

type LangRow = { key: string; tid: string; lang: CardLanguage; name: string };

let langIndexCache: LangRow[] | null = null;

/** Every non-English name in the dataset, folded once, for the /api/lookup route. */
function langIndex(): LangRow[] {
  if (langIndexCache) return langIndexCache;
  const rows: LangRow[] = [];
  for (const [tid, rec] of Object.entries(getContent())) {
    for (const [lang, name] of Object.entries(rec.n ?? {})) {
      if (lang === "en" || !name) continue;
      const key = fold(name);
      if (key.length > 1) rows.push({ key, tid, lang: lang as CardLanguage, name });
    }
  }
  langIndexCache = rows;
  return rows;
}

export type LocalisedHit = {
  tid: string;
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
 * Search the other five print languages. The catalogue payload only carries English names,
 * so the browser does the normal instant search locally and falls back to this when an
 * English query finds nothing — which is exactly when "Caninos de Hisui" happens.
 * Exact matches rank above prefix matches, above substrings, and shorter names rank above
 * longer ones inside each tier ("Glurak" beats "Glurak VMAX" for the query "glurak").
 */
export function searchLocalised(query: string, limit = 120): LocalisedMatches {
  const q = fold(query);
  if (q.length < 3)
    return { query, matches: [], lang: null, name: null, total: 0, truncated: false };
  const exact: LangRow[] = [];
  const prefix: LangRow[] = [];
  const partial: LangRow[] = [];
  for (const row of langIndex()) {
    if (row.key === q) exact.push(row);
    else if (row.key.startsWith(q)) prefix.push(row);
    else if (row.key.includes(q)) partial.push(row);
  }
  for (const bucket of [exact, prefix, partial]) {
    bucket.sort((a, b) => a.key.length - b.key.length);
  }
  const ranked = [...exact, ...prefix, ...partial];
  const allTids = new Set(ranked.map((r) => r.tid));
  const content = getContent();
  const matches: LocalisedHit[] = [];
  for (const row of ranked) {
    if (matches.some((m) => m.tid === row.tid)) continue;
    const rec = content[row.tid];
    const base = rec?.imgs?.[row.lang];
    matches.push({
      tid: row.tid,
      lang: row.lang,
      name: row.name,
      en: rec?.n?.en ?? null,
      img: base ? `${base}/low.webp` : null,
    });
    if (matches.length >= limit) break;
  }
  const best = ranked[0];
  return {
    query,
    matches,
    lang: best?.lang ?? null,
    name: best?.name ?? null,
    total: allTids.size,
    truncated: matches.length < allTids.size,
  };
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
