"use client";

import Link from "next/link";
import type { Card, CardLanguage } from "@/lib/types";
import { money } from "@/lib/format";
import CardImage from "@/components/CardImage";

// Rarity chips: the light tone is the base, the dark tone sits behind `dark:`
// so the coloured label stays legible on a white card and on a near-black one.
const RARITY_TONE: Record<string, string> = {
  Common: "text-slate-700 border-slate-300 bg-slate-500/10 dark:text-slate-300 dark:border-slate-600/60",
  Uncommon:
    "text-emerald-700 border-emerald-300 bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-600/50",
  Rare: "text-sky-700 border-sky-300 bg-sky-500/10 dark:text-sky-300 dark:border-sky-600/50",
  "Holo Rare": "text-cyan-700 border-cyan-300 bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/50",
  "Ultra Rare":
    "text-fuchsia-700 border-fuchsia-300 bg-fuchsia-500/10 dark:text-fuchsia-300 dark:border-fuchsia-500/50",
  "Secret Rare":
    "text-amber-700 border-amber-300 bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/60",
  Promo: "text-rose-700 border-rose-300 bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/50",
  "Illustration Rare":
    "text-violet-700 border-violet-300 bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/50",
  "Special Illustration Rare":
    "text-purple-700 border-purple-300 bg-purple-500/10 dark:text-purple-200 dark:border-purple-400/60 dark:bg-purple-500/15",
  "Double Rare":
    "text-indigo-700 border-indigo-300 bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/50",
};

function rarityTone(rar: string | null) {
  if (!rar)
    return "text-slate-600 border-slate-300 bg-slate-500/10 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/40";
  return (
    RARITY_TONE[rar] ??
    "text-slate-700 border-slate-300 bg-slate-500/10 dark:text-slate-200 dark:border-slate-600/60"
  );
}

export default function CardTile({
  card,
  setName,
  view,
  lang,
}: {
  card: Card;
  setName: string;
  view: "grid" | "list";
  /**
   * Printing language of the scan we were handed. When a tile carries, say, a German
   * scan, the click has to land on the German page — otherwise the visitor finds the
   * card under its German name and is dropped back into English.
   */
  lang?: CardLanguage | null;
}) {
  const big = card.img.replace("_200w.jpg", "_400w.jpg");

  if (view === "list") {
    return (
      <Link prefetch={false}
        href={`/kaart/${card.id}${lang ? `?lang=${lang}` : ""}`}
        className="group flex items-center gap-4 rounded-xl border border-line bg-panel p-3 shadow-sm transition hover:border-poke-red/60 hover:bg-raised"
      >
        <CardImage
          src={card.img}
          alt={card.n}
          className="h-20 w-[58px] flex-none rounded-md bg-surface object-contain"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-fg group-hover:text-poke-red">
            {card.n}
          </div>
          <div className="truncate text-xs text-muted">
            {setName} · {card.num}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {card.rar && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${rarityTone(card.rar)}`}
              >
                {card.rar}
              </span>
            )}
            {card.typ && (
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] text-muted">
                {card.typ}
              </span>
            )}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-base font-semibold tabular-nums text-poke-gold">
            {money(card.px)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted">market</div>
        </div>
      </Link>
    );
  }

  return (
    <Link prefetch={false}
      href={`/kaart/${card.id}${lang ? `?lang=${lang}` : ""}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-sm transition hover:-translate-y-0.5 hover:border-poke-red/60 hover:shadow-[0_10px_30px_-12px_rgba(238,59,59,0.45)]"
    >
      <div className="relative aspect-[245/342] w-full overflow-hidden bg-surface">
        <CardImage
          src={card.img}
          srcSet={`${card.img} 1x, ${big} 2x`}
          alt={card.n}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
        />
        {card.px != null && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-canvas/85 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-poke-gold backdrop-blur">
            {money(card.px)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <div className="truncate text-sm font-medium text-fg group-hover:text-poke-red">
          {card.n}
        </div>
        <div className="truncate text-[11px] text-muted">
          {setName} · {card.num}
        </div>
        <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
          {card.rar ? (
            <span
              className={`truncate rounded-full border px-1.5 py-0.5 text-[10px] ${rarityTone(card.rar)}`}
            >
              {card.rar}
            </span>
          ) : (
            <span />
          )}
          {card.hp && (
            <span className="flex-none text-[10px] text-muted">HP {card.hp}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
