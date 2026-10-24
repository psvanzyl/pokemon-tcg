/**
 * Printed-name index for the whole catalogue.
 *
 * Two facts drive this file.
 *
 * 1. TCGplayer names cards in English only. A French, German, Spanish, Italian or
 *    Portuguese collector looks for "Caninos de Hisui", "Hisui-Fukano" or "Growlithe
 *    de Hisui" — and those names live in TCGdex, not in our catalogue.
 * 2. Only some of our products have a TCGdex identity (`card.t`). The rest — 4,997 of
 *    them, including every "Deck Exclusives" and "Prize Pack Series Cards" print of a
 *    Hisuian Pokémon — have no identity, so an index built from `content.json.gz`
 *    alone cannot find them.
 *
 * So the index is built from two sources:
 *
 *   - products that DO have an identity: their own printed names, straight from TCGdex;
 *   - products that do NOT: the printed names of the same species learned from a sibling
 *     print that does have an identity ("Hisuian Growlithe" -> "Caninos de Hisui").
 *
 * The result is one flat list of printed names, each pointing at the products that
 * carry it. Searching it answers "which card is this, in any of the six print
 * languages" for the whole catalogue — not just the part TCGdex happens to describe.
 *
 * The index is built once per process and then reused. It is read-only.
 */
import type { Card, CardContent, CardLanguage } from "./types";

/* ------------------------------------------------------------------ keys */

/** Accent- and punctuation-insensitive comparison key ("Dracaufeu" === "dracaufeu"). */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** The same, but keeps word boundaries: "Archéduc de Hisui" -> ["archeduc", "de", "hisui"]. */
export function wordsOf(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Strip the decorations TCGplayer puts on a card name so the species is recognisable:
 * "Hisuian Growlithe - 070/189 (Cosmos Holo)" -> "Hisuian Growlithe",
 * "Arcanine - 12/99 (Prerelease) [Staff]" -> "Arcanine".
 */
export function speciesOf(name: string): string {
  return name
    .replace(/\s+-\s+\d.*$/, "")
    .replace(/\s*(\([^)]*\)|\[[^\]]*\])+\s*$/, "")
    .trim();
}

/**
 * Do two English names describe the same thing?
 *
 * Equal, one is a prefix of the other ("Charizard" / "Charizard δ"), or they differ
 * only by a leading "Basic". This guards the alias table: a product whose identity
 * points at a different card ("Politoed" -> "Poliwrath") must not teach the alias
 * table the wrong printed name.
 */
export function sameSpecies(a: string, b: string): boolean {
  const x = fold(a);
  const y = fold(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (fold(a).replace(/^basic/, "") === fold(b).replace(/^basic/, "")) return true;
  const short = x.length <= y.length ? x : y;
  const long = x.length <= y.length ? y : x;
  return short.length >= 5 && long.startsWith(short);
}

/* --------------------------------------------------------------- the index */

export type NameEntry = {
  /** the name as it is printed */
  name: string;
  lang: CardLanguage;
  /** folded name, for fast comparison */
  key: string;
  /** folded words, for word-order and typo matching */
  words: string[];
  /** our product ids that carry this printed name */
  ids: number[];
};

export type NameIndex = {
  entries: NameEntry[];
  /** folded name -> entry indices */
  byKey: Map<string, number[]>;
  /** folded word -> entry indices */
  byWord: Map<string, number[]>;
};

/**
 * Learn each species' printed names from the products that have a TCGdex identity.
 *
 * A species can print under more than one name in one language ("Arcanin" and
 * "Arcanin Niv. 53", "Caninos" and "Caninos Niv. 26"), so every name gets a vote and
 * the most common one wins.
 */
export function buildAliasTable(
  cards: Card[],
  content: Record<string, CardContent>,
): Map<string, Partial<Record<CardLanguage, string>>> {
  const votes = new Map<string, Map<string, Map<string, number>>>();
  for (const c of cards) {
    if (!c.t) continue;
    const names = content[c.t]?.n;
    if (!names?.en) continue;
    const sp = speciesOf(c.n);
    if (!sameSpecies(sp, names.en)) continue;
    let byLang = votes.get(sp);
    if (!byLang) {
      byLang = new Map();
      votes.set(sp, byLang);
    }
    for (const [lang, name] of Object.entries(names)) {
      if (lang === "en" || !name) continue;
      let counter = byLang.get(lang);
      if (!counter) {
        counter = new Map();
        byLang.set(lang, counter);
      }
      counter.set(name, (counter.get(name) ?? 0) + 1);
    }
  }

  const alias = new Map<string, Partial<Record<CardLanguage, string>>>();
  for (const [sp, byLang] of votes) {
    const out: Partial<Record<CardLanguage, string>> = {};
    for (const [lang, counter] of byLang) {
      let best = "";
      let bestCount = 0;
      for (const [name, count] of counter) {
        // More votes wins; on a tie the shorter name wins ("Caninos" over "Caninos Niv. 26").
        if (count > bestCount || (count === bestCount && name.length < best.length)) {
          best = name;
          bestCount = count;
        }
      }
      if (best) out[lang as CardLanguage] = best;
    }
    alias.set(sp, out);
  }
  return alias;
}

/** Build the printed-name index for the whole catalogue. */
export function buildNameIndex(
  cards: Card[],
  content: Record<string, CardContent>,
): NameIndex {
  const alias = buildAliasTable(cards, content);

  // One entry per (language, printed name); each entry lists the products that carry it.
  const pending = new Map<string, { name: string; lang: CardLanguage; ids: number[] }>();

  const add = (lang: CardLanguage, name: string, id: number) => {
    if (!name) return;
    const key = `${lang}|${fold(name)}`;
    let e = pending.get(key);
    if (!e) {
      e = { name, lang, ids: [] };
      pending.set(key, e);
    }
    if (!e.ids.includes(id)) e.ids.push(id);
  };

  for (const c of cards) {
    const sp = speciesOf(c.n);
    const names = c.t ? content[c.t]?.n : undefined;

    // English: our own name, the bare species name, and TCGdex's English name.
    add("en", c.n, c.id);
    add("en", sp, c.id);
    if (names?.en) add("en", names.en, c.id);

    // The other five print languages: TCGdex's own name when we have an identity,
    // otherwise the name the species prints under in a sibling print.
    const al = alias.get(sp);
    for (const lang of ["fr", "de", "es", "it", "pt"] as CardLanguage[]) {
      const own = names?.[lang];
      if (own) {
        add(lang, own, c.id);
        continue;
      }
      const learned = al?.[lang];
      if (learned) add(lang, learned, c.id);
    }
  }

  const entries: NameEntry[] = [];
  const byKey = new Map<string, number[]>();
  const byWord = new Map<string, number[]>();
  for (const e of pending.values()) {
    const idx = entries.length;
    entries.push({
      name: e.name,
      lang: e.lang,
      key: fold(e.name),
      words: wordsOf(e.name),
      ids: e.ids,
    });
    const k = entries[idx].key;
    const kIdx = byKey.get(k);
    if (kIdx) kIdx.push(idx);
    else byKey.set(k, [idx]);
    for (const w of new Set(entries[idx].words)) {
      const wIdx = byWord.get(w);
      if (wIdx) wIdx.push(idx);
      else byWord.set(w, [idx]);
    }
  }
  return { entries, byKey, byWord };
}

/* --------------------------------------------------------------- searching */

export type PrintedHit = {
  /** our product id */
  id: number;
  /** TCGdex identity, when the product has one */
  tid: string | null;
  /** the print language the name belongs to */
  lang: CardLanguage;
  /** the printed name that matched */
  name: string;
  /** the English name of the card */
  en: string | null;
  /** the scan in that print language, when one exists */
  img: string | null;
  /** how good the match is; higher is better */
  score: number;
};

export type PrintedSearch = {
  query: string;
  hits: PrintedHit[];
  /** the language of the strongest hit */
  lang: CardLanguage | null;
  /** the printed name of the strongest hit */
  name: string | null;
  /** distinct products matched, before the limit */
  total: number;
  truncated: boolean;
};

/* Scores. The rule that matters: a printed name that explains the WHOLE query
   always outranks one that only covers a part of it. That is what puts
   "Caninos de Hisui" above plain "Caninos" for the query "Caninos de Husui".

   Tiers, best first:
     EXACT      the query IS the printed name
     SUPERSET   the printed name is the query plus words ("Caninos" -> "Caninos de Hisui")
     WORD_SET   the same words, another order ("Hisui Caninos")
     QUALIFIER  the query adds a trailing qualifier ("Caninos de Hisui V")
     TYPO       one word is one edit away ("Caninos de Husui")
     PARTIAL    the printed name is only part of the query ("Caninos" for "Caninos de Hisui")
 */
export const SCORE_EXACT = 60;
export const SCORE_SUPERSET = 50;
export const SCORE_WORD_SET = 45;
export const SCORE_QUALIFIER = 40;
export const SCORE_TYPO = 35;

/**
 * Search the printed-name index.
 *
 * Tiers, best first:
 *   - the query IS a printed name ("Caninos de Hisui")
 *   - the query starts a printed name ("Caninos")
 *   - a printed name starts the query ("Glurak" -> "Glurak VMAX")
 *   - every word of the query is in the name, in any order ("Hisui Caninos")
 *   - the query is the name plus a trailing qualifier ("Caninos de Hisui V")
 *   - the query is one typo away from the name ("Caninos de Husui")
 */
export function searchPrintedNames(
  index: NameIndex,
  cards: Card[],
  content: Record<string, CardContent>,
  query: string,
  limit = 120,
): PrintedSearch {
  const empty: PrintedSearch = {
    query,
    hits: [],
    lang: null,
    name: null,
    total: 0,
    truncated: false,
  };
  const q = fold(query);
  if (q.length < 3) return empty;

  const qw = wordsOf(query);
  const candidates = new Set<number>();

  // 1. exact names, and names the query starts with / that start the query
  const exactIdx = index.byKey.get(q);
  if (exactIdx) for (const i of exactIdx) candidates.add(i);
  for (const [key, idxs] of index.byKey) {
    if (key === q) continue;
    if (key.startsWith(q) || q.startsWith(key)) for (const i of idxs) candidates.add(i);
  }

  // 2. word sets: entries that hold every meaningful word of the query, in any order.
  //    Qualifier words ("V", "VMAX") and words that are one typo away are left out of
  //    the requirement — they are checked per entry in scoreEntry.
  const core = qw.filter((w) => !isQualifier(w));
  const postings = core
    .map((w) => index.byWord.get(w))
    .filter((x): x is number[] => !!x);
  if (postings.length === core.length && postings.length > 0) {
    // start from the rarest word, then keep only entries that hold the others too
    postings.sort((a, b) => a.length - b.length);
    const seed = postings[0];
    for (const i of seed) {
      const words = index.entries[i].words;
      if (core.every((w) => words.includes(w) || hasWordPrefix(words, w))) {
        candidates.add(i);
      }
    }
  }

  // 3. typos: one word of the query may be one edit away from a word of the name
  for (const w of qw) {
    for (const v of typoVariants(w)) {
      const idxs = index.byWord.get(v);
      if (!idxs) continue;
      for (const i of idxs) candidates.add(i);
    }
  }

  // Score every candidate entry, then keep the best hit per product.
  const cardById = new Map<number, Card>();
  for (const c of cards) cardById.set(c.id, c);

  const best = new Map<number, PrintedHit>();
  for (const i of candidates) {
    const entry = index.entries[i];
    const score = scoreEntry(q, qw, entry);
    if (!score) continue;
    for (const id of entry.ids) {
      const c = cardById.get(id);
      if (!c) continue;
      const prev = best.get(id);
      if (prev && prev.score >= score) continue;
      const rec = c.t ? content[c.t] : undefined;
      const scan = rec?.imgs?.[entry.lang];
      best.set(id, {
        id,
        tid: c.t ?? null,
        lang: entry.lang,
        name: entry.name,
        en: rec?.n?.en ?? c.n,
        img: scan ? `${scan}/low.webp` : null,
        score,
      });
    }
  }

  const hits = [...best.values()].sort(
    (a, b) => b.score - a.score || a.name.length - b.name.length || a.id - b.id,
  );
  const total = hits.length;
  const top = hits[0] ?? null;
  return {
    query,
    hits: hits.slice(0, limit),
    lang: top?.lang ?? null,
    name: top?.name ?? null,
    total,
    truncated: total > limit,
  };
}

/**
 * How well does one printed name answer the query? 0 means "no relation".
 *
 * The name must account for EVERY word of the query. Words the name holds are
 * "covered"; a trailing qualifier ("V", "VMAX") may be extra; one word may be a
 * typo. Anything else is a miss.
 */
function scoreEntry(q: string, qw: string[], entry: NameEntry): number {
  if (entry.key === q) return SCORE_EXACT;

  let typos = 0;
  let qualifiers = 0;
  let covered = 0;
  for (let i = 0; i < qw.length; i++) {
    const w = qw[i];
    if (entry.words.includes(w) || hasWordPrefix(entry.words, w)) {
      covered++;
      continue;
    }
    if (isTypoOfAny(w, entry.words)) {
      typos++;
      covered++;
      continue;
    }
    // A trailing qualifier ("Caninos de Hisui V") may be extra, but only at the end.
    if (i === qw.length - 1 && isQualifier(w)) {
      qualifiers++;
      continue;
    }
    return 0;
  }
  // Every word of the query must be accounted for: held by the name, a typo of it,
  // or a trailing qualifier. A name that only covers part of the query is not a hit.
  if (covered + qualifiers < qw.length) return 0;

  // The name holds every word of the query. Now: does it hold nothing more?
  const extra = entry.words.filter(
    (w) => !qw.includes(w) && !qw.some((q2) => q2.length >= 4 && w.startsWith(q2)),
  );
  const sameWords = extra.length === 0;

  if (typos > 0) return SCORE_TYPO;
  if (qualifiers > 0) return SCORE_QUALIFIER;
  if (sameWords) return SCORE_WORD_SET;
  // The printed name carries the query's words plus more ("Caninos" -> "Caninos de Hisui").
  return SCORE_SUPERSET;
}

/** "hisui" matches the name word "hisuian". */
function hasWordPrefix(words: string[], w: string): boolean {
  if (w.length < 4) return false;
  return words.some((x) => x.length >= 4 && x.startsWith(w));
}

/** Is the query word one edit away from one of the name's words? */
function isTypoOfAny(w: string, words: string[]): boolean {
  if (w.length < 4) return false;
  return words.some((x) => x.length >= 4 && editDistance(w, x) <= 1);
}

/**
 * Qualifier tokens: the suffixes a collector adds to a name ("Charizard V",
 * "Charizard VMAX", "Basic Fire Energy"). Only a trailing one is ignored.
 */
const QUALIFIER_RE =
  /^(v|vmax|vstar|lvx|ex|gx|sp|ace|prime|rx|delta|shiny|rainbow|gold|silver|sticker|holo|foil|reverse|normal|star|ultra|hyper|mega|primal|origin|illustration|illustrated|shadowless|first|edition|1st|art|fullart)$/;

export function isQualifier(w: string): boolean {
  // Single letters are energy types (F, W, G, R, P, M, Y, L, D, C, S) and the "V" suffix.
  if (w.length === 1) return true;
  return QUALIFIER_RE.test(w);
}

/**
 * Every word within one edit of `word`: one letter changed, added, dropped, or
 * swapped with its neighbour. This is how "Husui" finds "Hisui".
 */
export function typoVariants(word: string): string[] {
  if (word.length < 4) return [];
  const out = new Set<string>();
  const letters = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < word.length; i++) {
    out.add(word.slice(0, i) + word.slice(i + 1)); // dropped
    for (const ch of letters) {
      if (ch === word[i]) continue;
      out.add(word.slice(0, i) + ch + word.slice(i + 1)); // changed
    }
  }
  for (let i = 0; i <= word.length; i++) {
    for (const ch of letters) out.add(word.slice(0, i) + ch + word.slice(i)); // added
  }
  for (let i = 0; i + 1 < word.length; i++) {
    if (word[i] === word[i + 1]) continue;
    out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2)); // swapped
  }
  return [...out];
}

/**
 * Levenshtein distance with transpositions counted as one edit ("Hiusi" -> "Hisui").
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const n = a.length;
  const m = b.length;
  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: m + 1 }, (_, i) => i);
  for (let i = 1; i <= n; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prev2[j - 2] + 1);
      }
      cur[j] = best;
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
}
