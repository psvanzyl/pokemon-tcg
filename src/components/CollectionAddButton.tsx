"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";

type Variant = { v: string; mkt: number | null };

/**
 * "Do I own this?" control on a card page. The card page itself is statically cached, so ownership
 * is fetched client-side (/api/collection?cardId=…) and a 401 is how we learn the visitor is not
 * signed in — no cookie read in the page, which would make the whole route dynamic.
 */
export default function CollectionAddButton({
  cardId,
  variants,
}: {
  cardId: number;
  variants: Variant[];
}) {
  const primary = variants[0]?.v ?? "";
  // The card page is statically cached, so its HTML ships the anonymous state — no spinner, no
  // layout shift for the visitors who are the overwhelming majority. A signed-in visitor swaps to
  // the quantity control the moment /api/collection answers.
  const [status, setStatus] = useState<"anon" | "ready">("anon");
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [variant, setVariant] = useState(primary);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/collection?cardId=${cardId}`, { cache: "no-store" });
      if (r.status === 401) {
        setStatus("anon");
        return;
      }
      const j = (await r.json()) as { items?: { variant: string; qty: number }[] };
      const next: Record<string, number> = {};
      for (const it of j.items ?? []) next[it.variant] = it.qty;
      setOwned(next);
      setStatus("ready");
    } catch {
      setStatus("anon");
    }
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(mode: "add" | "set", value: number) {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, variant, mode, qty: value }),
      });
      const j = (await r.json()) as { qty?: number; error?: string };
      if (r.status === 401) {
        window.location.href = `/login?next=/kaart/${cardId}`;
        return;
      }
      if (!r.ok) throw new Error(j.error || "failed");
      setOwned((prev) => {
        const next = { ...prev };
        if (!j.qty) delete next[variant];
        else next[variant] = j.qty;
        return next;
      });
      setNote(mode === "add" ? `Added ${value} × ${variant || "card"}.` : "Updated.");
    } catch {
      setNote("That did not work — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(
        `/api/collection?cardId=${cardId}&variant=${encodeURIComponent(variant)}`,
        { method: "DELETE" },
      );
      if (r.status === 401) {
        window.location.href = `/login?next=/kaart/${cardId}`;
        return;
      }
      if (!r.ok) throw new Error("failed");
      setOwned((prev) => {
        const next = { ...prev };
        delete next[variant];
        return next;
      });
      setNote("Removed from your collection.");
    } catch {
      setNote("That did not work — try again.");
    } finally {
      setBusy(false);
    }
  }

  const inCollection = owned[variant] ?? 0;
  const totalOwned = Object.values(owned).reduce((a, b) => a + b, 0);
  const select =
    "rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-[13px] text-fg outline-none focus:border-poke-red/70";

  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">My collection</h3>
        {status === "ready" && totalOwned > 0 && (
          <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-fg">
            {totalOwned} owned
          </span>
        )}
      </div>

      {status === "anon" ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[13px] text-muted">
            Sign in to mark the cards you own and see what your collection is worth.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              prefetch={false}
              href={`/login?next=/kaart/${cardId}`}
              className="rounded-lg bg-poke-red px-3 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              prefetch={false}
              href={`/login?mode=register&next=/kaart/${cardId}`}
              className="rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-fg transition hover:bg-raised"
            >
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {variants.length > 1 && (
            <label className="flex flex-col gap-1 text-[12px] text-muted">
              Print
              <select value={variant} onChange={(e) => setVariant(e.target.value)} className={select}>
                {variants.map((v) => (
                  <option key={v.v} value={v.v}>
                    {v.v} — {money(v.mkt)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[12px] text-muted">
              Copies
              <input
                type="number"
                min={1}
                max={999}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                className={`${select} w-20`}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => mutate("add", qty)}
              className="rounded-lg bg-poke-red px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "I own this"}
            </button>
            {inCollection > 0 && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => mutate("set", Math.max(0, inCollection - 1))}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-[13px] text-fg transition hover:bg-raised disabled:opacity-60"
                >
                  −1
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-[13px] text-muted transition hover:bg-raised hover:text-fg disabled:opacity-60"
                >
                  Remove
                </button>
              </>
            )}
          </div>

          <p className="text-[12px] text-muted">
            {inCollection > 0
              ? `You own ${inCollection} × ${variant || "this print"}.`
              : "Not in your collection yet."}{" "}
            {totalOwned > 0 && (
              <Link prefetch={false} href="/account" className="underline hover:text-fg">
                View my collection
              </Link>
            )}
          </p>
          {note && <p className="text-[12px] text-poke-gold">{note}</p>}
        </div>
      )}
    </div>
  );
}
