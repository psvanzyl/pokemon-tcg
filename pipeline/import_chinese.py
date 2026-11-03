#!/usr/bin/env python3
"""Append an unpriced Chinese layer to the Carddex catalogue.

TCGplayer has no Chinese Pokemon category, so these cards cannot be priced
from the same source as the English and Japanese layers. They are therefore
separate records (not aliases of English cards) with a stable synthetic id in
a reserved range, a `zh` language tag and a `zhid` TCGdex id.

The import is idempotent: every run removes the previous `zh` cards and sets
before it appends the current TCGdex data. Run it after merge_multilingual.py
and before build_history.py in the daily refresh.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import os
import urllib.request

ROOT = os.environ.get("CARDDEX_HOME", "/root/projects/pokemon-tcg")
DATA = os.path.join(ROOT, "data")
LANGS = {"zh-cn": 86, "zh-tw": 87}
SET_BASE = 700_000_000
CARD_BASE = 800_000_000
RESERVE = 100_000_000


def get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "carddex/1.0"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode())


def digest(value: str) -> int:
    return int(hashlib.sha1(value.encode("utf-8")).hexdigest()[:8], 16)


def synth(prefix: str, base: int, used: set[int]) -> int:
    n = base + digest(prefix) % RESERVE
    while n in used:
        n += 1
        if n >= base + RESERVE:
            n = base
    used.add(n)
    return n


def main() -> None:
    cards_path = os.path.join(DATA, "cards.json.gz")
    sets_path = os.path.join(DATA, "sets.json")
    stats_path = os.path.join(DATA, "stats.json")

    with gzip.open(cards_path, "rt", encoding="utf-8") as fh:
        cards = json.load(fh)
    with open(sets_path, encoding="utf-8") as fh:
        sets = json.load(fh)

    cards = [c for c in cards if not c.get("zh")]
    sets = [s for s in sets if not s.get("zh")]
    used_sets = {int(s["id"]) for s in sets}
    used_cards = {int(c["id"]) for c in cards}

    new_sets: list[dict] = []
    new_cards: list[dict] = []

    for lang, cat in LANGS.items():
        tsets = get(f"https://api.tcgdex.net/v2/{lang}/sets")
        tcards = get(f"https://api.tcgdex.net/v2/{lang}/cards")
        set_by_id = {s["id"]: s for s in tsets}

        counts: dict[str, int] = {}
        for c in tcards:
            sid = str(c["id"]).rsplit("-", 1)[0]
            counts[sid] = counts.get(sid, 0) + 1

        id_map: dict[str, int] = {}
        for sid, s in set_by_id.items():
            if not counts.get(sid):
                continue
            nid = synth(f"set:{lang}:{sid}", SET_BASE, used_sets)
            id_map[sid] = nid
            count = s.get("cardCount") or {}
            total = count.get("official") or count.get("total") or counts[sid]
            new_sets.append({
                "id": nid,
                "name": s.get("name") or sid,
                "abbr": sid.upper(),
                "released": s.get("releaseDate") or "",
                "supplemental": False,
                "cards": total,
                "cat": cat,
                "zh": lang,
            })

        for c in tcards:
            sid = str(c["id"]).rsplit("-", 1)[0]
            nid = id_map.get(sid)
            if nid is None:
                continue
            count = set_by_id.get(sid, {}).get("cardCount") or {}
            total = count.get("official") or count.get("total") or counts.get(sid, 0)
            num = str(c.get("localId") or "")
            if total:
                num = f"{num}/{total}"
            img = c.get("image")
            if img:
                if not str(img).endswith((".png", ".jpg", ".jpeg", ".webp")):
                    img = f"{img}/high.png"
            else:
                img = "/card-back.svg"
            new_cards.append({
                "id": synth(f"card:{lang}:{c['id']}", CARD_BASE, used_cards),
                "n": c.get("name") or "",
                "set": nid,
                "num": num,
                "rar": None,
                "typ": None,
                "hp": None,
                "stg": None,
                "img": img,
                "url": "",
                "px": None,
                "pv": [],
                "cat": cat,
                "zh": lang,
                "zhid": c["id"],
            })

    cards.extend(new_cards)
    sets.extend(new_sets)

    with gzip.open(cards_path, "wt", encoding="utf-8") as fh:
        json.dump(cards, fh, ensure_ascii=False, separators=(",", ":"))
    with open(sets_path, "w", encoding="utf-8") as fh:
        json.dump(sets, fh, ensure_ascii=False, separators=(",", ":"))

    with open(stats_path, encoding="utf-8") as fh:
        stats = json.load(fh)
    stats["cards"] = len(cards)
    stats["sets"] = len(sets)
    stats["priced"] = sum(1 for c in cards if c.get("px") is not None)
    stats["unpriced"] = stats["cards"] - stats["priced"]
    stats["dupeIds"] = len(cards) - len({c["id"] for c in cards})
    stats["chineseCards"] = {
        "zh-cn": sum(1 for c in cards if c.get("zh") == "zh-cn"),
        "zh-tw": sum(1 for c in cards if c.get("zh") == "zh-tw"),
    }
    with open(stats_path, "w", encoding="utf-8") as fh:
        json.dump(stats, fh, ensure_ascii=False, indent=1)

    print(
        f"chinese layer: {len(new_cards)} cards, {len(new_sets)} sets; "
        f"catalogue {len(cards)} cards / {len(sets)} sets"
    )


if __name__ == "__main__":
    main()
