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

BASE = "https://tcgcsv.com/tcgplayer"
CAT = 3
OUT = "/root/projects/pokemon-tcg/data/raw"
LOG = "/root/projects/pokemon-tcg/data/harvest.log"
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
    os.makedirs(OUT, exist_ok=True)
    groups = get(f"{CAT}/groups")["results"]
    log(f"harvest start: {len(groups)} groups")
    done = 0
    singles = 0
    for g in groups:
        gid = g["groupId"]
        path = os.path.join(OUT, f"{gid}.json.gz")
        if os.path.exists(path) and not force:
            done += 1
            continue
        try:
            products = get(f"{CAT}/{gid}/products")
            prices = get(f"{CAT}/{gid}/prices")
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
        log(f"[{done}/{len(groups)}] {gid} {g['name']}: {len(payload['products'])} products, {n_single} singles (cum singles {singles})")
        time.sleep(0.5)
    log(f"harvest done: {done}/{len(groups)} groups, {singles} singles")


if __name__ == "__main__":
    main()
