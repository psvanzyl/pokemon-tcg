#!/usr/bin/env python3
"""
Fetch Cardmarket's public product catalogue + daily price guide (EUR).

Cardmarket publishes both as free, unauthenticated downloads — no API key, no
scraping, no rate limit:

  https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_<game>.json
  https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_<game>.json

game 6 == Pokémon singles. (Verified: 74,706 single products, each with an
idProduct that is exactly the id TCGdex exposes as thirdParty.cardmarket.)

What this gives Carddex that TCGplayer/TCGCSV does not:
  * a EUR price reference, which is what EU collectors actually trade at;
  * a second, independent source, so a page can show both and label which is which;
  * a daily snapshot we keep ourselves -> EUR price history over time.

Honest limitation, measured and documented, not papered over: Cardmarket prices are
per *product*, not per language or condition. A Cardmarket product covers all western
printings of a card, so this cannot express "the French copy is worth less than the
English one" — that lives in Cardmarket's per-listing data, which is not public.

Outputs:
  data/cardmarket/raw/*.json.gz   verbatim downloads (audit trail, re-parseable)
  data/cardmarket/eur.json.gz     {updated, prices{cmId:{...}}, products{cmId:{n,e,d}}}
  data/cardmarket/history.jsonl   one line per cmId per day, appended (our own history)
"""
from __future__ import annotations

import gzip
import json
import os
import sys
import urllib.request
from datetime import date, datetime, timezone

HOME = os.environ.get("CARDDEX_HOME", "/root/projects/pokemon-tcg")
# The project home holds data/ (raw dumps + published artefacts). Every pipeline
# script resolves it through CARDDEX_HOME so the scripts work from any directory
# and there is exactly one place that knows where the project lives.
OUT = os.path.join(HOME, "data", "cardmarket")
RAW = os.path.join(OUT, "raw")
GAME = 6  # Pokémon
BASE = "https://downloads.s3.cardmarket.com/productCatalog"
URLS = {
    "products": f"{BASE}/productList/products_singles_{GAME}.json",
    "prices": f"{BASE}/priceGuide/price_guide_{GAME}.json",
}
UA = "Carddex/1.0 (+https://pokemon.laserraptorai.duckdns.org; personal non-commercial price index)"


def download(name: str) -> dict:
    os.makedirs(RAW, exist_ok=True)
    url = URLS[name]
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        raw = r.read()
    # keep a verbatim copy so a parsing bug never means re-downloading history
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = os.path.join(RAW, f"{name}_{stamp}.json.gz")
    if not os.path.exists(path):
        with gzip.open(path, "wb") as fh:
            fh.write(raw)
    return json.loads(raw)


def numeric_fields(obj: dict) -> dict:
    """Keep only the price fields, dropping nulls. Cardmarket emits both plain and
    holo/reverse-holo/foil families; keep them all, they are what the UI shows."""
    out = {}
    for k, v in obj.items():
        if k == "idProduct":
            continue
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            out[k] = v
    return out


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    print("== downloading Cardmarket catalogue + price guide (public, no auth)")
    products_raw = download("products")
    prices_raw = download("prices")

    # The files are {"version","createdAt","products"|"priceGuides":[...]}. createdAt is
    # Cardmarket's own price date (02:54 CET), which is the honest timestamp to quote.
    price_day = prices_raw.get("createdAt") or products_raw.get("createdAt")

    prices = {}
    for p in prices_raw.get("priceGuides", []):
        pid = p.get("idProduct")
        if pid is None:
            continue
        fields = numeric_fields(p)
        if fields:
            prices[str(pid)] = fields

    products = {}
    for p in products_raw.get("products", []):
        pid = p.get("idProduct")
        if pid is None:
            continue
        products[str(pid)] = {
            "n": p.get("name"),
            "e": p.get("idExpansion"),
            "d": p.get("dateAdded"),
        }

    updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "updated": updated,
        "priceDay": price_day,
        "source": URLS["prices"],
        "listSource": URLS["products"],
        "currency": "EUR",
        "prices": prices,
        "products": products,
    }
    with gzip.open(os.path.join(OUT, "eur.json.gz"), "wt", encoding="utf-8",
                   compresslevel=9) as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))

    # our own daily EUR history: Cardmarket only ever serves *today*, so the only way
    # to have a EUR time series is to start recording it now.
    today = date.today().isoformat()
    line = {
        "date": today,
        "prices": {pid: p.get("avg") for pid, p in prices.items() if p.get("avg") is not None},
    }
    with gzip.open(os.path.join(OUT, f"history_{today}.json.gz"), "wt",
                   encoding="utf-8", compresslevel=9) as fh:
        json.dump(line, fh, ensure_ascii=False, separators=(",", ":"))

    report = {
        "updated": updated,
        "priceDay": price_day,
        "products": len(products),
        "priceEntries": len(prices),
        "avgPresent": sum(1 for p in prices.values() if p.get("avg") is not None),
        "trendPresent": sum(1 for p in prices.values() if p.get("trend") is not None),
        "holoPresent": sum(1 for p in prices.values() if p.get("avg-holo") is not None),
        "rawFiles": {
            f: os.path.getsize(os.path.join(RAW, f)) for f in sorted(os.listdir(RAW))
        },
        "artefactBytes": os.path.getsize(os.path.join(OUT, "eur.json.gz")),
    }
    with open(os.path.join(OUT, "report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(json.dumps(report, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
