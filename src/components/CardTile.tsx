"use client";

import Link from "next/link";
import type { Card } from "@/lib/types";
import { money } from "@/lib/format";

const RARITY_TONE: Record<string, string> = {
  Common: "text-slate-300 border-slate-600/60 bg-slate-500/10",
  Uncommon: "text-emerald-300 border-emerald-600/50 bg-emerald-500/10",
  Rare: "text-sky-300 border-sky-600/50 bg-sky-500/10",
  "Holo Rare": "text-cyan-300 border-cyan-500/50 bg-cyan-500/10",
  "Ultra Rare": "text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-500/10",
  "Secret Rare": "text-amber-300 border-amber-500/60 bg-amber-500/10",
  Promo: "text-rose-300 border-rose-500/50 bg-rose-500/10",
  "Illustration Rare": "text-violet-300 border-violet-500/50 bg-violet-500/10",
  "Special Illustration Rare": "text-purple-200 border-purple-400/60 bg-purple-500/15",
  "Double Rare": "text-indigo-300 border-indigo-500/50 bg-indigo-500/10",
};

function rarityTone(rar: string | null) {
  if (!rar) return "text-slate-400 border-slate-700 bg-slate-800/40";
  return RARITY_TONE[rar] ?? "text-slate-200 border-slate-600/60 bg-slate-500/10";
}

export default function CardTile({
  card,
  setName,
  view,
}: {
  card: Card;
  setName: string;
  view: "grid" | "list";
}) {
  const big = card.img.replace("_200w.jpg", "_400w.jpg");

  if (view === "list") {
    return (
      <Link
        href={`/kaart/${card.id}`}
        className="group flex items-center gap-4 rounded-xl border border-ink-700 bg-ink-850/70 p-3 transition hover:border-poke-red/60 hover:bg-ink-800"
      >
        <img
          src={card.img}
          alt={card.n}
          loading="lazy"
          className="h-20 w-[58px] flex-none rounded-md bg-ink-900 object-contain"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-slate-fg group-hover:text-white">
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
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] text-muted">
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
    <Link
      href={`/kaart/${card.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-850/70 transition hover:-translate-y-0.5 hover:border-poke-red/60 hover:shadow-[0_10px_30px_-12px_rgba(238,59,59,0.45)]"
    >
      <div className="relative aspect-[245/342] w-full overflow-hidden bg-ink-900">
        <img
          src={card.img}
          srcSet={`${card.img} 1x, ${big} 2x`}
          alt={card.n}
          loading="lazy"
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
        />
        {card.px != null && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-ink-950/85 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-poke-gold backdrop-blur">
            {money(card.px)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <div className="truncate text-sm font-medium text-slate-fg group-hover:text-white">
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
