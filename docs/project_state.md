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

## Branding & theming (2026-10-17)
- **Mark:** `src/components/PokeBall.tsx` — an inline SVG of a Poké Ball seen from the
  front: red upper hemisphere (`#e3342f`), white lower hemisphere, black equator
  (`#111114`), black outline, centre button, gloss highlight. Fixed colours on purpose —
  the ball is red/white/black in both themes. Used in the header; the same artwork ships
  as the favicon (`src/app/favicon.ico`, drawn by `ops/favicon_gen.py` with PIL — the
  script is the source of truth, re-run it after changing the mark) and as
  `src/app/icon.svg`. Site name stays **Carddex**.
- **Light is the default; dark and system are opt-in.** The choice lives in
  `localStorage["carddex-theme"]` = `light | dark | system`. An inline script in
  `layout.tsx` (first child of `<body>`, runs before first paint) toggles `.dark` on
  `<html>`; no stored value → light. `src/components/ThemeToggle.tsx` renders the
  three-way Sun/Moon/Monitor control in the header and re-paints on
  `prefers-color-scheme` changes while the mode is `system`.
- **Tailwind 4 theming contract:** `@custom-variant dark (&:where(.dark, .dark *))` plus a
  semantic surface scale declared in `@theme` (light) and overridden in `html.dark`:
  `canvas` (page), `surface` (recessed fills: table heads, image wells, notices),
  `panel` (cards/panels/buttons), `raised` (hover, active pills, skeletons), `field`
  (form controls), `line` / `line-strong` (borders), `fg` / `muted` (text), `scrim`
  (modal backdrop), `poke-red` / `poke-gold` / `poke-blue` (accents, contrast-tuned per
  theme: gold is `#9a6b06` on white, `#f5c518` on black).
  **Consequence: components never need a `dark:` variant for their base look** — the
  token flips. The old `ink-950…600` / `slate-fg` names are gone; do not reintroduce
  them. The only `dark:` variants left are in `CardTile.tsx`'s `RARITY_TONE` map (Tailwind
  palette chips need a light tone *and* a dark tone) and the up/down colour in
  `PriceChart.tsx`.
- Dark values are the palette the site originally shipped with, so dark is a
  regression-free no-op; light is the new work.

## QA — verified 2026-10-17
- **`npx playwright test` from `app/`: 18/18 green against a local production build**
  (desktop + Pixel 7 projects). 14 catalogue smoke tests plus 4 new ones in
  `e2e/theme.spec.ts` (default is light · light→dark→system cycle · persistence across
  reload · OS preference honoured in `system` · the mark's three hemisphere fills).
- **`node ops/qa-theme.mjs` (against `next start -p 3001`): 29/29 checks passed** —
  default-light, toggle, persistence, `system` following an emulated OS preference, body
  background actually resolving to `rgb(255,255,255)` in light and `rgb(7,10,16)` in
  dark, zero uncaught JS errors, zero horizontal overflow on all four routes at 1440 px
  and 390 px in both themes.
- Screenshots captured for `/`, `/sets`, `/about`, `/kaart/84198` at 1440 px and 390 px,
  both themes, plus header/toggle close-ups and the mobile filter drawer, and reviewed by
  eye: cards, rarity chips, gold prices, tables, chart and the drawer backdrop all read
  correctly in light mode; dark is unchanged.
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
  Playwright on CT141 (`ops/shots.mjs`, `ops/qa-theme.mjs`) is the reliable way to capture
  page images.
- A stale `next start` on port 3001 from an earlier session will silently serve the *old*
  build (the symptom is `/icon.svg` 404). Kill it before QA: `ss -ltnp | grep :3001`.

## Open items
1. **Domain: decided — the site stays on `pokemon.laserraptorai.duckdns.org`.** knuck.eu is
   deliberately NOT being coupled (boss's call, 2026-10-17). No DNS change, no extra domain,
   no further work here. Do not re-raise it.
2. Optional: make the GitHub repo private (needs a new Coolify deploy key on the repo).
3. Optional: price history holds one snapshot; the chart fills in as the daily cron runs.
4. `app/ops/shots.mjs` is the Playwright screenshot helper — keep it for page captures when
   the browser tool's screenshot IPC wedges. `app/ops/qa-theme.mjs` is the theme/logo
   regression harness (behaviour + screenshots); run it after any token or layout change.
