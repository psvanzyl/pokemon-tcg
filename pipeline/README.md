# pipeline/ — the Carddex catalogue pipeline

The single, version-controlled home of the data pipeline that feeds the live site.

| file | what it does |
| --- | --- |
| `refresh.sh` | the whole daily run: harvest → normalise → identity/EUR → history → publish → reload → commit |
| `seed_volume.sh` | copies the published artefacts into the Coolify docker volume the app mounts |
| `harvest.py` | pulls the raw TCGCSV group dumps into `data/raw/` |
| `normalize.py` | turns the raw dumps into `cards.json.gz`, `sets.json`, `stats.json` and the history ledger |
| `ingest_tcgdex.py` | reads the self-hosted TCGdex clone for the language-independent card identity and the six print languages |
| `fetch_cardmarket.py` | Cardmarket's free daily download → EUR prices |
| `merge_multilingual.py` | merges identity + EUR into `cards.json.gz` and writes `content.json.gz` |
| `build_history.py` | appends today's snapshot to the history ledger and writes `history.json.gz` |

## Where things live

- **This directory is the only copy.** The cron entry runs
  `/root/projects/pokemon-tcg/app/pipeline/refresh.sh` directly.
- `/root/projects/pokemon-tcg/scripts` is a **symlink to this directory**, so the
  older `scripts/…` paths still work but can never drift from the version in git.
  That drift is not hypothetical: the runtime copy of `refresh.sh` was missing the
  whole multilingual layer for weeks, so the daily job silently stopped refreshing
  `content.json.gz` and the EUR prices.
- The project home (`/root/projects/pokemon-tcg`) holds `data/` — the raw dumps and
  the published artefacts. It is **not** a git repository.

## The path convention

Every script resolves the project home the same way:

```python
HOME = os.environ.get("CARDDEX_HOME", "/root/projects/pokemon-tcg")
```

`CARDDEX_HOME` exists so the scripts can be pointed at a scratch copy for testing.
Do not reintroduce `dirname(dirname(__file__))`: the copies that lived in
`app/ops/pipeline/` silently resolved their project home to `app/ops/` and would
have written their output into the wrong tree.

## The daily run

```bash
/root/projects/pokemon-tcg/app/pipeline/refresh.sh
```

It is idempotent and takes a `flock`, so a manual run cannot collide with the
04:20 cron run. The last step commits and pushes `public/data/`, which keeps the
catalogue baked into the Docker image in step with what the live volume serves.
Only `public/data/` is ever staged — nothing else in the working tree can ride
along in that commit.
