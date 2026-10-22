#!/usr/bin/env python3
"""Normalise the raw TCGCSV harvest into the site dataset.

Input : data/raw/*.json.gz  (products + prices per Pokemon group)
Output: data/cards.json.gz  (all singles, compact)
        data/sets.json      (set metadata for the UI)
        data/stats.json     (counts, snapshot date, price coverage)
Only real singles are kept: a product counts as a card when its extendedData
carries a "Number" (Card Number). Sealed product has no card number.
"""
import gzip
import glob
import json
import os
import re
import sys
import time

HOME = os.environ.get("CARDDEX_HOME", "/root/projects/pokemon-tcg")
# The project home holds data/ (raw dumps + published artefacts). Every pipeline
# script resolves it through CARDDEX_HOME so the scripts work from any directory
# and there is exactly one place that knows where the project lives.
RAW = os.path.join(HOME, "data/raw")
OUT_CARDS = os.path.join(HOME, "data/cards.json.gz")
OUT_SETS = os.path.join(HOME, "data/sets.json")
OUT_STATS = os.path.join(HOME, "data/stats.json")
HIST = os.path.join(HOME, "data/history.jsonl")

PRICE_KEYS = ("marketPrice", "midPrice", "lowPrice", "highPrice")


def ed_map(product):
    return {e.get("name"): e.get("value") for e in (product.get("extendedData") or [])}


def clean(s):
    if s is None:
        return None
    s = re.sub(r"<br\s*/?>", " ", str(s))
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s or None


def num(v):
    try:
        f = float(v)
        return round(f, 2)
    except (TypeError, ValueError):
        return None


def main():
    files = sorted(glob.glob(os.path.join(RAW, "*.json.gz")))
    if not files:
        sys.exit("no raw files")
    cards = []
    sets = []
    seen_ids = {}
    for path in files:
        with gzip.open(path, "rt", encoding="utf-8") as fh:
            blob = json.load(fh)
        group = blob["group"]
        gid = group["groupId"]
        products = blob["products"]
        prices_by_id = {}
        for pr in blob["prices"]:
            prices_by_id.setdefault(pr["productId"], []).append(pr)
        n_cards = 0
        for p in products:
            em = ed_map(p)
            number = clean(em.get("Number"))
            if not number:
                continue  # sealed product / accessory
            pid = p["productId"]
            variants = []
            for pr in prices_by_id.get(pid, []):
                v = {
                    "v": pr.get("subTypeName") or "Normal",
                    "low": num(pr.get("lowPrice")),
                    "mid": num(pr.get("midPrice")),
                    "high": num(pr.get("highPrice")),
                    "mkt": num(pr.get("marketPrice")),
                }
                if any(v[k] is not None for k in ("low", "mid", "high", "mkt")):
                    variants.append(v)
            variants.sort(key=lambda v: (v["mkt"] is None, v["mkt"] or 0))
            # Market price or nothing. TCGplayer's mid/low/high are estimates of its own and for
            # some cards they are wildly off (a promo Eevee carries a mid of $100,000), so using one
            # of them as the card's price invents a value. A card with no market price ships
            # unpriced and the UI says so.
            cheapest = None
            for v in variants:
                if v["mkt"] is None:
                    continue
                cheapest = v["mkt"] if cheapest is None else min(cheapest, v["mkt"])
            card = {
                "id": pid,
                "n": clean(p.get("name")) or p["name"],
                "set": gid,
                "num": number,
                "rar": clean(em.get("Rarity")),
                "typ": clean(em.get("Card Type")),
                "hp": clean(em.get("HP")),
                "stg": clean(em.get("Stage")),
                "img": p.get("imageUrl"),
                "url": p.get("url"),
                "px": cheapest,
                "pv": variants,
            }
            if not card["img"]:
                card["img"] = f"https://tcgplayer-cdn.tcgplayer.com/product/{pid}_200w.jpg"
            cards.append(card)
            n_cards += 1
            seen_ids.setdefault(pid, []).append(gid)
        # Only sets that actually hold singles: a group with 0 cards is a
        # sealed-product-only group and would show up as an empty facet.
        if n_cards:
            sets.append({
                "id": gid,
                "name": group["name"],
                "abbr": group.get("abbreviation") or "",
                "released": (group.get("publishedOn") or "")[:10] or None,
                "supplemental": bool(group.get("isSupplemental")),
                "cards": n_cards,
            })
        print(f"  {gid:>6} {group['name'][:44]:<46} {n_cards:>5} cards", flush=True)

    dupes = {k: v for k, v in seen_ids.items() if len(v) > 1}
    cards.sort(key=lambda c: (c["set"], c["n"].lower()))
    sets.sort(key=lambda s: (s["released"] or "0000-00-00"), reverse=True)

    with gzip.open(OUT_CARDS, "wt", encoding="utf-8") as fh:
        json.dump(cards, fh, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_SETS, "w", encoding="utf-8") as fh:
        json.dump(sets, fh, ensure_ascii=False, separators=(",", ":"))

    priced = sum(1 for c in cards if c["px"] is not None)
    stats = {
        "snapshot": time.strftime("%Y-%m-%d"),
        "snapshotTs": int(time.time()),
        "cards": len(cards),
        "sets": len(sets),
        "priced": priced,
        "unpriced": len(cards) - priced,
        "dupeIds": len(dupes),
        "rarities": len({c["rar"] for c in cards if c["rar"]}),
        "types": len({c["typ"] for c in cards if c["typ"]}),
        "source": "tcgcsv.com (TCGplayer daily dumps)",
        "currency": "USD",
    }
    with open(OUT_STATS, "w", encoding="utf-8") as fh:
        json.dump(stats, fh, indent=2)

    # append a daily snapshot for price history (idempotent per day)
    today = stats["snapshot"]
    existing = set()
    if os.path.exists(HIST):
        with open(HIST) as fh:
            for line in fh:
                try:
                    existing.add(json.loads(line)["date"])
                except Exception:  # noqa: BLE001
                    pass
    if today not in existing:
        row = {"date": today, "prices": {str(c["id"]): c["px"] for c in cards if c["px"] is not None}}
        with open(HIST, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
        print(f"history: appended snapshot {today} ({len(row['prices'])} priced cards)")
    else:
        print(f"history: snapshot {today} already present, skipped")

    print(json.dumps(stats, indent=2))
    print(f"cards.json.gz: {os.path.getsize(OUT_CARDS)/1e6:.2f} MB")
    if dupes:
        print(f"WARN duplicate productIds across sets: {len(dupes)}")


if __name__ == "__main__":
    main()
