"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { SetInfo } from "@/lib/types";

export type Filters = {
  q: string;
  sets: number[];
  rar: string[];
  typ: string[];
  stg: string[];
  vari: string[];
  min: number | null;
  max: number | null;
  priced: boolean;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  sets: [],
  rar: [],
  typ: [],
  stg: [],
  vari: [],
  min: null,
  max: null,
  priced: false,
};

export function countActive(f: Filters): number {
  return (
    (f.q ? 1 : 0) +
    f.sets.length +
    f.rar.length +
    f.typ.length +
    f.stg.length +
    f.vari.length +
    (f.min != null || f.max != null ? 1 : 0) +
    (f.priced ? 1 : 0)
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line/70 px-3 py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted transition hover:text-fg"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

function CheckList({
  values,
  selected,
  counts,
  onToggle,
  max = 400,
}: {
  values: string[];
  selected: string[];
  counts: Map<string, number>;
  onToggle: (v: string) => void;
  max?: number;
}) {
  return (
    <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
      {values.slice(0, max).map((v) => {
        const on = selected.includes(v);
        const n = counts.get(v) ?? 0;
        return (
          <label
            key={v}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] transition hover:bg-raised ${
              on ? "text-fg" : "text-muted"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onToggle(v)}
              className="h-3.5 w-3.5 rounded border-line-strong bg-field"
            />
            <span className="min-w-0 flex-1 truncate">{v}</span>
            <span className="flex-none text-[10px] tabular-nums text-muted/70">{n}</span>
          </label>
        );
      })}
    </div>
  );
}

const PRICE_BUCKETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under $1", min: null, max: 1 },
  { label: "$1 – $5", min: 1, max: 5 },
  { label: "$5 – $20", min: 5, max: 20 },
  { label: "$20 – $100", min: 20, max: 100 },
  { label: "$100 – $500", min: 100, max: 500 },
  { label: "Over $500", min: 500, max: null },
];

export default function FilterPanel({
  sets,
  rarities,
  types,
  stages,
  variants,
  filters,
  counts,
  setCounts,
  onPatch,
  onReset,
  onClose,
}: {
  sets: SetInfo[];
  rarities: string[];
  types: string[];
  stages: string[];
  variants: string[];
  filters: Filters;
  counts: { rar: Map<string, number>; typ: Map<string, number>; stg: Map<string, number>; vari: Map<string, number> };
  setCounts: Map<number, number>;
  onPatch: (patch: Partial<Filters>) => void;
  onReset: () => void;
  onClose?: () => void;
}) {
  const [setQuery, setSetQuery] = useState("");

  const visibleSets = useMemo(() => {
    const q = setQuery.trim().toLowerCase();
    const sorted = [...sets].sort(
      (a, b) => (b.released ?? "").localeCompare(a.released ?? ""),
    );
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.abbr.toLowerCase().includes(q) ||
        (s.released ?? "").includes(q),
    );
  }, [sets, setQuery]);

  const toggle = (key: "rar" | "typ" | "stg" | "vari") => (v: string) => {
    const cur = filters[key];
    onPatch({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<Filters>);
  };

  const active = countActive(filters);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-panel/70 lg:w-[272px] lg:flex-none">
      <div className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Filters
        </span>
        {active > 0 && (
          <span className="rounded-full bg-poke-red/20 px-1.5 py-0.5 text-[10px] font-semibold text-poke-red">
            {active}
          </span>
        )}
        <button
          type="button"
          onClick={onReset}
          disabled={active === 0}
          className="ml-auto text-[11px] text-muted transition hover:text-poke-red disabled:opacity-40"
        >
          Reset
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-muted transition hover:text-fg lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Set">
          <input
            value={setQuery}
            onChange={(e) => setSetQuery(e.target.value)}
            placeholder="Find a set…"
            className="mb-2 w-full rounded-md border border-line-strong bg-field px-2 py-1.5 text-[13px] outline-none placeholder:text-muted/60 focus:border-poke-red/70"
          />
          <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
            {visibleSets.map((s) => {
              const on = filters.sets.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] transition hover:bg-raised ${
                    on ? "text-fg" : "text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onPatch({
                        sets: on
                          ? filters.sets.filter((x) => x !== s.id)
                          : [...filters.sets, s.id],
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-line-strong bg-field"
                  />
                  <span className="min-w-0 flex-1 truncate" title={s.name}>
                    {s.name}
                  </span>
                  <span className="flex-none text-[10px] tabular-nums text-muted/70">
                    {setCounts.get(s.id) ?? 0}
                  </span>
                </label>
              );
            })}
            {visibleSets.length === 0 && (
              <p className="px-1.5 py-2 text-[12px] text-muted">No set matches.</p>
            )}
          </div>
        </Section>

        <Section title="Price (USD)">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.min ?? ""}
              onChange={(e) =>
                onPatch({ min: e.target.value === "" ? null : Number(e.target.value) })
              }
              placeholder="min"
              className="w-full rounded-md border border-line-strong bg-field px-2 py-1.5 text-[13px] outline-none placeholder:text-muted/60 focus:border-poke-red/70"
            />
            <span className="text-muted">–</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.max ?? ""}
              onChange={(e) =>
                onPatch({ max: e.target.value === "" ? null : Number(e.target.value) })
              }
              placeholder="max"
              className="w-full rounded-md border border-line-strong bg-field px-2 py-1.5 text-[13px] outline-none placeholder:text-muted/60 focus:border-poke-red/70"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_BUCKETS.map((b) => {
              const on = filters.min === b.min && filters.max === b.max;
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() =>
                    onPatch(on ? { min: null, max: null } : { min: b.min, max: b.max })
                  }
                  className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                    on
                      ? "border-poke-red/70 bg-poke-red/15 text-fg"
                      : "border-line-strong text-muted hover:border-line-strong/80 hover:text-fg"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={filters.priced}
              onChange={(e) => onPatch({ priced: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-line-strong bg-field"
            />
            Only cards with a price
          </label>
        </Section>

        <Section title="Rarity">
          <CheckList
            values={rarities}
            selected={filters.rar}
            counts={counts.rar}
            onToggle={toggle("rar")}
          />
        </Section>

        <Section title="Type" defaultOpen={false}>
          <CheckList
            values={types}
            selected={filters.typ}
            counts={counts.typ}
            onToggle={toggle("typ")}
          />
        </Section>

        <Section title="Stage" defaultOpen={false}>
          <CheckList
            values={stages}
            selected={filters.stg}
            counts={counts.stg}
            onToggle={toggle("stg")}
          />
        </Section>

        <Section title="Print variant" defaultOpen={false}>
          <CheckList
            values={variants}
            selected={filters.vari}
            counts={counts.vari}
            onToggle={toggle("vari")}
          />
        </Section>
      </div>
    </aside>
  );
}
