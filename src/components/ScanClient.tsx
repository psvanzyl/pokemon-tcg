"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type ScannedCard = {
  index: number;
  matched: boolean;
  cardId?: number;
  name?: string;
  num?: string;
  setName?: string;
  img?: string;
  variant?: string;
  variants?: string[];
  price?: number | null;
  ocr_number?: string | null;
  name_guess?: string | null;
  confidence?: number;
};

type Row = ScannedCard & { include: boolean; chosenVariant: string };

const money = (v: number | null | undefined) =>
  typeof v === "number" ? `$${v.toFixed(2)}` : "no price";

export default function ScanClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFlash(null);
    setRows(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const json = (await res.json()) as {
        cards?: ScannedCard[];
        elapsed_s?: number;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.cards) {
        setError(
          json.error === "unreachable" || json.error === "scan_unreachable"
            ? "The scan service is not answering. Try again in a minute."
            : `Scan failed (${json.error ?? res.status}).`,
        );
        return;
      }
      setElapsed(json.elapsed_s ?? null);
      setRows(
        json.cards.map((c) => ({
          ...c,
          include: Boolean(c.matched),
          chosenVariant: c.variant ?? "",
        })),
      );
      if (json.cards.length === 0) setError("No cards found in that photo. Get closer and avoid glare.");
    } catch (err) {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function addSelected() {
    if (!rows) return;
    const chosen = rows.filter((r) => r.include && r.matched && r.cardId);
    if (chosen.length === 0) return;
    setAdding(true);
    let added = 0;
    for (const row of chosen) {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: row.cardId,
          variant: row.chosenVariant,
          mode: "add",
          qty: 1,
        }),
      });
      if (res.ok) added += 1;
    }
    setAdding(false);
    setFlash(added === chosen.length ? `Added ${added} cards to your collection.` : `Added ${added} of ${chosen.length}. Some failed.`);
    if (added > 0) setRows(null);
  }

  const selected = rows?.filter((r) => r.include && r.matched) ?? [];
  const selectedValue = selected.reduce((sum, r) => sum + (typeof r.price === "number" ? r.price : 0), 0);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-3 pb-10 sm:px-5">
      <section className="border-b border-line/70 bg-gradient-to-b from-surface to-canvas">
        <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Scan cards</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            Photograph one card or a whole spread. Every card you confirm is added to your collection and
            counts towards its value.
          </p>
        </div>
      </section>

      <div className="mt-4 rounded-xl border border-line bg-panel/70 p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
          data-testid="scan-input"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            data-testid="scan-button"
          >
            {busy ? "Scanning…" : "Take a photo"}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2 text-[13px] disabled:opacity-60"
          >
            Choose an existing photo
          </button>
          {elapsed !== null && <span className="text-[12px] text-muted">scanned in {elapsed}s</span>}
        </div>

        {error && <p className="mt-3 text-[13px] text-accent">{error}</p>}
        {flash && <p className="mt-3 text-[13px] text-muted">{flash}</p>}
      </div>

      {rows && rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel/70">
          <div className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {rows.length} card{rows.length === 1 ? "" : "s"} found
            </span>
            <span className="ml-auto text-[11px] text-muted">
              {selected.length} selected · {money(selectedValue)}
            </span>
          </div>

          <ul className="divide-y divide-line/70">
            {rows.map((row, i) => (
              <li key={`${row.index}-${i}`} className="flex items-center gap-3 px-3 py-3">
                <input
                  type="checkbox"
                  checked={row.include}
                  disabled={!row.matched}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, include: e.target.checked };
                    setRows(next);
                  }}
                  className="h-4 w-4"
                  aria-label={`Include ${row.name ?? "card"}`}
                />
                {row.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.img} alt={row.name ?? "card"} className="h-[84px] w-[60px] rounded-md border border-line object-contain" />
                ) : (
                  <div className="h-[84px] w-[60px] rounded-md border border-line bg-field" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">
                    {row.matched ? row.name : row.name_guess ?? "Not matched"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {row.matched ? `${row.setName} · ${row.num}` : row.ocr_number ? `read ${row.ocr_number}` : "no number read"}
                  </p>
                  {!row.matched && (
                    <p className="mt-1 text-[12px] text-muted">
                      Search the catalogue and add it by hand.
                    </p>
                  )}
                </div>
                {row.matched && (
                  <div className="flex items-center gap-2">
                    <select
                      value={row.chosenVariant}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, chosenVariant: e.target.value };
                        setRows(next);
                      }}
                      className="rounded-xl border border-line-strong bg-field px-2.5 py-2 text-[13px]"
                      aria-label={`Variant for ${row.name}`}
                    >
                      {(row.variants && row.variants.length > 0 ? row.variants : [row.variant ?? ""]).map((v) => (
                        <option key={v} value={v}>
                          {v || "standard"}
                        </option>
                      ))}
                    </select>
                    <span className="w-20 text-right text-[13px] text-muted">{money(row.price)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 border-t border-line/70 px-3 py-3">
            <button
              type="button"
              onClick={addSelected}
              disabled={adding || selected.length === 0}
              className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
              data-testid="scan-add"
            >
              {adding ? "Adding…" : `Add ${selected.length} to collection`}
            </button>
            <Link href="/account" className="text-[13px] text-muted hover:text-accent">
              Go to my collection
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
