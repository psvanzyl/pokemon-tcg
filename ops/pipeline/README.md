# Multilingual pipeline

The three scripts behind `/about#languages`: the language-independent card identity, the six
print languages, and the EUR price guide.

    ingest_tcgdex.py      TCGdex (MIT, git clone) -> tcgdex_content.json.gz, tcgdex_crosswalk.json.gz
    fetch_cardmarket.py   Cardmarket's free public catalog + price guide -> cardmarket/eur.json.gz
    merge_multilingual.py joins both onto the catalogue -> cards.json.gz (+ "t" identity),
                          content.json.gz, sets.json (per-language set names), stats.json

Run order matters: ingest, then fetch, then merge. `../refresh.sh` runs all three daily and
publishes the artefacts to the Coolify volume.

Canonical runtime copies live in `/root/projects/pokemon-tcg/scripts/` on dev CT141 — that is
where `refresh.sh` loads them from, next to harvest.py / normalize.py / build_history.py.
These copies are the versioned record: when you edit one, copy it back.
