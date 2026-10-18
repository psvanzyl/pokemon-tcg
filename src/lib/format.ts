/**
 * The cheapest TCGplayer MARKET price across a card's prints, or null when it has none.
 *
 * Deliberately not px: px is what the pipeline publishes and it has to agree with this, but mid, low
 * and high are TCGplayer estimates that are sometimes absurd (a promo Eevee carries a mid of
 * $100,000). A card with no market price is worth nothing here, and the UI shows it as unpriced
 * rather than pricing it off an estimate. Mirrors ops/normalize.py.
 */
export function marketPrice(card: { pv: { mkt: number | null }[] }): number | null {
  let best: number | null = null;
  for (const v of card.pv) if (v.mkt != null && (best === null || v.mkt < best)) best = v.mkt;
  return best;
}

export function money(v: number | null | undefined, opts?: { compact?: boolean }) {
  if (v == null || Number.isNaN(v)) return "—";
  if (opts?.compact && v >= 10000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function moneyShort(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

/**
 * Euro prices come from Cardmarket. Deliberately formatted the same way as the dollars
 * ("€1,234.56" rather than "1.234,56 €") so a two-currency table stays readable; the
 * currency symbol, not the decimal separator, is what distinguishes the columns.
 */
export function eur(v: number | null | undefined, opts?: { compact?: boolean }) {
  if (v == null || Number.isNaN(v)) return "—";
  if (opts?.compact && v >= 10000) return `€${(v / 1000).toFixed(0)}k`;
  return `€${v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function pct(from: number, to: number) {
  if (!from) return null;
  return ((to - from) / from) * 100;
}
