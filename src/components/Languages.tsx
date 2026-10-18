import Link from "next/link";
import {
  LANGS,
  LANG_LABEL,
  LANG_SHORT,
  type CardContent,
  type CardLanguage,
} from "@/lib/types";

/** Printed energy abbreviations, for the attack-cost pills. */
const ENERGY_SHORT: Record<string, string> = {
  Grass: "G",
  Fire: "R",
  Water: "W",
  Lightning: "L",
  Psychic: "P",
  Fighting: "F",
  Darkness: "D",
  Metal: "M",
  Fairy: "Y",
  Dragon: "N",
  Colorless: "C",
};

export function energyShort(type: string) {
  return ENERGY_SHORT[type] ?? type.slice(0, 1).toUpperCase();
}

/** Languages this printing actually has content for (English is always shown). */
export function availableLanguages(content: CardContent | null): CardLanguage[] {
  const names = content?.n ?? {};
  return LANGS.filter((l) => l === "en" || !!names[l]);
}

type ChipsProps = {
  cardId: number;
  content: CardContent | null;
  current: CardLanguage;
};

/**
 * Language switcher. Plain links, no JavaScript: the page is rendered server-side per
 * language, so "/kaart/272271?lang=fr" is a real, cacheable, linkable French page — which
 * is what the search engines and the person sharing the link both need.
 */
export function LanguageChips({ cardId, content, current }: ChipsProps) {
  const langs = availableLanguages(content);
  if (langs.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted">Printed in</span>
      {langs.map((l) => {
        const active = l === current;
        return (
          <Link
            key={l}
            prefetch={false}
            href={l === "en" ? `/kaart/${cardId}` : `/kaart/${cardId}?lang=${l}`}
            title={LANG_LABEL[l]}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-md border border-poke-red/70 bg-poke-red/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-fg"
                : "rounded-md border border-line px-2 py-0.5 text-[11px] tracking-wide text-muted transition hover:border-line-strong hover:text-fg"
            }
          >
            {LANG_SHORT[l]}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Every localised name of the card, always in the HTML. This is the whole point of the
 * site in one table: one card, one identity, six printed names — including for the
 * cards where TCGplayer and Cardmarket only ever show the English one.
 */
export function LocalisedNames({ cardId, content, current }: ChipsProps) {
  const rows = LANGS.filter((l) => l === "en" || content?.n?.[l]);
  if (!content || rows.length < 2) return null;
  const distinct = new Set(rows.map((l) => (content.n?.[l] ?? "").toLowerCase()));
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="px-3 py-2 font-medium">Language</th>
            <th className="px-3 py-2 font-medium">Card name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const name = content.n?.[l];
            if (!name) return null;
            const active = l === current;
            return (
              <tr key={l} className={`border-t border-line/70 ${active ? "bg-panel" : ""}`}>
                <td className="whitespace-nowrap px-3 py-2 text-muted">
                  <Link
                    prefetch={false}
                    href={l === "en" ? `/kaart/${cardId}` : `/kaart/${cardId}?lang=${l}`}
                    className="hover:text-fg hover:underline"
                  >
                    <span className="mr-1.5 font-mono text-[11px] text-muted">{LANG_SHORT[l]}</span>
                    {LANG_LABEL[l]}
                  </Link>
                </td>
                <td className={`px-3 py-2 ${active ? "font-semibold text-fg" : "text-fg/90"}`}>
                  {name}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {distinct.size < rows.length && (
        <p className="border-t border-line/70 bg-surface px-3 py-2 text-[12px] text-muted">
          Some of these printings share a name — the same word in two languages, or the
          English name left untranslated in that edition.
        </p>
      )}
    </div>
  );
}

/** Attacks and abilities as printed in the selected language. */
export function LocalisedCardText({
  content,
  lang,
}: {
  content: CardContent;
  lang: CardLanguage;
}) {
  const attacks = content.a ?? [];
  const abilities = content.ab ?? [];
  const flavour = content.de?.[lang] ?? content.de?.en;
  const evolvesFrom = content.ev?.[lang];
  const hasAny = attacks.length > 0 || abilities.length > 0 || flavour || evolvesFrom;
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      {evolvesFrom && (
        <p className="text-[12px] text-muted">
          Evolves from <span className="text-fg">{evolvesFrom}</span>
        </p>
      )}

      {abilities.map((ab, i) => (
        <div key={`ab${i}`} className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold text-poke-red">
              {ab.n?.[lang] ?? ab.n?.en ?? "Ability"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted">Ability</span>
          </div>
          {ab.e?.[lang] && (
            <p className="mt-1 text-[13px] leading-relaxed text-fg/90">{ab.e[lang]}</p>
          )}
        </div>
      ))}

      {attacks.map((a, i) => (
        <div key={`a${i}`} className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5">
              {(a.c ?? []).map((t, j) => (
                <span
                  key={j}
                  title={t}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line-strong text-[9px] font-semibold text-muted"
                >
                  {energyShort(t)}
                </span>
              ))}
              <span className="text-[13px] font-semibold text-fg">
                {a.n?.[lang] ?? a.n?.en}
              </span>
            </span>
            {a.d != null && a.d !== "" && (
              <span className="text-[15px] font-semibold tabular-nums text-fg">{a.d}</span>
            )}
          </div>
          {a.e?.[lang] && (
            <p className="mt-1 text-[13px] leading-relaxed text-fg/90">{a.e[lang]}</p>
          )}
        </div>
      ))}

      {flavour && (
        <p className="border-l-2 border-line-strong pl-3 text-[13px] italic leading-relaxed text-muted">
          {flavour}
        </p>
      )}

      {content.i && (
        <p className="text-[12px] text-muted">
          Illustration: <span className="text-fg/90">{content.i}</span>
        </p>
      )}
    </div>
  );
}
