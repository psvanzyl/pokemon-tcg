#!/usr/bin/env python3
"""Turn data/history.jsonl (one snapshot per day) into data/history.json.gz.

Shape: {"dates": ["2026-10-17", ...], "series": {"<productId>": [price, ...]}}
Series are left-padded with nulls so every array lines up with `dates`.
"""
import gzip
import json
import os

ROOT = "/root/projects/pokemon-tcg"
SRC = os.path.join(ROOT, "data/history.jsonl")
OUT = os.path.join(ROOT, "data/history.json.gz")


def main():
    if not os.path.exists(SRC):
        print("no history.jsonl yet — skipping")
        return
    rows = []
    with open(SRC) as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    rows.sort(key=lambda r: r["date"])
    rows = rows[-365:]  # keep a year
    dates = [r["date"] for r in rows]

    series: dict[str, list] = {}
    for i, r in enumerate(rows):
        for pid, px in r["prices"].items():
            arr = series.setdefault(pid, [None] * len(dates))
            arr[i] = px

    # trim leading nulls per series so the chart starts at the first real point
    for pid, arr in series.items():
        first = next((i for i, v in enumerate(arr) if v is not None), None)
        if first:
            series[pid] = arr[first:]

    payload = {"dates": dates, "series": series}
    with gzip.open(OUT, "wt", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print(
        f"history.json.gz: {len(dates)} snapshots, {len(series)} series, "
        f"{os.path.getsize(OUT)/1e6:.2f} MB"
    )


if __name__ == "__main__":
    main()
