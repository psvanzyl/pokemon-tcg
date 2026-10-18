#!/usr/bin/env python3
"""
Merge the TCGdex multilingual card content and Cardmarket EUR prices into Carddex's
own catalogue artefacts. Runs after normalize.py in the daily refresh.

Inputs (all produced earlier in the chain):
  data/cards.json.gz          our catalogue, keyed by TCGplayer productId (normalize.py)
  data/tcgdex_content.json.gz multilingual card content      (ingest_tcgdex.py)
  data/tcgdex_crosswalk.json.gz  tcgplayer/cm product -> tcgdex id
  data/tcgdex_sets.json.gz    set metadata incl. per-language set names
  data/cardmarket/eur.json.gz Cardmarket public price guide  (fetch_cardmarket.py)

Outputs:
  data/cards.json.gz          + "t" (stable language-independent card id) per card
  data/content.json.gz        per-card: localised names/attacks/effects/flavour,
                              per-language card scans, EUR price families, dexId, illustrator
  data/sets.json              + per-language set names
  data/stats.json             + language / price-coverage facts the UI and /about quote

Joining strategy, strongest first (each match is recorded so the report can prove it):
  1. the card's own TCGplayer productId -> TCGdex thirdParty.tcgplayer (exact);
  2. our set's TCGplayer groupId -> TCGdex set, then set + card number, accepted only
     when the card name matches after accent/punctuation folding (guards against a set
     reusing a number for a different card);
  3. otherwise the card keeps no multilingual identity and the page stays English-only.
"""
from __future__ import annotations

import gzip
import json
import os
import re
import sys
import unicodedata
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

LANGS = ["en", "fr", "de", "es", "it", "pt"]
LANG_ORDER = {l: i for i, l in enumerate(LANGS)}

METRIC_RE = re.compile(r"^(avg1|avg7|avg30|avg|low|trend)(?:-(.+))?$")


def read_gz(name: str):
    path = os.path.join(DATA, name)
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        return json.load(fh)


def write_gz(name: str, obj) -> int:
    path = os.path.join(DATA, name)
    with gzip.open(path, "wt", encoding="utf-8", compresslevel=9) as fh:
        json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def read_json(name: str):
    with open(os.path.join(DATA, name), encoding="utf-8") as fh:
        return json.load(fh)


def write_json(name: str, obj) -> int:
    path = os.path.join(DATA, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1)
    return os.path.getsize(path)


def fold(s: str) -> str:
    """Accent/punctuation-insensitive comparison key."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", s)


def local_of(num: str) -> str:
    """'043/102' -> '043'; 'TG01/TG30' -> 'TG01'; 'SWSH001' -> 'SWSH001'."""
    return (num or "").split("/")[0].strip()


LOCAL_RE = re.compile(r"^([A-Za-z]*)(\d+)([A-Za-z]*)$")


def local_keys(raw: str) -> set[str]:
    """Every equivalent spelling of a card number: '082'/'82', '050b'/'50b', 'TG01'/'TG1'."""
    s = (raw or "").strip().lower()
    if not s:
        return set()
    keys = {s}
    m = LOCAL_RE.match(s)
    if m:
        pre, num, suf = m.groups()
        keys.add(f"{pre}{int(num)}{suf}")
    return keys


def eur_families(fields: dict) -> dict:
    """Group Cardmarket's flat price fields into families:
    standard (no suffix), holo, reverse-holo, 1st-edition ..."""
    out: dict[str, dict] = {}
    for key, value in fields.items():
        m = METRIC_RE.match(key)
        if not m:
            continue
        metric, family = m.group(1), m.group(2) or "standard"
        out.setdefault(family, {})[metric] = value
    return out


def main() -> int:
    cards = read_gz("cards.json.gz")
    content = read_gz("tcgdex_content.json.gz")
    crosswalk = read_gz("tcgdex_crosswalk.json.gz")
    tcgdex_sets = read_gz("tcgdex_sets.json.gz")
    cm = read_gz(os.path.join("cardmarket", "eur.json.gz"))
    sets = read_json("sets.json")
    set_name_by_id = {s.get("id"): s.get("name") for s in sets}

    tp2tid = crosswalk.get("tp", {})
    cm_prices = cm.get("prices", {})

    # our TCGplayer groupId -> tcgdex set id (from the set's own thirdParty ref)
    gid2set = {}
    for sid, s in tcgdex_sets.items():
        tp = s.get("tcgplayer")
        if isinstance(tp, int):
            gid2set.setdefault(str(tp), sid)

    # fallback set resolution by name, for the TCGplayer groupings TCGdex publishes as
    # their own set ("Shining Fates: Shiny Vault" -> swsh4.5sv, "Generations: Radiant
    # Collection" -> rc) and by official abbreviation.
    tcg_by_name = {}
    tcg_by_abbr = {}
    for sid, s in tcgdex_sets.items():
        en = (s.get("name") or {}).get("en")
        if en:
            tcg_by_name.setdefault(fold(en), sid)
        ab = s.get("abbr")
        if ab:
            tcg_by_abbr.setdefault(fold(ab), sid)

    # (tcgdex set, normalised localId) -> tid. TCGplayer zero-pads ("082/130") where
    # TCGdex does not ("82"), and suffixes differ ("050b" vs "50b"), so both sides are
    # indexed under every equivalent spelling.
    bysetnum = {}
    for tid, c in content.items():
        for key in local_keys(c.get("l")):
            bysetnum.setdefault((c.get("s"), key), tid)

    def name_ok(ours: str, theirs: str) -> bool:
        """TCGplayer decorates names ('Electivire LV.X', 'Nidoran F', 'Kabuto [W Stamped]')
        where TCGdex keeps the printed name ('Electivire', 'Nidoran♀'). Accept an exact
        folded match, or a prefix relationship long enough not to merge distinct species
        ('mew' is a prefix of 'mewtwo' - 3 characters, rejected)."""
        a, b = fold(ours), fold(theirs)
        if not a or not b:
            return False
        if a == b:
            return True
        short, long_ = (a, b) if len(a) <= len(b) else (b, a)
        return len(short) >= 5 and long_.startswith(short)

    def set_candidates(card) -> list[str]:
        out = []
        gid = str(card.get("set"))
        if gid in gid2set:
            out.append(gid2set[gid])
        name = card.get("setName") or set_name_by_id.get(card.get("set")) or ""
        for probe in (name, name.split(":")[-1] if ":" in name else ""):
            sid = tcg_by_name.get(fold(probe))
            if sid and sid not in out:
                out.append(sid)
        return out

    how = Counter()
    tid_use = Counter()
    referenced = set()
    reject_sample = []
    nomatch_sample = []

    for card in cards:
        card.pop("t", None)  # idempotent re-runs: identity is recomputed, never inherited
        tid = tp2tid.get(str(card["id"]))
        method = "tcgplayer-product"
        if not tid:
            method = "no-set-map"
            for sid in set_candidates(card):
                cand = None
                for key in local_keys(local_of(card.get("num", ""))):
                    cand = bysetnum.get((sid, key))
                    if cand:
                        break
                if not cand:
                    continue
                c = content[cand]
                if name_ok(card.get("n", ""), c.get("n", {}).get("en", "")):
                    tid = cand
                    method = "set-name" if sid != gid2set.get(str(card.get("set"))) else "set+number+name"
                    break
                method = "rejected:name-mismatch"
                if len(reject_sample) < 25:
                    reject_sample.append({
                        "set": card.get("set"), "num": card.get("num"),
                        "ours": card.get("n"),
                        "candidate": c.get("n", {}).get("en"),
                        "tid": cand,
                    })
        if tid:
            referenced.add(tid)
            sid = content[tid].get("s")
            card["t"] = tid
            tid_use[sid[:2]] += 1
        elif method.startswith("no-set") and len(nomatch_sample) < 15:
            nomatch_sample.append({"set": card.get("set"), "num": card.get("num"),
                                   "ours": card.get("n"),
                                   "setName": set_name_by_id.get(card.get("set"))})
        how[method] += 1

    # ---- content artefact: only what our catalogue can actually reach
    #
    # Name aliases live here, NOT in cards.json.gz, so the catalogue payload stays lean:
    # the browser searches English client-side and asks /api/lookup for the other five.
    out_content = {}
    eur_cards = 0
    lang_have = Counter()
    for tid in referenced:
        c = content[tid]
        rec = {
            "n": c.get("n", {}),
        }
        for k_src, k_dst in (("a", "a"), ("ab", "ab"), ("de", "de"), ("ev", "ev")):
            if c.get(k_src):
                rec[k_dst] = c[k_src]
        for k in ("d", "r", "i", "c", "hp", "st", "sf", "rm", "rt", "ty"):
            if c.get(k) is not None:
                rec[k] = c[k]
        if c.get("v"):
            rec["v"] = c["v"]
        asset = c.get("_asset")
        if asset:
            serie, sid, lid = asset
            rec["imgs"] = {
                lang: f"https://assets.tcgdex.net/{lang}/{serie}/{sid}/{lid}"
                for lang in LANGS
                if lang in c.get("n", {})
            }
        rec["s"] = c.get("s")
        rec["l"] = c.get("l")
        # EUR: prefer the variant that carries a Cardmarket id, else any ref
        cm_id = None
        for v in c.get("v", []):
            if v.get("cm"):
                cm_id = v["cm"]
                break
        if cm_id is not None:
            rec["cm"] = cm_id
            fields = cm_prices.get(str(cm_id))
            if fields:
                fams = eur_families(fields)
                if fams:
                    rec["eur"] = fams
                    eur_cards += 1
        out_content[tid] = rec
        for lang in LANGS:
            if lang in c.get("n", {}):
                lang_have[lang] += 1

    # ---- set names per language
    sid_of_group = gid2set
    sets_localised = 0
    for s in sets:
        sid = sid_of_group.get(str(s.get("id")))
        meta = tcgdex_sets.get(sid) if sid else None
        if meta and meta.get("name"):
            names = {k: v for k, v in meta["name"].items() if k != "en" and v}
            if names:
                s["names"] = names
                sets_localised += 1

    # ---- stats
    stats = read_json("stats.json")
    priced_usd = sum(1 for c in cards if c.get("px") is not None)
    # Two different denominators, both honest and both quoted in the UI:
    #   identityCards  -> our catalogue *products* that carry a language-independent id
    #   languageNames  -> unique TCGdex cards that carry a name in that language
    identity_cards = sum(1 for c in cards if c.get("t"))
    cards_fr = sum(1 for c in cards if c.get("t") and "fr" in content[c["t"]].get("n", {}))
    cards_de = sum(1 for c in cards if c.get("t") and "de" in content[c["t"]].get("n", {}))
    cards_es = sum(1 for c in cards if c.get("t") and "es" in content[c["t"]].get("n", {}))
    cards_it = sum(1 for c in cards if c.get("t") and "it" in content[c["t"]].get("n", {}))
    cards_pt = sum(1 for c in cards if c.get("t") and "pt" in content[c["t"]].get("n", {}))
    species = {content[t].get("d") for t in referenced if content[t].get("d")}
    cm_id_count = sum(1 for c in out_content.values() if c.get("cm"))
    stats.update({
        "languages": [l for l in LANGS if lang_have[l]],
        "languageNames": {l: lang_have[l] for l in LANGS},
        "languageCards": {"fr": cards_fr, "de": cards_de, "es": cards_es,
                          "it": cards_it, "pt": cards_pt},
        "identityCards": identity_cards,
        "identityCoverage": round(100 * identity_cards / max(1, len(cards)), 1),
        "species": len(species),
        "eurPriced": eur_cards,
        "eurProducts": cm_id_count,
        "eurCoverage": round(100 * eur_cards / max(1, len(referenced)), 1),
        "usdPriced": priced_usd,
        "eurSource": "Cardmarket public price guide (product-level, not per language)",
        "eurUpdated": cm.get("updated"),
        "eurPriceDay": cm.get("priceDay"),
        "cardContentSource": "TCGdex cards-database (MIT)",
    })
    stats.pop("multilingualCards", None)
    stats.pop("multilingualFr", None)
    stats.pop("multilingualDe", None)
    if "pricesUpdated" not in stats:
        stats["pricesUpdated"] = stats.get("snapshot")

    sizes = {
        "cards.json.gz": write_gz("cards.json.gz", cards),
        "content.json.gz": write_gz("content.json.gz", out_content),
        "sets.json": write_json("sets.json", sets),
        "stats.json": write_json("stats.json", stats),
    }

    print(json.dumps({
        "cards": len(cards),
        "matched_to_tcgdex": len(referenced),
        "joinMethods": dict(how),
        "contentRecords": len(out_content),
        "perLanguageContent": {l: lang_have[l] for l in LANGS},
        "eurPriced": eur_cards,
        "setsLocalised": sets_localised,
        "species": len(species),
        "sizes": sizes,
        "rejectSample": reject_sample[:12],
        "noMatchSample": nomatch_sample,
    }, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
