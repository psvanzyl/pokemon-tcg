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
