"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import type { Card, SetInfo, SortKey, Stats } from "@/lib/types";
import CardTile from "./CardTile";
import FilterPanel, { countActive, EMPTY_FILTERS, type Filters } from "./FilterPanel";

const PAGE = 60;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "price-desc", label: "Price: high → low" },
  { key: "price-asc", label: "Price: low → high" },
  { key: "name-asc", label: "Name: A → Z" },
  { key: "name-desc", label: "Name: Z → A" },
  { key: "set-new", label: "Set: newest first" },
  { key: "set-old", label: "Set: oldest first" },
  { key: "rarity", label: "Rarity: rarest first" },
  { key: "number", label: "Card number" },
];

const RARITY_RANK = [
  "common",
  "uncommon",
  "rare",
  "holo rare",
  "promo",
  "double rare",
  "rare holo",
  "shiny rare",
  "radiant rare",
  "amazing rare",
  "ace spec rare",
  "ultra rare",
  "illustration rare",
  "shiny ultra rare",
  "hyper rare",
  "secret rare",
  "special illustration rare",
  "classic collection",
];

function rarityRank(rar: string | null) {
  if (!rar) return -1;
  const r = rar.toLowerCase();
  const idx = RARITY_RANK.findIndex((x) => r === x);
  if (idx >= 0) return idx;
  const partial = RARITY_RANK.findIndex((x) => r.includes(x));
  return partial >= 0 ? partial : 3;
}

function numKey(num: string) {
  const m = num.match(/\d+/);
  return m ? parseInt(m[0], 10) : 99999;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function matches(
  c: Card,
  f: Filters,
  setMap: Map<number, SetInfo>,
  skip?: "q" | "sets" | "rar" | "typ" | "stg" | "vari" | "price",
) {
  if (skip !== "q" && f.q.trim()) {
    const hay = `${norm(c.n)} ${c.num.toLowerCase()} ${norm(setMap.get(c.set)?.name ?? "")} ${
      setMap.get(c.set)?.abbr?.toLowerCase() ?? ""
    }`;
    for (const tok of norm(f.q).split(/\s+/).filter(Boolean)) {
      if (!hay.includes(tok)) return false;
    }
  }
  if (skip !== "sets" && f.sets.length && !f.sets.includes(c.set)) return false;
  if (skip !== "rar" && f.rar.length && (!c.rar || !f.rar.includes(c.rar))) return false;
  if (skip !== "typ" && f.typ.length && (!c.typ || !f.typ.includes(c.typ))) return false;
  if (skip !== "stg" && f.stg.length && (!c.stg || !f.stg.includes(c.stg))) return false;
  if (skip !== "vari" && f.vari.length && !c.pv.some((v) => f.vari.includes(v.v)))
    return false;
  if (skip !== "price") {
    if (f.priced && c.px == null) return false;
    if (f.min != null || f.max != null) {
      if (c.px == null) return false;
      if (f.min != null && c.px < f.min) return false;
      if (f.max != null && c.px > f.max) return false;
    }
  }
  return true;
}

type View = "grid" | "list";

export default function Catalogue() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [sets, setSets] = useState<SetInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [raw, setRaw] = useState("");
  const [sort, setSort] = useState<SortKey>("price-desc");
  const [view, setView] = useState<View>("grid");
  const [visible, setVisible] = useState(PAGE);
  const [drawer, setDrawer] = useState(false);
  const [ready, setReady] = useState(false);

  // ---- load data -------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/cards");
        if (!r.ok) throw new Error(`cards ${r.status}`);
        const data = (await r.json()) as Card[];
        if (!alive) return;
        setCards(data);
      } catch {
        // fallback: pull the pre-gzipped snapshot and inflate in the browser
        try {
          const r = await fetch("/data/cards.json.gz");
          if (!r.body) throw new Error("no stream");
          const stream = r.body.pipeThrough(new DecompressionStream("gzip"));
          const text = await new Response(stream).text();
          if (!alive) return;
          setCards(JSON.parse(text) as Card[]);
        } catch (e) {
          if (alive) setError(String(e));
        }
      }
      try {
        const r = await fetch("/api/sets");
        const j = (await r.json()) as { sets: SetInfo[]; stats: Stats | null };
        if (!alive) return;
        setSets(j.sets ?? []);
        setStats(j.stats ?? null);
      } catch {
        /* sets are a nicety; the catalogue still works without them */
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---- deep link -> state ---------------------------------------------
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const list = (k: string) =>
      (p.get(k) ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const n = (k: string) => {
      const v = p.get(k);
      return v == null || v === "" ? null : Number(v);
    };
    setFilters({
      q: p.get("q") ?? "",
      sets: list("sets").map(Number).filter((x) => !Number.isNaN(x)),
      rar: list("rar"),
      typ: list("typ"),
      stg: list("stg"),
      vari: list("vari"),
      min: n("min"),
      max: n("max"),
      priced: p.get("priced") === "1",
    });
    setRaw(p.get("q") ?? "");
    const s = p.get("sort") as SortKey | null;
    if (s && SORTS.some((x) => x.key === s)) setSort(s);
    const v = p.get("view");
    if (v === "list" || v === "grid") setView(v);
  }, []);

  // ---- state -> URL ----------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.sets.length) p.set("sets", filters.sets.join(","));
    if (filters.rar.length) p.set("rar", filters.rar.join(","));
    if (filters.typ.length) p.set("typ", filters.typ.join(","));
    if (filters.stg.length) p.set("stg", filters.stg.join(","));
    if (filters.vari.length) p.set("vari", filters.vari.join(","));
    if (filters.min != null) p.set("min", String(filters.min));
    if (filters.max != null) p.set("max", String(filters.max));
    if (filters.priced) p.set("priced", "1");
    if (sort !== "price-desc") p.set("sort", sort);
    if (view !== "grid") p.set("view", view);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [filters, sort, view, ready]);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === raw ? f : { ...f, q: raw }));
    }, 160);
    return () => clearTimeout(t);
  }, [raw]);

  const setMap = useMemo(() => {
    const m = new Map<number, SetInfo>();
    for (const s of sets) m.set(s.id, s);
    return m;
  }, [sets]);

  const setNames = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of sets) m.set(s.id, s.name);
    return m;
  }, [sets]);

  const patch = useCallback((p: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...p }));
  }, []);

  const result = useMemo(() => {
    if (!cards) return [];
    const out = cards.filter((c) => matches(c, filters, setMap));
    const rel = (c: Card) => setMap.get(c.set)?.released ?? "";
    out.sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return (a.px ?? Infinity) - (b.px ?? Infinity);
        case "price-desc":
          return (b.px ?? -1) - (a.px ?? -1);
        case "name-asc":
          return a.n.localeCompare(b.n) || numKey(a.num) - numKey(b.num);
        case "name-desc":
          return b.n.localeCompare(a.n);
        case "set-new":
          return rel(b).localeCompare(rel(a)) || numKey(a.num) - numKey(b.num);
        case "set-old":
          return rel(a).localeCompare(rel(b)) || numKey(a.num) - numKey(b.num);
        case "rarity":
          return rarityRank(b.rar) - rarityRank(a.rar) || (b.px ?? -1) - (a.px ?? -1);
        case "number":
          return (
            (setNames.get(a.set) ?? "").localeCompare(setNames.get(b.set) ?? "") ||
            numKey(a.num) - numKey(b.num)
          );
        default:
          return 0;
      }
    });
    return out;
  }, [cards, filters, setMap, setNames, sort]);

  // facet values + live counts
  const facets = useMemo(() => {
    const all = cards ?? [];
    const rarCount = new Map<string, number>();
    const typCount = new Map<string, number>();
    const stgCount = new Map<string, number>();
    const variCount = new Map<string, number>();
    const setCount = new Map<number, number>();
    const bump = (m: Map<string, number>, k: string | null) => {
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    };
    for (const c of all) {
      if (matches(c, filters, setMap, "rar")) bump(rarCount, c.rar);
      if (matches(c, filters, setMap, "typ")) bump(typCount, c.typ);
      if (matches(c, filters, setMap, "stg")) bump(stgCount, c.stg);
      if (matches(c, filters, setMap, "vari"))
        for (const v of c.pv) bump(variCount, v.v);
      if (matches(c, filters, setMap, "sets"))
        setCount.set(c.set, (setCount.get(c.set) ?? 0) + 1);
    }
    const byCount = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return {
      rarities: byCount(rarCount),
      types: byCount(typCount),
      stages: byCount(stgCount),
      variants: byCount(variCount),
      counts: { rar: rarCount, typ: typCount, stg: stgCount, vari: variCount },
      setCounts: setCount,
    };
  }, [cards, filters, setMap]);

  useEffect(() => {
    setVisible(PAGE);
  }, [filters, sort]);

  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => (v >= result.length ? v : v + PAGE));
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [result.length]);

  const shown = result.slice(0, visible);
  const activeCount = countActive(filters);
  const loading = !ready && !error;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Search 28,000+ cards — name, set or card number (e.g. Charizard, 4/102)"
              className="w-full rounded-xl border border-ink-700 bg-ink-850 py-2.5 pl-10 pr-9 text-[14px] outline-none transition placeholder:text-muted/60 focus:border-poke-red/70 focus:bg-ink-800"
            />
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            {raw && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setRaw("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-slate-fg"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="flex items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-[13px] text-slate-fg transition hover:border-poke-red/60 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-poke-red/20 px-1.5 text-[10px] font-semibold text-poke-red">
                  {activeCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-ink-700 bg-ink-850 px-2.5 py-2.5 text-[13px] text-slate-fg outline-none focus:border-poke-red/70"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="hidden rounded-xl border border-ink-700 bg-ink-850 p-0.5 sm:flex">
              {(["grid", "list"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12px] capitalize transition ${
                    view === v ? "bg-ink-700 text-slate-fg" : "text-muted hover:text-slate-fg"
                  }`}
                >
                  {v === "grid" ? (
                    <LayoutGrid className="h-3.5 w-3.5" />
                  ) : (
                    <Rows3 className="h-3.5 w-3.5" />
                  )}
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span className="text-slate-fg">
            {loading || cards === null ? (
              <span className="text-muted">Loading the catalogue…</span>
            ) : (
              <>
                <strong data-testid="result-count" className="tabular-nums">
                  {result.length.toLocaleString("en-US")}
                </strong>{" "}
                {result.length === 1 ? "card" : "cards"}
              </>
            )}
          </span>
          {stats && (
            <span>
              of {stats.cards.toLocaleString("en-US")} · snapshot {stats.snapshot} ·{" "}
              {stats.sets} sets
            </span>
          )}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setRaw("");
              }}
              className="text-poke-red hover:underline"
            >
              clear {activeCount} filter{activeCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="hidden lg:block lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-88px)]">
          <FilterPanel
            sets={sets}
            rarities={facets.rarities}
            types={facets.types}
            stages={facets.stages}
            variants={facets.variants}
            filters={filters}
            counts={facets.counts}
            setCounts={facets.setCounts}
            onPatch={patch}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              setRaw("");
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          {error && (
            <div className="rounded-xl border border-poke-red/40 bg-poke-red/10 p-4 text-[13px]">
              Could not load the catalogue: {error}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-ink-700 bg-ink-850/60"
                >
                  <div className="aspect-[245/342] rounded-t-xl bg-ink-800/70" />
                  <div className="space-y-1.5 p-2.5">
                    <div className="h-3 w-3/4 rounded bg-ink-800" />
                    <div className="h-2.5 w-1/2 rounded bg-ink-800" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && result.length === 0 && (
            <div className="rounded-xl border border-ink-700 bg-ink-850/60 p-10 text-center">
              <p className="text-[15px] text-slate-fg">No cards match these filters.</p>
              <p className="mt-1 text-[13px] text-muted">
                Try a broader search, or reset the filters.
              </p>
            </div>
          )}

          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {shown.map((c) => (
                <CardTile
                  key={c.id}
                  card={c}
                  setName={setNames.get(c.set) ?? `Set ${c.set}`}
                  view="grid"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((c) => (
                <CardTile
                  key={c.id}
                  card={c}
                  setName={setNames.get(c.set) ?? `Set ${c.set}`}
                  view="list"
                />
              ))}
            </div>
          )}

          <div ref={sentinel} className="h-10" />
          {visible < result.length && (
            <div className="py-4 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="rounded-xl border border-ink-700 bg-ink-850 px-4 py-2 text-[13px] text-slate-fg transition hover:border-poke-red/60"
              >
                Load {Math.min(PAGE, result.length - visible)} more
              </button>
              <p className="mt-2 text-[11px] text-muted">
                showing {shown.length.toLocaleString("en-US")} of{" "}
                {result.length.toLocaleString("en-US")}
              </p>
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="relative ml-auto h-full w-[86%] max-w-[340px] p-2">
            <FilterPanel
              sets={sets}
              rarities={facets.rarities}
              types={facets.types}
              stages={facets.stages}
              variants={facets.variants}
              filters={filters}
              counts={facets.counts}
              setCounts={facets.setCounts}
              onPatch={patch}
              onReset={() => {
                setFilters(EMPTY_FILTERS);
                setRaw("");
              }}
              onClose={() => setDrawer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
