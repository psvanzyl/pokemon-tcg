"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { money, moneyShort } from "@/lib/format";
import CardImage from "@/components/CardImage";
import { LANG_SHORT, type CardLanguage } from "@/lib/types";

type Line = {
  cardId: number;
  name: string;
  set: number;
  setName: string;
  abbr: string;
  num: string;
  variant: string;
  qty: number;
  unit: number | null;
  value: number | null;
  img: string;
};

type BySet = { set: number; name: string; abbr: string; cards: number; value: number };

type Totals = {
  value: number;
  cards: number;
  distinct: number;
  priced: number;
  unpriced: number;
  missing: number;
  bySet: BySet[];
  top: Line[];
  snapshot: string | null;
  updatedAt: string | null;
};

type SearchHit = {
  id: number;
  name: string;
  num: string;
  setName: string;
  abbr: string;
  img: string;
  primary: string;
  variants: { v: string; mkt: number | null }[];
  /** the name the card was printed under, when the query named it that way */
  printed?: {
    name: string;
    lang: CardLanguage;
    img: string | null;
    /** TCGdex identity, when the product has one */
    tid: string | null;
  } | null;
};

type Preview = {
  rows: number;
  combined: number;
  matched: {
    line: string;
    qty: number;
    cardId: number;
    name: string;
    setName: string;
    abbr: string;
    num: string;
    variant: string;
    unit: number | null;
  }[];
  ambiguous: {
    line: string;
    reason: string;
    options: { cardId: number; name: string; setName: string; num: string }[];
  }[];
  unmatched: { line: string; reason: string }[];
};

const PAGE = 100;
const field =
  "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-sm text-fg outline-none transition placeholder:text-muted/70 focus:border-poke-red/70 focus:ring-2 focus:ring-poke-red/20";
const btn =
  "rounded-lg border border-line-strong px-2.5 py-1 text-[12px] text-fg transition hover:bg-raised disabled:opacity-50";
const btnRed =
  "rounded-lg bg-poke-red px-3 py-1.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60";

export default function AccountClient({
  email,
  name,
  initialTotals,
  initialLines,
  initialCount,
}: {
  email: string;
  name: string | null;
  initialTotals: Totals;
  initialLines: Line[];
  initialCount: number;
}) {
  const [totals, setTotals] = useState<Totals>(initialTotals);
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [count, setCount] = useState(initialCount);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("value");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"search" | "paste">("search");
  const [flash, setFlash] = useState<string | null>(null);

  const first = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/collection?q=${encodeURIComponent(q)}&sort=${sort}&offset=${offset}&limit=${PAGE}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { totals: Totals; lines: Line[]; matchedCount: number };
      setTotals(j.totals);
      setLines(j.lines);
      setCount(j.matchedCount);
    } finally {
      setLoading(false);
    }
  }, [q, sort, offset]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function mutateCard(line: Line, nextQty: number) {
    if (nextQty <= 0) {
      await fetch(`/api/collection?cardId=${line.cardId}&variant=${encodeURIComponent(line.variant)}`, {
        method: "DELETE",
      });
      setFlash(`Removed ${line.name}.`);
    } else {
      await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: line.cardId, variant: line.variant, mode: "set", qty: nextQty }),
      });
    }
    await load();
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const hasCards = totals.distinct > 0;
  const from = count === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, count);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-8 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My collection</h1>
          <p className="mt-1 text-[13px] text-muted">
            {name ? `${name} · ` : ""}
            {email}
            {totals.snapshot ? ` · prices from TCGplayer, snapshot ${totals.snapshot}` : ""}
          </p>
        </div>
        <button type="button" onClick={signOut} className={btn}>
          Sign out
        </button>
      </div>

      {/* ---- headline numbers ---- */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Collection value" value={money(totals.value)} big accent />
        <Metric label="Cards owned" value={totals.cards.toLocaleString("en-US")} />
        <Metric label="Distinct cards" value={totals.distinct.toLocaleString("en-US")} />
        <Metric
          label="No market price"
          value={totals.unpriced.toLocaleString("en-US")}
          hint={totals.unpriced > 0 ? "excluded from the total" : undefined}
        />
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Market value only: each owned card is priced at the TCGplayer market price for its exact print
        variant, then multiplied by how many copies you own. Cards with no market price are counted
        separately and never valued off a mid or high estimate
        {totals.missing > 0 ? ` · ${totals.missing} rows no longer match the catalogue` : ""}.
      </p>

      {hasCards && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Top 10 by value">
            <ul className="divide-y divide-line/70 text-[13px]">
              {totals.top.map((l) => (
                <li key={`${l.cardId}|${l.variant}`} className="flex items-center gap-3 py-2">
                  <Link prefetch={false} href={`/kaart/${l.cardId}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-poke-red">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <CardImage src={l.img} alt="" className="h-10 w-[29px] flex-none rounded border border-line object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {l.abbr ? `${l.abbr} · ` : ""}
                        {l.num}
                        {l.variant ? ` · ${l.variant}` : ""}
                        {l.qty > 1 ? ` · ×${l.qty}` : ""}
                      </span>
                    </span>
                  </Link>
                  <span className="flex-none tabular-nums font-semibold text-poke-gold">{money(l.value)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={`Value by set (${totals.bySet.length} sets)`}>
            <ul className="divide-y divide-line/70 text-[13px]">
              {totals.bySet.slice(0, 12).map((s) => (
                <li key={s.set} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    <Link prefetch={false} href={`/sets/${s.set}`} className="hover:text-poke-red">
                      {s.name}
                    </Link>
                    <span className="ml-2 text-[11px] text-muted">{s.cards} cards</span>
                  </span>
                  <span className="flex-none tabular-nums text-poke-gold">{money(s.value)}</span>
                </li>
              ))}
            </ul>
            {totals.bySet.length > 12 && (
              <p className="pt-2 text-[11px] text-muted">+ {totals.bySet.length - 12} more sets</p>
            )}
          </Panel>
        </div>
      )}

      {/* ---- adding cards ---- */}
      <div className="mt-6 rounded-xl border border-line bg-panel p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">Add cards</h2>
          <div className="flex rounded-lg border border-line bg-surface p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setTab("search")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${tab === "search" ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"}`}
            >
              Search the catalogue
            </button>
            <button
              type="button"
              onClick={() => setTab("paste")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${tab === "paste" ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"}`}
            >
              Paste a list
            </button>
          </div>
        </div>

        {tab === "search" ? <AddBySearch onAdded={load} /> : <AddByPaste onApplied={load} />}
      </div>

      {flash && <p className="mt-3 text-[12px] text-poke-gold">{flash}</p>}

      {/* ---- the collection itself ---- */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">Owned cards</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
              placeholder="Filter my collection…"
              className={`${field} w-56`}
            />
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-line-strong bg-field px-2.5 py-2 text-[13px] text-fg outline-none"
            >
              <option value="value">Most valuable</option>
              <option value="value-asc">Least valuable</option>
              <option value="name">Name A–Z</option>
              <option value="set">Set</option>
              <option value="recent">Recently added (card id)</option>
            </select>
          </div>
        </div>

        {count === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-surface p-4 text-[13px] text-muted">
            {hasCards ? (
              "No owned cards match that filter."
            ) : (
              <>
                Your collection is empty. Add cards from any{" "}
                <Link prefetch={false} href="/" className="underline hover:text-fg">
                  card page
                </Link>{" "}
                (“I own this”), or paste a list of what is in your binders above.
              </>
            )}
          </p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line bg-panel">
              {lines.map((l) => (
                <li key={`${l.cardId}|${l.variant}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <Link prefetch={false} href={`/kaart/${l.cardId}`} className="flex min-w-0 flex-1 items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <CardImage src={l.img} alt="" className="h-12 w-[35px] flex-none rounded border border-line object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium hover:text-poke-red">{l.name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {l.abbr ? `${l.abbr} · ` : ""}
                        {l.num}
                        {l.variant ? ` · ${l.variant}` : ""}
                      </span>
                    </span>
                  </Link>

                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => void mutateCard(l, l.qty - 1)}
                      aria-label={`Remove one ${l.name}`}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-[13px] tabular-nums">{l.qty}</span>
                    <button
                      type="button"
                      className={btn}
                      onClick={() => void mutateCard(l, l.qty + 1)}
                      aria-label={`Add one ${l.name}`}
                    >
                      +
                    </button>
                  </span>

                  <span className="w-20 text-right text-[13px] tabular-nums text-muted">
                    {l.unit == null ? "—" : money(l.unit)}
                  </span>
                  <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-poke-gold">
                    {l.value == null ? "unpriced" : money(l.value)}
                  </span>
                  <button
                    type="button"
                    className={`${btn} text-muted hover:text-poke-red`}
                    onClick={() => void mutateCard(l, 0)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
              <span>
                Showing {from}–{to} of {count.toLocaleString("en-US")}
                {loading ? " · loading…" : ""}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className={btn}
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={to >= count}
                  onClick={() => setOffset(offset + PAGE)}
                >
                  Next
                </button>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  big,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3.5 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div
        className={`mt-1 tabular-nums font-semibold ${big ? "text-2xl" : "text-xl"} ${
          accent ? "text-poke-gold" : "text-fg"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-sm">
      <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </div>
  );
}

function AddBySearch({ onAdded }: { onAdded: () => void | Promise<void> }) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [sel, setSel] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cards/search?q=${encodeURIComponent(term.trim())}&limit=25`, {
          cache: "no-store",
        });
        const j = (await r.json()) as { results?: SearchHit[] };
        setHits(j.results ?? []);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  async function add(hit: SearchHit) {
    setBusy(true);
    setDone(null);
    try {
      const variant = sel[hit.id] ?? hit.primary;
      const r = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: hit.id, variant, mode: "add", qty: 1 }),
      });
      if (r.ok) setDone(`Added ${hit.name} (${variant || "card"}).`);
      await onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search by card name or number, in any print language (e.g. Charizard 4/102, Caninos de Hisui)…"
        className={field}
      />
      {done && <p className="mt-2 text-[12px] text-poke-gold">{done}</p>}
      {hits.length > 0 && (
        <ul className="mt-3 max-h-96 divide-y divide-line/70 overflow-y-auto rounded-lg border border-line">
          {hits.map((h) => {
            const variant = sel[h.id] ?? h.primary;
            const price = h.variants.find((v) => v.v === variant)?.mkt ?? null;
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <CardImage src={h.img} alt="" className="h-11 w-8 flex-none rounded border border-line object-cover" />
                <Link
                  prefetch={false}
                  href={h.printed?.tid ? `/kaart/${h.id}?lang=${h.printed.lang}` : `/kaart/${h.id}`}
                  className="min-w-0 flex-1 hover:text-poke-red"
                >
                  <span className="block truncate text-[13px] font-medium">
                    {h.printed ? h.printed.name : h.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {h.printed ? (
                      <>
                        <span className="font-mono text-[10px]">{LANG_SHORT[h.printed.lang]}</span>{" "}
                        {h.name} ·{" "}
                      </>
                    ) : null}
                    {h.abbr ? `${h.abbr} · ` : ""}
                    {h.setName} · {h.num}
                    {h.variants.length === 1 && variant ? ` · ${variant}` : ""}
                  </span>
                </Link>
                {h.variants.length > 1 ? (
                  <select
                    value={variant}
                    onChange={(e) => setSel((s) => ({ ...s, [h.id]: e.target.value }))}
                    className="rounded-lg border border-line-strong bg-field px-2 py-1.5 text-[12px] text-fg outline-none"
                  >
                    {h.variants.map((v) => (
                      <option key={v.v} value={v.v}>
                        {v.v}
                      </option>
                    ))}
                  </select>
                ) : null}
                <span className="w-16 text-right text-[12px] tabular-nums text-muted">
                  {price == null ? "—" : moneyShort(price)}
                </span>
                <button type="button" disabled={busy} className={btnRed} onClick={() => void add(h)}>
                  Add
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddByPaste({ onApplied }: { onApplied: () => void | Promise<void> }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await fn();
      const j = (await r.json()) as Preview & { preview?: boolean; ok?: boolean; applied?: number; error?: string; message?: string };
      if (!r.ok) throw new Error(j.message || j.error || "failed");
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function doPreview() {
    const j = await run(() =>
      fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    );
    if (j) setPreview({ ...(j as Preview), rows: j.rows ?? 0 });
  }

  async function doApply() {
    if (!preview) return;
    const j = await run(() =>
      fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apply: preview.matched.map((m) => ({ cardId: m.cardId, variant: m.variant, qty: m.qty })),
        }),
      }),
    );
    if (j) {
      setDone(`Added ${j.applied ?? 0} rows to your collection.`);
      setPreview(null);
      setText("");
      await onApplied();
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-[12px] text-muted">
        One card per line. A leading number is the quantity; the card number (<code>143/191</code>), a
        print word (holo, reverse holo, 1st edition) and the set name are all understood if you include
        them. Lines that match more than one card are listed back for you instead of being guessed.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        rows={6}
        placeholder={"4 Eevee 143/191\n2 Charizard Holofoil Base Set 4/102\n1 Mew #9"}
        className={`${field} font-mono text-[12px]`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} disabled={busy || !text.trim()} onClick={() => void doPreview()}>
          {busy ? "Checking…" : "Check my list"}
        </button>
        {preview && preview.matched.length > 0 && (
          <button type="button" className={btnRed} disabled={busy} onClick={() => void doApply()}>
            Add {preview.matched.length} matched cards
          </button>
        )}
        {preview && (
          <span className="text-[12px] text-muted">
            {preview.rows} lines read · {preview.matched.length} matched
            {preview.combined ? ` (${preview.combined} merged as duplicates)` : ""} ·{" "}
            {preview.ambiguous.length} ambiguous · {preview.unmatched.length} not found
          </span>
        )}
      </div>

      {error && <p className="text-[12px] text-poke-red">{error}</p>}
      {done && <p className="text-[12px] text-poke-gold">{done}</p>}

      {preview && preview.matched.length > 0 && (
        <details className="rounded-lg border border-line bg-surface p-3 text-[12px]">
          <summary className="cursor-pointer text-muted">Matched ({preview.matched.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {preview.matched.map((m) => (
              <li key={`${m.cardId}|${m.variant}`} className="flex flex-wrap justify-between gap-2">
                <span className="text-muted">
                  {m.line} → <span className="text-fg">{m.name}</span> {m.abbr ? `${m.abbr} ` : ""}
                  {m.num}
                  {m.variant ? ` · ${m.variant}` : ""} × {m.qty}
                </span>
                <span className="tabular-nums text-muted">{m.unit == null ? "unpriced" : money(m.unit)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {preview && preview.ambiguous.length > 0 && (
        <details open className="rounded-lg border border-poke-gold/40 bg-poke-gold/5 p-3 text-[12px]">
          <summary className="cursor-pointer text-poke-gold">
            Ambiguous ({preview.ambiguous.length}) — add the set name or card number and check again
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {preview.ambiguous.map((a, i) => (
              <li key={i}>
                <div className="text-fg">{a.line}</div>
                <div className="text-muted">{a.reason}</div>
                <div className="text-muted">
                  {a.options.map((o) => `${o.name} — ${o.setName} ${o.num}`).join(" | ")}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {preview && preview.unmatched.length > 0 && (
        <details className="rounded-lg border border-line bg-surface p-3 text-[12px]">
          <summary className="cursor-pointer text-muted">Not found ({preview.unmatched.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {preview.unmatched.map((u, i) => (
              <li key={i} className="text-muted">
                {u.line} — {u.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
