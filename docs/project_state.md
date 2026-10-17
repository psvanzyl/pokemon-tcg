# pokemon-tcg ("Carddex") — project state

**Status: LIVE** — https://pokemon.laserraptorai.duckdns.org (Coolify on CT310)
**Last updated:** 2026-10-17
**Canonical copy:** `/root/projects/pokemon-tcg/project_state.md` on CT141. A copy is
committed to the app repo as `docs/project_state.md` so it survives disk loss.

## What it is
A public, free catalogue of every English Pokémon TCG single with current market
prices. Searchable, filterable, sortable. No paywall, no account.
Dataset: **28,056 singles · 213 sets · 27,667 priced**.

## Where everything lives
| Thing | Location |
|---|---|
| Project home | CT141 `192.168.178.20` → `/root/projects/pokemon-tcg` |
| App source | `.../app` (Next 16 + React 19 + Tailwind 4, standalone Docker) |
| Pipeline | `.../scripts/` — harvest.py, normalize.py, build_history.py, refresh.sh, seed_volume.sh |
| Raw dumps | `.../data/raw/` — 220 gzipped TCGCSV group files |
| Published artefacts | `data/{cards.json.gz,sets.json,stats.json,history.jsonl,history.json.gz}` |
| Repo | https://github.com/psvanzyl/pokemon-tcg (public, branch main) |
| Coolify app | uuid `dpjl3npkr7pxq4xkcwu78tio`, project `8rit1jscgztegqxaivwsdgkr`, env `xrhqqxbxdxxbpny8zbwtdoqh` |
| Coolify server | `hff16ilrvechplni0w97qy2t` = CT310 `192.168.178.132` |
| Data volume | docker volume `dpjl3npkr7pxq4xkcwu78tio-pokemon-data` → `/app/data`; staged via host dir `/data/coolify/pokemon-data` |
| Daily refresh | CT141 crontab **04:20** → `scripts/refresh.sh >> data/refresh.log 2>&1` |

## Architecture facts (hard-won)
- **Data source: TCGCSV** (`https://tcgcsv.com/tcgplayer/3/{groups,<gid>/products,<gid>/prices}`).
  Category 3 = Pokémon. Free, no key. `/3/products` is 404 — must iterate per group.
  `api.pokemontcg.io` is dead (HTTP 200, empty body) — do not revisit.
- **A product is a card only when `extendedData` contains `Number`** — that is what
  excludes sealed product. Sets are emitted only `if n_cards`, so sealed-only groups
  create no empty facets (220 groups → **213 sets**).
- **harvest.py must not skip on file existence alone.** It skips a group only when its
  dump is newer than `--max-age` (default 20 h); TCGCSV publishes once a day, so a
  daily run re-fetches everything and an ad-hoc run is cheap. With a plain
  "file exists → skip" rule the cron would have refreshed *nothing*, forever.
- Prices: USD only, per print variant (low/mid/high/market). Images hotlinked from
  `https://tcgplayer-cdn.tcgplayer.com/product/<id>_200w.jpg` (also `_400w`, `_in_1000x1000`).
- **`src/lib/data.ts` caches parsed JSON in module scope** → after a data refresh the
  container MUST be restarted. That is why refresh.sh restarts it.
- Data resolution order: `POKEMON_DATA_DIR` → `/app/data` (volume) → `public/data`
  (baked-in fallback), checked per file with `existsSync`, so an empty volume degrades cleanly.
- **Price provenance:** normalize.py picks the cheapest variant price, falling back to
  `mid` when TCGplayer reports no market price. The card page labels the field it
  actually used ("Mid price (USD)" + a note) rather than always saying "market".
- **Set dates:** `released` comes from TCGCSV `publishedOn`, which is the real release
  date for most sets but only the group-add date for 19 promotional groups (all dated
  2026-10-16). The sets page marks any date shared by ≥5 sets as unknown ("—") and sorts
  those last, so bulk-import dates cannot masquerade as the newest sets.
- Coolify API: **the domain field is `domains`, not `fqdn`** (`fqdn` → "This field is not
  allowed"). Storage API on this version accepts only `type: persistent`; `bind` is
  rejected, hence the host-dir → volume copy in seed_volume.sh.
- Coolify git key `private_key_id 86` is scoped to zvg-markt and
  `/api/v1/security/keys` returns HTTP 500 here → the repo is **public** so Coolify can
  clone it anonymously. (Open question: make it private + add a proper deploy key.)
- Deploy: `POST /api/v1/deploy {"uuid": "<app>"}` → poll `GET /api/v1/deployments/<uuid>`
  until `finished` (~60–80 s).

## Routes
- `/` catalogue (client component over `/api/cards`), `/kaart/[id]` card detail (Dutch
  segment), `/sets`, `/about`.
- APIs: `/api/cards` (pre-gzipped catalogue), `/api/sets`, `/api/history/[id]`.

## QA — verified 2026-10-17
- **`npx playwright test` from `app/`: 14/14 green against the live URL** (desktop +
  Pixel 7 projects), `BASE_URL=https://pokemon.laserraptorai.duckdns.org`.
- Screenshots captured for `/`, `/sets`, `/about`, `/kaart/84198` at 1440 px and 390 px
  and reviewed: no overflow, no placeholder text, real data, contrast fine.
- Search verified: charizard → 205, "charizard star" → 16 (correct card first).
- Refresh pipeline run end-to-end: harvest → normalize → history → publish to the volume
  → container restart → live `/api/sets` 200.
- Test gotcha: the catalogue renders a loading state before data arrives — poll
  `[data-testid="result-count"]` instead of reading it immediately.

## Gotchas for the next session
- **`rsync a/sets/page.tsx a/about/page.tsx dest/` copies both files to `dest/page.tsx`.**
  That overwrote the catalogue home page and shipped a broken site for one deploy. Always
  rsync one file per destination path, or mirror whole directories.
- The Hermes browser tool's screenshot IPC can wedge on the 28k-tile catalogue page;
  Playwright on CT141 (`shots.mjs`) is the reliable way to capture page images.

## Open items
1. **Domain: decided — the site stays on `pokemon.laserraptorai.duckdns.org`.** knuck.eu is
   deliberately NOT being coupled (boss's call, 2026-10-17). No DNS change, no extra domain,
   no further work here. Do not re-raise it.
2. Optional: make the GitHub repo private (needs a new Coolify deploy key on the repo).
3. Optional: price history holds one snapshot; the chart fills in as the daily cron runs.
4. `app/ops/shots.mjs` is the Playwright screenshot helper — keep it for page captures when
   the browser tool's screenshot IPC wedges.
