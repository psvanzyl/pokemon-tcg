import Link from "next/link";
import type { Metadata } from "next";
import { getSets, getStats, setValues } from "@/lib/data";
import { moneyShort } from "@/lib/format";
import { LANGS, LANG_LABEL, LANG_SHORT, type CardLanguage } from "@/lib/types";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "All sets, and what they are called in six languages",
  description:
    "Every Pokémon TCG set in the catalogue, with the name it is printed under in English, French, German, Spanish, Italian and Portuguese, plus card counts and total market value.",
};

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: raw } = await searchParams;
  const lang: CardLanguage = LANGS.includes(raw as CardLanguage) ? (raw as CardLanguage) : "en";

  const sets = getSets();
  const values = setValues();
  const stats = getStats();
  const grand = [...values.values()].reduce((a, b) => a + b, 0);

  // The set table stays the English catalogue (its ids, dates and prices are TCGplayer's),
  // but the *name* column follows the language you pick. TCGdex has no localised set name
  // for every set, so this counts what it does have instead of pretending it is complete.
  const localName = (s: { names?: Partial<Record<CardLanguage, string>> }) =>
    lang === "en" ? null : (s.names?.[lang] ?? null);
  const namedCount = sets.filter(localName).length;

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
        {sets.length} sets · {stats?.cards.toLocaleString("en-US") ?? "—"} cards ·{" "}
        combined market value of one of every card:{" "}
        <span className="text-fg">${grand.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>{" "}
        (cheapest print of each card, USD).
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted">Set names in</span>
        {LANGS.map((l) => {
          const active = l === lang;
          return (
            <Link
              key={l}
              prefetch={false}
              href={l === "en" ? "/sets" : `/sets?lang=${l}`}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded-md border border-poke-red/60 bg-poke-red/15 px-2 py-0.5 text-[11px] text-fg"
                  : "rounded-md border border-line px-2 py-0.5 text-[11px] text-muted hover:border-line-strong hover:text-fg"
              }
            >
              <span className="font-mono text-[10px]">{LANG_SHORT[l]}</span> {LANG_LABEL[l]}
            </Link>
          );
        })}
      </div>

      <p className="mt-2 max-w-3xl text-[12px] text-muted">
        {lang === "en" ? (
          <>
            Pick a language to see the name each set was printed under. Set names come from TCGdex,
            which has them for 104–155 of the {sets.length} sets depending on the language — the
            rest keep their English name rather than showing a translated guess.
          </>
        ) : (
          <>
            {namedCount} of {sets.length} sets have a {LANG_LABEL[lang]} name in TCGdex; the other{" "}
            {sets.length - namedCount} show their English name. Card counts, dates and values stay
            the English catalogue&apos;s — only the name changes.
          </>
        )}
      </p>
      <p className="mt-1 max-w-3xl text-[12px] text-muted">
        Release dates come from TCGplayer&apos;s set metadata. A handful of promotional groups have no
        original date there, so theirs shows as — rather than the date TCGplayer added the group.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">
                Set{lang !== "en" ? ` · ${LANG_LABEL[lang]}` : ""}
              </th>
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
              const local = localName(s);
              return (
                <tr key={s.id} className="border-t border-line/70 hover:bg-surface">
                  <td className="px-3 py-2">
                    <Link prefetch={false} href={`/?sets=${s.id}`} className="text-fg hover:text-poke-red">
                      {local ?? s.name}
                    </Link>
                    {local && (
                      <div className="text-[11px] text-muted">
                        English: <span className="text-muted/80">{s.name}</span>
                      </div>
                    )}
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
