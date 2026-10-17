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
};

export type SetInfo = {
  id: number;
  name: string;
  abbr: string;
  released: string | null;
  supplemental: boolean;
  cards: number;
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
