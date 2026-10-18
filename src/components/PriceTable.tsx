import { money } from "@/lib/format";
import type { PriceVariant } from "@/lib/types";

export default function PriceTable({ variants }: { variants: PriceVariant[] }) {
  if (variants.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface p-3 text-[13px] text-muted">
        No market price is currently reported for this card.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line shadow-sm">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="px-3 py-2 font-medium">Print</th>
            <th className="px-3 py-2 text-right font-medium">Market</th>
            <th className="px-3 py-2 text-right font-medium">Low</th>
            <th className="px-3 py-2 text-right font-medium">Mid</th>
            <th className="px-3 py-2 text-right font-medium">High</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.v} className="border-t border-line/70">
              <td className="px-3 py-2 text-fg">{v.v}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-poke-gold">
                {money(v.mkt)}
              </td>
              {/* Low/mid/high are TCGplayer's own estimates and only mean anything alongside a
                  market price it actually reports. For a print it has no market price for they are
                  unsourced — a promo Eevee carries $100,000 in all three — so they stay blank here
                  rather than sitting on the page looking like a price. */}
              <td className="px-3 py-2 text-right tabular-nums text-muted">
                {money(v.mkt == null ? null : v.low)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted">
                {money(v.mkt == null ? null : v.mid)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted">
                {money(v.mkt == null ? null : v.high)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
