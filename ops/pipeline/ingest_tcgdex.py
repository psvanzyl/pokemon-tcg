#!/usr/bin/env python3
"""
Ingest the self-hosted TCGdex card database (MIT, github.com/tcgdex/cards-database,
cloned to data/tcgdex-source) into Carddex's own compact multilingual artefacts.

Why local source and not the TCGdex API:
  * no rate limits, no third-party uptime dependency, no 22k-request crawl of a
    community API (which would be rude);
  * the repo is the same data the API serves, including thirdParty cross-refs.

Layout it reads (data/ == tcgdex-source/data):
  <Serie>.ts                      series:  {id, name{langs}, ...}
  <Serie>/<Set>.ts                set:     {id, name{langs}, serie, releaseDate,
                                            abbreviations, thirdParty{cardmarket,tcgplayer}}
  <Serie>/<Set>/<localId>.ts      card:    {name{langs}, dexId, rarity, illustrator,
                                            attacks[], abilities[], evolveFrom{}, variants[]}

Outputs (in the project data dir):
  tcgdex_content.json.gz    tid -> multilingual card content (names, attacks, effects,
                            flavour text, evolveFrom, per-language image urls)
  tcgdex_crosswalk.json.gz  tcgplayer productId (str) -> tid, and cm id -> tid
  tcgdex_sets.json.gz       tid-prefix(set id) -> per-language set names + release date
  tcgdex_report.json        parse stats / coverage, written so the refresh can assert on it
"""
from __future__ import annotations

import gzip
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "tcgdex-source", "data")
OUT = os.path.join(ROOT, "data")

LANGS = ["en", "fr", "de", "es", "it", "pt"]

# Pokémon TCG Pocket is the mobile game: its cards are not paper singles, carry no
# TCGplayer/Cardmarket product and use a different file shape. Out of scope by design.
EXCLUDE_SERIES = {"Pokémon TCG Pocket"}

# ---------------------------------------------------------------- TS object parser
TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
  | (?P<line_comment>//[^\n]*)
  | (?P<block_comment>/\*.*?\*/)
  | (?P<string>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')
  | (?P<template>`(?:[^`\\]|\\.)*`)
  | (?P<number>-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)
  | (?P<ident>[A-Za-z_$][A-Za-z0-9_$]*)
  | (?P<punct>[{}\[\]:,])
    """,
    re.S | re.X,
)


def tokenize(text: str):
    pos = 0
    n = len(text)
    while pos < n:
        m = TOKEN_RE.match(text, pos)
        if not m:
            raise ValueError(f"unexpected character {text[pos]!r} at {pos}")
        pos = m.end()
        kind = m.lastgroup
        if kind in ("ws", "line_comment", "block_comment"):
            continue
        yield kind, m.group()


class Parser:
    def __init__(self, text: str):
        self.toks = list(tokenize(text))
        self.i = 0

    def peek(self):
        return self.toks[self.i] if self.i < len(self.toks) else (None, None)

    def next(self):
        t = self.peek()
        self.i += 1
        return t

    def parse_value(self):
        kind, val = self.next()
        if kind == "punct":
            if val == "{":
                return self.parse_object()
            if val == "[":
                return self.parse_array()
            raise ValueError(f"unexpected punct {val!r}")
        if kind == "string" or kind == "template":
            return unquote(val)
        if kind == "number":
            return float(val) if ("." in val or "e" in val or "E" in val) else int(val)
        if kind == "ident":
            if val == "true":
                return True
            if val == "false":
                return False
            if val == "null" or val == "undefined":
                return None
            # bare identifier (a reference such as `Set` / `serie`)
            return {"__ref__": val}
        raise ValueError(f"unexpected token {kind}:{val!r}")

    def parse_object(self):
        out = {}
        while True:
            kind, val = self.peek()
            if kind is None:
                raise ValueError("unterminated object")
            if kind == "punct" and val == "}":
                self.next()
                return out
            if kind == "punct" and val == ",":
                self.next()
                continue
            if kind != "ident" and kind != "string":
                raise ValueError(f"bad key {kind}:{val!r}")
            self.next()
            key = unquote(val) if kind == "string" else val
            kind2, val2 = self.next()
            if not (kind2 == "punct" and val2 == ":"):
                raise ValueError(f"expected ':' after key {key!r}, got {kind2}:{val2!r}")
            out[key] = self.parse_value()

    def parse_array(self):
        out = []
        while True:
            kind, val = self.peek()
            if kind is None:
                raise ValueError("unterminated array")
            if kind == "punct" and val == "]":
                self.next()
                return out
            if kind == "punct" and val == ",":
                self.next()
                continue
            out.append(self.parse_value())


def unquote(s: str) -> str:
    if s.startswith("`"):
        return s[1:-1]
    body = s[1:-1]
    return (
        body.replace("\\n", "\n")
        .replace("\\t", "\t")
        .replace('\\"', '"')
        .replace("\\'", "'")
        .replace("\\\\", "\\")
    )


def parse_file(path: str):
    """Parse a `const x: T = { ... }` TS data file into a python object."""
    text = open(path, encoding="utf-8").read()
    start = text.find("=")
    # the declaration may have `as const` etc; take the first object/array literal after '='
    lit = min(
        (i for i in (text.find("{", start), text.find("[", start)) if i != -1),
        default=-1,
    )
    if lit == -1:
        raise ValueError("no object literal")
    p = Parser(text[lit:])
    return p.parse_value()


def lang_map(value):
    """Normalise a {en:..,fr:..} map, tolerating missing languages and refs."""
    if not isinstance(value, dict):
        return None
    out = {}
    for k in LANGS:
        v = value.get(k)
        if isinstance(v, str) and v.strip():
            out[k] = v
    return out or None


def third_party(value):
    if not isinstance(value, dict):
        return None, None
    cm = value.get("cardmarket")
    tp = value.get("tcgplayer")
    cm = cm if isinstance(cm, int) else None
    tp = tp if isinstance(tp, int) else None
    return cm, tp


def main() -> int:
    if not os.path.isdir(SRC):
        print(f"!! TCGdex source missing at {SRC}", file=sys.stderr)
        return 2

    series = {}   # serie directory name -> {id, name{langs}}
    sets = {}     # (serie dir, set name) -> set record
    content = {}  # tid -> content
    tp_to_tid = {}   # tcgplayer productId -> tid
    cm_to_tid = {}   # cardmarket productId -> tid
    stats = Counter()
    failures = []

    # ---- series + sets
    for entry in sorted(os.listdir(SRC)):
        if not entry.endswith(".ts") or entry[:-3] in EXCLUDE_SERIES:
            continue
        try:
            d = parse_file(os.path.join(SRC, entry))
        except Exception as exc:  # noqa: BLE001 - report, do not abort a 24k-file run
            failures.append((entry, str(exc)))
            continue
        series[entry[:-3]] = {"id": d.get("id"), "name": lang_map(d.get("name"))}

    for serie_dir in sorted(os.listdir(SRC)):
        p = os.path.join(SRC, serie_dir)
        if not os.path.isdir(p) or serie_dir in EXCLUDE_SERIES:
            continue
        for entry in sorted(os.listdir(p)):
            if not entry.endswith(".ts"):
                continue
            try:
                d = parse_file(os.path.join(p, entry))
            except Exception as exc:  # noqa: BLE001
                failures.append((f"{serie_dir}/{entry}", str(exc)))
                continue
            sid = d.get("id")
            if not isinstance(sid, str):
                continue
            cm, tp = third_party(d.get("thirdParty") or {})
            sets[(serie_dir, entry[:-3])] = {
                "id": sid,
                "name": lang_map(d.get("name")) or {},
                "serie": (series.get(serie_dir) or {}).get("id"),
                "releaseDate": d.get("releaseDate"),
                "abbr": (d.get("abbreviations") or {}).get("official"),
                "cardmarket": cm,
                "tcgplayer": tp,
            }

    # ---- cards
    set_names = defaultdict(dict)
    for (serie_dir, set_name), s in sets.items():
        set_names[s["id"]] = {
            "name": s["name"],
            "serie": s["serie"],
            "releaseDate": s["releaseDate"],
            "abbr": s["abbr"],
            "cardmarket": s["cardmarket"],
            "tcgplayer": s["tcgplayer"],
        }

    for serie_dir in sorted(os.listdir(SRC)):
        p = os.path.join(SRC, serie_dir)
        if not os.path.isdir(p) or serie_dir in EXCLUDE_SERIES:
            continue
        for set_name in sorted(os.listdir(p)):
            dpath = os.path.join(p, set_name)
            if not os.path.isdir(dpath):
                continue
            s = sets.get((serie_dir, set_name))
            if not s:
                stats["sets_without_metadata"] += 1
                continue
            sid = s["id"]
            for entry in sorted(os.listdir(dpath)):
                if not entry.endswith(".ts"):
                    continue
                local_id = entry[:-3]
                try:
                    c = parse_file(os.path.join(dpath, entry))
                except Exception as exc:  # noqa: BLE001
                    failures.append((f"{serie_dir}/{set_name}/{entry}", str(exc)))
                    continue
                tid = f"{sid}-{local_id}"
                rec = {}
                names = lang_map(c.get("name"))
                if not names:
                    stats["cards_without_name"] += 1
                    continue
                rec["n"] = names
                stats[f"name_{','.join(sorted(names))}"] += 1
                dex = c.get("dexId")
                if isinstance(dex, list) and dex:
                    d0 = dex[0]
                    rec["d"] = d0 if isinstance(d0, int) else None
                for src_key, dst_key in (("rarity", "r"), ("illustrator", "i"),
                                         ("category", "c"), ("hp", "hp"),
                                         ("stage", "st"), ("suffix", "sf"),
                                         ("regulationMark", "rm"), ("energyType", "et"),
                                         ("retreat", "rt"), ("evolveFrom", "ev")):
                    v = c.get(src_key)
                    if src_key == "evolveFrom":
                        lm = lang_map(v)
                        if lm:
                            rec["ev"] = lm
                        continue
                    if isinstance(v, (str, int, float)):
                        rec[dst_key] = v
                ty = c.get("types")
                if isinstance(ty, list) and ty:
                    rec["ty"] = [x for x in ty if isinstance(x, str)]
                desc = lang_map(c.get("description"))
                if desc:
                    rec["de"] = desc
                # attacks + abilities (name/effect/damage/cost, fully localised)
                for src_key, dst_key in (("attacks", "a"), ("abilities", "ab")):
                    items = c.get(src_key)
                    if not isinstance(items, list):
                        continue
                    out_items = []
                    for it in items:
                        if not isinstance(it, dict):
                            continue
                        o = {}
                        nm = lang_map(it.get("name"))
                        if nm:
                            o["n"] = nm
                        ef = lang_map(it.get("effect"))
                        if ef:
                            o["e"] = ef
                        cost = it.get("cost")
                        if isinstance(cost, list) and cost:
                            o["c"] = [x for x in cost if isinstance(x, str)]
                        dmg = it.get("damage")
                        if isinstance(dmg, (str, int, float)):
                            o["d"] = dmg
                        if o:
                            out_items.append(o)
                    if out_items:
                        rec[dst_key] = out_items
                # variants + third-party cross-refs
                variants = c.get("variants")
                vlist = []
                if isinstance(variants, list):
                    for v in variants:
                        if not isinstance(v, dict):
                            continue
                        cm, tp = third_party(v.get("thirdParty") or {})
                        vlist.append({"t": v.get("type"), "cm": cm, "tp": tp})
                        if tp:
                            tp_to_tid.setdefault(str(tp), tid)
                        if cm:
                            cm_to_tid.setdefault(str(cm), tid)
                if vlist:
                    rec["v"] = vlist
                # per-language card scans (assets.tcgdex.net/<lang>/<serie>/<set>/<localId>)
                if s.get("serie"):
                    rec["_asset"] = [s["serie"], sid, local_id]
                rec["s"] = sid
                rec["l"] = local_id
                content[tid] = rec
                stats["cards"] += 1
                stats[f"cards_{sid[:2]}"] += 0

    # ---- write artefacts
    os.makedirs(OUT, exist_ok=True)

    def write_gz(name, obj):
        path = os.path.join(OUT, name)
        with gzip.open(path, "wt", encoding="utf-8", compresslevel=9) as fh:
            json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))
        return path, os.path.getsize(path)

    p1, s1 = write_gz("tcgdex_content.json.gz", content)
    p2, s2 = write_gz("tcgdex_crosswalk.json.gz",
                      {"tp": tp_to_tid, "cm": cm_to_tid})
    p3, s3 = write_gz("tcgdex_sets.json.gz", dict(set_names))

    lang_counts = {}
    for lang in LANGS:
        lang_counts[lang] = sum(1 for c in content.values() if lang in c.get("n", {}))
    with_price_ref = sum(1 for c in content.values()
                         if any(v.get("tp") or v.get("cm") for v in c.get("v", [])))
    attack_langs = {}
    for lang in LANGS:
        attack_langs[lang] = sum(
            1 for c in content.values()
            if any(lang in a.get("n", {}) for a in c.get("a", []))
        )

    report = {
        "source": "github.com/tcgdex/cards-database (MIT), cloned to data/tcgdex-source",
        "cards": len(content),
        "sets": len(set_names),
        "series": len(series),
        "per_language_names": lang_counts,
        "per_language_attacks": attack_langs,
        "cards_with_thirdparty_ref": with_price_ref,
        "tcgplayer_crossrefs": len(tp_to_tid),
        "cardmarket_crossrefs": len(cm_to_tid),
        "parse_failures": len(failures),
        "failure_sample": failures[:20],
        "artefacts": {os.path.basename(p): s for p, s in ((p1, s1), (p2, s2), (p3, s3))},
    }
    with open(os.path.join(OUT, "tcgdex_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)

    print(json.dumps({k: v for k, v in report.items() if k != "failure_sample"},
                     ensure_ascii=False, indent=1))
    if failures:
        print("failure sample:", failures[:5], file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
