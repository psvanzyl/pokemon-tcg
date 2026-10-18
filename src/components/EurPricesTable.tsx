import { eur } from "@/lib/format";
import {
  EUR_FAMILY_LABEL,
  EUR_FAMILY_ORDER,
  type EurFigures,
  type EurPrices,
} from "@/lib/types";

/**
 * Cardmarket's price guide, as published in their free daily download. Two things are
 * stated plainly rather than hidden: these are *product*-level figures (Cardmarket does
 * not publish per-language price splits, so this is not "the French printing costs X"),
 * and the family rows are Cardmarket's own condition/foil families, not print variants
 * we invented.
 */
export default function EurPricesTable({
  prices,
  searchName,
  priceDay,
}: {
  prices: EurPrices;
  searchName: string;
  priceDay?: string | null;
}) {
  const families: [string, EurFigures][] = Object.entries(prices).filter(
    (entry): entry is [string, EurFigures] => entry[1] != null && entry[1].avg != null,
  );
  if (families.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface p-3 text-[13px] text-muted">
        Cardmarket lists this product but publishes no average price for it yet.
      </p>
    );
  }
  const order = EUR_FAMILY_ORDER;
  families.sort((a, b) => {
    const ia = order.indexOf(a[0]);
    const ib = order.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-line shadow-sm">
        <table className="w-full min-w-[460px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">Cardmarket product</th>
              <th className="px-3 py-2 text-right font-medium">Avg</th>
              <th className="px-3 py-2 text-right font-medium">Low</th>
              <th className="px-3 py-2 text-right font-medium">Trend</th>
              <th className="px-3 py-2 text-right font-medium">7d</th>
              <th className="px-3 py-2 text-right font-medium">30d</th>
            </tr>
          </thead>
          <tbody>
            {families.map(([key, f]) => (
              <tr key={key} className="border-t border-line/70">
                <td className="px-3 py-2 text-fg">
                  {EUR_FAMILY_LABEL[key] ?? key}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-poke-gold">
                  {eur(f.avg)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{eur(f.low)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{eur(f.trend)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{eur(f.avg7)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{eur(f.avg30)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Source:{" "}
        <a
          className="underline decoration-line-strong hover:decoration-poke-red"
          href={`https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(
            searchName,
          )}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          Cardmarket
        </a>{" "}
        public price guide{priceDay ? `, ${priceDay.slice(0, 10)}` : ""} — product-level,
        so identical for every language this card was printed in. No per-print-language
        price split is published by either marketplace; we show what exists rather than
        invent one.
      </p>
    </div>
  );
}
