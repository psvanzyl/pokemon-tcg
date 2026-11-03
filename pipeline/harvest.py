#!/usr/bin/env python3
"""Harvest the full TCGplayer Pokemon catalogue (TCGCSV daily dumps).

Category 3 = Pokemon. For every group: products + prices -> data/raw/<groupId>.json.gz
Polite: 2 req/s, retries, resumable (skips existing files unless --force).
"""
import gzip
import json
import os
import sys
import time
import urllib.request

# The project home holds data/ (raw dumps + published artefacts). Every pipeline
# script resolves it through CARDDEX_HOME so the scripts work from any directory
# and there is exactly one place that knows where the project lives.
HOME = os.environ.get("CARDDEX_HOME", "/root/projects/pokemon-tcg")

BASE = "https://tcgcsv.com/tcgplayer"
# Category 3 = Pokemon (English), category 85 = Pokemon Japan. Both are needed:
# Japanese-only starter decks and promos never appear in the English category.
CATS = [3, 85]
OUT = os.path.join(HOME, "data", "raw")
LOG = os.path.join(HOME, "data", "harvest.log")
UA = {"User-Agent": "pokemon-tcg-index/0.1 (homelab personal project)"}


def log(msg):
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as fh:
        fh.write(line + "\n")


def get(path, tries=4):
    url = f"{BASE}/{path}"
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"failed {url}: {last}")


def main():
    force = "--force" in sys.argv
    # A dump older than this is re-fetched. TCGCSV publishes once a day, so a
    # file from today is fresh; without this the daily cron would skip every
    # group forever and the site would keep serving the first harvest's prices.
    max_age_h = 20.0
    if "--max-age" in sys.argv:
        max_age_h = float(sys.argv[sys.argv.index("--max-age") + 1])
    os.makedirs(OUT, exist_ok=True)
    cats = CATS
    if "--cat" in sys.argv:
        cats = [int(x) for x in sys.argv[sys.argv.index("--cat") + 1].split(",")]
    only_group = None
    if "--group" in sys.argv:
        only_group = int(sys.argv[sys.argv.index("--group") + 1])
    total_groups = 0
    total_singles = 0
    for cat in cats:
        groups = get(f"{cat}/groups")["results"]
        if only_group:
            groups = [g for g in groups if g["groupId"] == only_group]
        total_groups += len(groups)
        log(f"harvest start category {cat}: {len(groups)} groups (max-age {max_age_h}h, force={force})")
        done = 0
        skipped = 0
        singles = 0
        for g in groups:
            gid = g["groupId"]
            path = os.path.join(OUT, f"{gid}.json.gz")
            if os.path.exists(path) and not force:
                age_h = (time.time() - os.path.getmtime(path)) / 3600.0
                if age_h < max_age_h:
                    skipped += 1
                    continue
            try:
                products = get(f"{cat}/{gid}/products")
                prices = get(f"{cat}/{gid}/prices")
            except Exception as e:  # noqa: BLE001
                log(f"ERROR group {gid} {g['name']}: {e}")
                continue
            payload = {"group": g, "products": products.get("results", []),
                       "prices": prices.get("results", [])}
            with gzip.open(path, "wt", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
            n_single = sum(
                1 for p in payload["products"]
                if any(e.get("name") == "Number" for e in (p.get("extendedData") or []))
            )
            singles += n_single
            done += 1
            log(f"[{done}/{len(groups)}] cat {cat} {gid} {g['name']}: {len(payload['products'])} products, {n_single} singles (cum singles {singles})")
            time.sleep(0.5)
        total_singles += singles
        log(f"harvest done category {cat}: {done}/{len(groups)} groups, {singles} singles")
    log(f"harvest done: {total_groups} groups, {total_singles} singles")


if __name__ == "__main__":
    main()
