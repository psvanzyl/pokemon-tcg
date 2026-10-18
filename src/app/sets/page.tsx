import Link from "next/link";
import type { Metadata } from "next";
import { getSets, getStats, setValues } from "@/lib/data";
import { moneyShort } from "@/lib/format";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "All sets",
  description: "Every Pokémon TCG set in the English catalogue, with card counts and total market value.",
};

export default function SetsPage() {
  const sets = getSets();
  const values = setValues();
  const stats = getStats();
  const grand = [...values.values()].reduce((a, b) => a + b, 0);

  // TCGplayer's group date is the set's real release date for most sets, but a
  // batch of promotional groups carries only the date the group was added to
  // their system — 19 sets cannot share one release date. Those are marked
  // unknown and sorted last instead of masquerading as the newest sets.
  const dateCounts = new Map<string, number>();
  for (const s of sets) {
    if (s.released) dateCounts.set(s.released, (dateCounts.get(s.released) ?? 0) + 1);
  }
  const bulkDates = new Set(
    [...dateCounts.entries()].filter(([, n]) => n >= 5).map(([d]) => d),
  );
  const isUnknownDate = (s: { released: string | null }) => !!s.released && bulkDates.has(s.released);
  const ordered = [...sets].sort((a, b) => {
    const au = isUnknownDate(a);
    const bu = isUnknownDate(b);
    if (au !== bu) return au ? 1 : -1;
    return (b.released ?? "").localeCompare(a.released ?? "");
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Sets</h1>
      <p className="mt-1 max-w-3xl text-[13px] text-muted">
        {sets.length} English sets · {stats?.cards.toLocaleString("en-US") ?? "—"} cards ·{" "}
        combined market value of one of every card:{" "}
        <span className="text-fg">${grand.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>{" "}
        (cheapest print of each card, USD).
      </p>
      <p className="mt-1 max-w-3xl text-[12px] text-muted">
        Release dates come from TCGplayer&apos;s set metadata. A handful of promotional groups have no
        original date there, so theirs shows as — rather than the date TCGplayer added the group.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">Set</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Code</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Released</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cards</th>
              <th className="px-3 py-2 text-right font-medium">Set value</th>
              <th className="px-3 py-2 text-right font-medium">Avg / card</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((s) => {
              const v = values.get(s.id) ?? 0;
              return (
                <tr key={s.id} className="border-t border-line/70 hover:bg-surface">
                  <td className="px-3 py-2">
                    <Link prefetch={false} href={`/?sets=${s.id}`} className="text-fg hover:text-poke-red">
                      {s.name}
                    </Link>
                    {s.supplemental && (
                      <span className="ml-2 rounded-full border border-line-strong px-1.5 py-0.5 text-[10px] text-muted">
                        supplemental
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{s.abbr || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">
                    {isUnknownDate(s) ? (
                      <span title="TCGplayer has no original release date for this group">—</span>
                    ) : (
                      (s.released ?? "—")
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted">{s.cards}</td>
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
