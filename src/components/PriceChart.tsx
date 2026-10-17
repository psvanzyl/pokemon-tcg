"use client";

import { useEffect, useState } from "react";

type Hist = { dates: string[]; values: number[] };

export default function PriceChart({ id, start }: { id: number; start: string }) {
  const [hist, setHist] = useState<Hist | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/history/${id}`)
      .then((r) => r.json())
      .then((j: Hist) => {
        if (alive) setHist(j);
      })
      .catch(() => {
        if (alive) setHist({ dates: [], values: [] });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!hist) {
    return <div className="h-[120px] animate-pulse rounded-lg border border-line bg-surface" />;
  }

  if (hist.values.length < 2) {
    return (
      <div className="rounded-lg border border-line bg-surface p-3 text-[13px] text-muted">
        Price history starts here. The index takes a daily snapshot of every card, so
        this chart fills in from <span className="text-fg">{start}</span> onward —
        check back in a few days for a trend line.
      </div>
    );
  }

  const vals = hist.values;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const W = 520;
  const H = 120;
  const step = W / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, H - ((v - min) / span) * (H - 16) - 8]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const first = vals[0];
  const last = vals[vals.length - 1];
  const change = first ? ((last - first) / first) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between text-[12px]">
        <span className="text-muted">
          {hist.dates[0]} → {hist.dates[hist.dates.length - 1]} · {vals.length} snapshots
        </span>
        <span
          className={`tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-poke-red"}`}
        >
          {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ee3b3b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ee3b3b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pg)" />
        <path d={line} fill="none" stroke="#ee3b3b" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
        <span>low ${min.toFixed(2)}</span>
        <span>high ${max.toFixed(2)}</span>
      </div>
    </div>
  );
}
