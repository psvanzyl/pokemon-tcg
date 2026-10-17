import Link from "next/link";
import type { Metadata } from "next";
import { getSets, getStats, setValues } from "@/lib/data";
import { moneyShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All sets",
  description: "Every Pokémon TCG set in the English catalogue, with card counts and total market value.",
};

export default function SetsPage() {
  const sets = getSets();
  const values = setValues();
  const stats = getStats();
  const grand = [...values.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Sets</h1>
      <p className="mt-1 max-w-3xl text-[13px] text-muted">
        {sets.length} English sets · {stats?.cards.toLocaleString("en-US") ?? "—"} cards ·{" "}
        combined market value of one of every card:{" "}
        <span className="text-slate-fg">${grand.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>{" "}
        (cheapest print of each card, USD).
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-ink-700">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ink-850 text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">Set</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Released</th>
              <th className="px-3 py-2 text-right font-medium">Cards</th>
              <th className="px-3 py-2 text-right font-medium">Set value</th>
              <th className="px-3 py-2 text-right font-medium">Avg / card</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => {
              const v = values.get(s.id) ?? 0;
              return (
                <tr key={s.id} className="border-t border-ink-700/70 hover:bg-ink-850/60">
                  <td className="px-3 py-2">
                    <Link href={`/?sets=${s.id}`} className="text-slate-fg hover:text-poke-red">
                      {s.name}
                    </Link>
                    {s.supplemental && (
                      <span className="ml-2 rounded-full border border-ink-600 px-1.5 py-0.5 text-[10px] text-muted">
                        supplemental
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{s.abbr || "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-muted">{s.released ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{s.cards}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-poke-gold">
                    {v ? moneyShort(v) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">
                    {s.cards && v ? `$${(v / s.cards).toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
