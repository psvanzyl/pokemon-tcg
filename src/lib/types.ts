export type PriceVariant = {
  v: string; // print variant: Normal, Holofoil, Reverse Holofoil, 1st Edition...
  low: number | null;
  mid: number | null;
  high: number | null;
  mkt: number | null; // TCGplayer market price (USD)
};

export type Card = {
  id: number; // TCGplayer productId
  n: string; // card name
  set: number; // groupId
  num: string; // card number, e.g. 043/102
  rar: string | null;
  typ: string | null;
  hp: string | null;
  stg: string | null;
  img: string;
  url: string;
  px: number | null; // cheapest market price across variants (USD)
  pv: PriceVariant[];
  t?: string; // language-independent card id (TCGdex), set when an identity was resolved
};

/* ---------- multilingual layer ----------
 * One card has one identity ("t") and up to six printings worth of content. Everything
 * below is keyed by that identity, in data/content.json.gz, not by product id.
 */

export type CardLanguage = "en" | "fr" | "de" | "es" | "it" | "pt";

export const LANGS: CardLanguage[] = ["en", "fr", "de", "es", "it", "pt"];

export const LANG_LABEL: Record<CardLanguage, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
};

export const LANG_SHORT: Record<CardLanguage, string> = {
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT",
};

/** A field that exists per printing language. */
export type Localised<T = string> = Partial<Record<CardLanguage, T>>;

export type Attack = {
  n: Localised;
  e?: Localised; // effect text
  c?: string[]; // energy cost, as printed
  d?: number | string; // damage
};

export type Ability = { n?: Localised; e?: Localised };

export type EurFigures = {
  avg?: number | null;
  low?: number | null;
  trend?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
};

/**
 * Cardmarket's price guide for one product, flat by family. The free daily download
 * carries two families for Pokémon singles in practice: "standard" (non-holo) and "holo".
 * The figures are product-level — identical for every print language — which is why the
 * UI states that plainly instead of implying a per-language split.
 */
export type EurPrices = Partial<Record<string, EurFigures>>;

export const EUR_FAMILY_LABEL: Record<string, string> = {
  standard: "Non-holo (standard)",
  holo: "Holo",
  "reverse-holo": "Reverse holo",
  "1st-edition": "1st edition",
};

/** Render order for the euro table: cheapest-to-make family first, then foil. */
export const EUR_FAMILY_ORDER = ["standard", "holo", "reverse-holo", "1st-edition"];

export type CardContent = {
  n: Localised; // names, per printing language
  a?: Attack[];
  ab?: Ability[];
  de?: Localised; // flavour text
  ev?: Localised; // evolves from
  d?: number; // national dex id
  r?: string; // rarity
  i?: string; // illustrator
  hp?: number | string;
  st?: string; // stage
  ty?: string[]; // energy types
  rm?: string; // retreat cost
  rt?: string;
  s?: string; // tcgdex set id
  l?: string; // tcgdex local id
  imgs?: Localised; // per-language scan base urls (append /low.webp or /high.webp)
  cm?: number; // cardmarket product id
  eur?: EurPrices;
};

export type SetInfo = {
  id: number;
  name: string;
  abbr: string;
  released: string | null;
  supplemental: boolean;
  cards: number;
  names?: Localised; // set name per printing language
};

export type Stats = {
  snapshot: string;
  snapshotTs: number;
  cards: number;
  sets: number;
  priced: number;
  unpriced: number;
  rarities: number;
  types: number;
  source: string;
  currency: string;
  // multilingual layer
  languages?: CardLanguage[];
  languageNames?: Record<string, number>; // unique cards with a name in that language
  languageCards?: Record<string, number>; // catalogue products carrying that language
  identityCards?: number;
  identityCoverage?: number; // % of products with a resolved identity
  species?: number;
  eurPriced?: number;
  eurProducts?: number;
  eurCoverage?: number; // % of identified cards with a EUR price
  usdPriced?: number;
  eurSource?: string;
  eurUpdated?: string;
  eurPriceDay?: string;
  cardContentSource?: string;
};


export type SortKey =
  | "price-desc"
  | "price-asc"
  | "name-asc"
  | "name-desc"
  | "set-new"
  | "set-old"
  | "rarity"
  | "number";
