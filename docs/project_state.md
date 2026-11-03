# pokemon-tcg ("Carddex") — project state

**Status: LIVE** — https://pokemon.laserraptorai.duckdns.org (Coolify on CT310)
**Last updated:** 2026-11-03
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
| Pipeline | `app/pipeline/` (in git) — harvest.py, normalize.py, build_history.py, ingest_tcgdex.py, fetch_cardmarket.py, merge_multilingual.py, refresh.sh, seed_volume.sh |
| Raw dumps | `.../data/raw/` — 220 gzipped TCGCSV group files |
| Published artefacts | `data/{cards.json.gz,sets.json,stats.json,history.jsonl,history.json.gz}` |
| Repo | https://github.com/psvanzyl/pokemon-tcg (public, branch main) |
| Coolify app | uuid `dpjl3npkr7pxq4xkcwu78tio`, project `8rit1jscgztegqxaivwsdgkr`, env `xrhqqxbxdxxbpny8zbwtdoqh` |
| Coolify server | `hff16ilrvechplni0w97qy2t` = CT310 `192.168.178.132` |
| Data volume | docker volume `dpjl3npkr7pxq4xkcwu78tio-pokemon-data` → `/app/data`; staged via host dir `/data/coolify/pokemon-data` |
| Daily refresh | CT141 crontab **04:20** → `app/pipeline/refresh.sh >> data/refresh.log 2>&1` |

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

## Recent changes (2026-11-03)
- Catalogue cards now show collection +/- controls when signed in: add one (+), remove one (-), owned count (xN). Grid and list views. Backed by /api/collection.

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
- **`node ops/qa-live.mjs` against the deployed site: 9/9 checks passed** (base URL comes
  from `BASE`, defaults to the live domain): light is the default even when the OS prefers
  dark, the white/near-black body background resolves from the tokens, the Poké Ball mark
  is visible, dark applies and survives a reload, zero JS errors, and the mobile `/sets`
  table has no overflow and no wrapped date cell.
- **Sets-table fix:** hyphenated dates are breakable, so the Released column's min-content
  width was the width of `202` — at 390 px the cell wrapped to `202` / `16`. Released, Code
  and Cards are now `whitespace-nowrap` and the table min-width went 640 → 760 px, so the
  container scrolls instead of squeezing a column below its content.
  `node ops/qa-mobile.mjs` guards it (line boxes per cell via a `Range`, plus overflow).
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

## Prefetch storm and page caching (2026-10-18, commit c68bb63)

**Why:** CrowdSec's `http-crawl-non_statics` banned the owner's own WAN IP twice (alerts 709 on
10-17, 779 on 10-18, 59 events) after `?_rsc=` bursts on `/kaart/<id>`. The bouncer drops those
packets silently, so the site looked like it hung and then recovered — a firewall decision
masquerading as a performance bug.

**Evidence:** in the Traefik tail, `pokemon.laserraptorai.duckdns.org` served 470 requests of
which **338 were `?_rsc=`** (72%); the 05:00Z hour produced 74 of them against rugby-cards' 1
after its own fix. Cause: every `<Link>` prefetched its RSC payload, `page.tsx` and
`kaart/[id]/page.tsx` were `force-dynamic`, and `layout.tsx` forced the whole subtree dynamic.

**Fix:** `prefetch={false}` on all 11 `<Link>` sites; new `src/app/robots.ts` (disallow
`/*?_rsc=`, `/api/`, `/data/`, card pages stay indexable); `/kaart/[id]` `force-dynamic` →
`revalidate 600` + `generateStaticParams` (10 ids — declaring it is what makes a dynamic segment
cache-eligible in Next 16, so all 28,056 cards cache on demand instead of shipping tens of
thousands of HTML files); `/`, `/sets`, `/about` → `revalidate 600`; dropped the layout's
`force-dynamic`. Freshness is unaffected by any of this: `data.ts` parses the JSON once per
process, so the data only changes when `refresh.sh` restarts the container anyway.

**Verified on the live deploy (c68bb63):** `/`, `/sets`, `/about` `x-nextjs-cache: HIT`, 30–80 ms;
`/kaart/481893` cold MISS 0.74 s → HIT 0.038 s (local run: MISS 0.18 s → HIT 0.003 s, still HIT
after a restart); unknown id 404; `?_rsc=` URLs still return 200 so client navigation is intact;
`/robots.txt` served. Browser: **0 `?_rsc` requests on landing, while scrolling and on hover, and
exactly 1 per click** (was 30–40). `ops/qa-live.mjs` 9/9 and `ops/qa-mobile.mjs` 6/6 against the
deployed URL; desktop 1440 + mobile 390 screenshots clean, no overflow. Deploy took ~120 s and the
`/app/data` volume survived (stats snapshot 2026-10-17, 28,056 cards).

## Open items
1. **Domain: decided — the site stays on `pokemon.laserraptorai.duckdns.org`.** knuck.eu is
   deliberately NOT being coupled (boss's call, 2026-10-17). No DNS change, no extra domain,
   no further work here. Do not re-raise it.
2. Optional: make the GitHub repo private (needs a new Coolify deploy key on the repo).
3. Optional: price history holds one snapshot; the chart fills in as the daily cron runs.
4. `app/ops/shots.mjs` is the Playwright screenshot helper — keep it for page captures when
   the browser tool's screenshot IPC wedges. `app/ops/qa-theme.mjs` is the theme/logo
   regression harness (behaviour + screenshots); `app/ops/qa-live.mjs` runs the same
   behavioural checks against a deployed URL; `app/ops/qa-mobile.mjs` guards the narrow
   viewport (390 px) layout. Run them after any token, layout or table change.
5. Housekeeping: a `next start` preview of this app sits on CT141 port 3001 and one of
   rugby-cards on 3101, both launched by hand. Production is Coolify — these are only for
   local QA, so they are safe to kill when the ports are needed. **Killed 2026-10-18**
   (a stale preview silently serves the pre-fix build, which is how a QA pass can lie).
6. **FIXED 2026-10-18 (commit `a419f63`): never price a card off an estimate.** `normalize.py`
   fell back to TCGplayer's `mid` whenever a print had no market price, so **126 cards** shipped
   a headline price that no market price justified — worst case `Eevee - 143/191 (GYM)` at
   $100,000.00 (a mid; TCGplayer reports no market price for it at all). Now `px` is the cheapest
   **market** price across the prints, or null, and an unpriced card says so everywhere: card-page
   headline ("Market price (USD) / Not reported" plus a note), metadata description, the
   schema.org offer (omitted), tiles and set rollups. `marketPrice()` in `lib/format.ts` derives
   the figure from the print variants, so the UI cannot be lied to by a stale published `px`
   again. The 126 ids live in `data/fabricated_price_ids.json` and their 252 fabricated points
   were stripped from `data/history.jsonl` (both days that carried them).
   Low/Mid/High stay in `PriceTable` as TCGplayer's own labelled, greyed estimates, but only for a
   print that also carries a market price; where TCGplayer reports no price the cells are blank —
   the Eevee's three all read $100,000.00, an estimate sitting on the page looking like a price.
   **Verified live:** 507 cards in the explicit "no market price" bucket (`stats.json` →
   `unpriced`) and the dearest card in the whole catalogue is a real one (`Mewtwo Star`, $9,200.00).
7. Follow-up when the account feature lands: `api/cards/search/route.ts` ranks hits by `b.px - a.px`,
   which NaN-orders the 507 unpriced cards — make the comparison null-safe (they sort last).

## Competitive landscape & positioning (2026-10-18)
Research on the question "how does Carddex differentiate itself?" plus the French-card
request (Caninos de Hisui). **Full detail: `app/docs/competitive-landscape-2026-10-18.md`.**
Headlines:
- FR card identity verified: `Caninos de Hisui` = Hisuian Growlithe = Hisui-Fukano, one
  TCGdex id `swsh10-070` (Cardmarket 658659 / TCGplayer 272271), with per-language names
  AND per-language card scans.
- "Multilingual" is already table stakes (Tcggraph, TCG CollectWorld, Eyevo, Listrune);
  the free French incumbent is **Pokecardex** — Carddex shipping French content risks
  reading as a knockoff. Differentiation must be the free language-agnostic *identity*
  layer, EUR+USD with provenance, and the open dataset/API — not "we have French too".
- **Hard limit measured: TCGdex Cardmarket prices are per product, NOT per language**
  (identical EUR for en/fr/de/it/es). The "French copy is cheaper than English" premium is
  Cardmarket listing-level data we do not have. FR price coverage ~51% of printings.
- Print languages in TCGdex: EN 23,770 / FR 22,155 / DE 20,483 / **NL 0**.
  Crosswalk test: FR `thirdParty.tcgplayer` ids resolved into our 28,056-card dataset 78/78.
- Open decision for boss: positioning (identity layer first?), and whether the open free
  API/dataset becomes part of the public pitch.

## 2026-10-18 — visual QA pass + catalogue fixes (commit e5db2a0)

Deployed live after the multilingual layer:

    https://pokemon.laserraptorai.duckdns.org   (Coolify uuid dpjl3npkr7pxq4xkcwu78tio)

### QA'd on the live site (screenshots, desktop 1400px + mobile 390x844)

| surface | result |
|---|---|
| `/kaart/272271?lang=fr` desktop + mobile | French scan (assets.tcgdex.net/fr/…/low|high.webp), French H1 "Caninos de Hisui", localised breadcrumb "Astres Radieux", French attack/effect text, PRINTED IN row with FR active, USD + EUR tables with the product-level provenance line. No overflow at 390px. |
| `/kaart/272271` (EN) | English scan, "Also printed as FR/DE/ES/IT/PT …", USD (Normal $0.20 / Reverse Holofoil $0.33) + EUR (Non-holo €0.05 / Holo €0.21), price-history chart renders, snapshot 2026-10-18. |
| catalogue fallback, FR query | "Nothing in English matches “Dracaufeu” — showing 111 cards matched by the Français printed name (closest: Dracaufeu)" + per-tile FR chip. English typing still finds nothing/fallback only on empty result, ≥3 chars. |
| home hero | "The card, not the English card" (was still "The complete English Pokémon card index"). |
| `/about` | worked example box (six printed names), coverage 23,071/28,056 = 82.2% with the remainder explained, data provenance (TCGdex MIT, TCGplayer via TCGCSV, Cardmarket public downloads). |

### Two defects found by QA, fixed, redeployed in e5db2a0

1. **Hero contradicted the product.** `src/app/page.tsx` still sold "the complete *English* Pokémon card index" while the header, footer and the entire multilingual layer said otherwise. Rewritten to the approved positioning and naming the six print languages.
2. **Fallback hits wore a French badge over an English scan.** `/api/lookup` returned only names, so a tile badged "FR Caninos de Hisui" rendered the TCGplayer English art — the exact confusion the identity layer exists to remove. `searchLocalised()` now returns `img` (`imgs[lang]` base from `content.json.gz` + `/low.webp`) and `Catalogue.tsx` uses it for alt tiles in both grid and list views.

Both verified live afterwards; the tiles now show `assets.tcgdex.net/fr/…`.

### Housekeeping / warnings

- **The working tree is shared and dirty.** An **untracked accounts/collection feature** lives in `app/src/` (`app/login`, `app/account`, `app/api/{auth,collection,cards/search}`, `lib/{auth,accounts}.ts`, `AccountClient/AccountMenu/CollectionAddButton/GoogleSignInButton/LoginForm.tsx` — ~600+ lines). It is NOT in GitHub `main` (hence live `/login` and `/account` return 404) and it was deliberately **excluded** from this deploy. A `next-server` dev process from this same tree is listening on **:3009**. Never `git add -A` in this repo — commit named files only.
- Prices remain **product-level**: both marketplaces publish one figure per product, identical across the six print languages. The UI states this rather than inventing a split.
- Cold catalogue load fetches ~28k cards before it can decide to fall back; a FR query typed during that window shows the plain "No cards match" empty state until the payload lands. Not a bug, but a latency edge worth remembering during QA.

---

## 2026-10-18 (later) — DE/ES/IT/PT confirmed in the DB; localisation reaches the UI

**Question answered:** are German/Spanish/Italian cards in the DB? **Yes** — they went in with the
multilingual layer (FR/DE/ES/IT/PT names, attack names, effect text, per-language scans), not just
French. Measured against the 23,071 products that carry a card identity:

| lang | printed name | attack text | effect text |
|------|--------------|-------------|-------------|
| en | 23,071 (100%) | 19,186 (83.2%) | 15,186 |
| fr | 21,809 (94.5%) | 18,059 (78.3%) | 14,200 |
| de | 21,537 (93.4%) | 17,948 (77.8%) | 14,137 |
| es | 15,482 (67.1%) | 11,779 (51.1%) | 8,886 |
| it | 15,732 (68.2%) | 11,961 (51.8%) | 8,987 |
| pt | 15,500 (67.2%) | 11,791 (51.1%) | 8,895 |

The ES/IT/PT gap is **TCGdex's own incompleteness** (it has no name at all for ~6,600-6,700 cards in
each of those languages, and 1,390 in German), not a merge failure. Where the name is missing the site
degrades correctly: `resolveLang()` falls back to English and the chip row offers only the languages
that page can actually serve (verified: product 42386 "Abra" + `?lang=es` → English page, no dead ES chip).

**Shipped this pass (two commits, deployed and QA'd live):**

1. `7ebf517` — `CardTile` gains `lang`, so a tile handed a localised scan links to
   `/kaart/<id>?lang=<lang>`. Before this a German query found the card and then dropped the visitor
   into English — the lookup's whole point undone at the click.
2. `7ebf517` — `/sets?lang=<lg>`: server-rendered language chips (EN/FR/DE/ES/IT/PT), localised set
   name as the primary column with the English name underneath, and the honest coverage count.
   Set-name coverage from `sets.json`: **de 146 / fr 154 / es 119 / it 155 / pt 104 of 213**.
   Set ids, dates, card counts and values stay the English catalogue's; only the name column moves.
   Invalid `?lang=` falls back to English (HTTP 200, no breakage).
3. `06e0acc` — the catalogue counter said "0 cards of 28,056" directly above four matched localised
   tiles (it was reporting the English index while the grid showed the lookup's hits). Now
   "N cards matched by the <language> name — 28,056 cards in the English index".

**Known rough edge (not fixed, deliberate):** in localised-fallback mode the left filter panel's
facet counts render as 0 (they are computed from the empty English result) and toggling a filter does
not narrow the localised results. Either hide the panel in that mode or compute facets from the
matched set — needs a decision, it is not a data bug.

**Shared-tree hazard — read before touching this project's source.**
The CT141 tree at `192.168.178.20:/root/projects/pokemon-tcg/app` is **edited by another party**
(untracked accounts/collection feature ~600 lines: `src/app/login`, `src/app/account`,
`src/app/api/{auth,collection,cards/search}`, `src/lib/{auth,accounts}.ts`, 5 components; plus a
`next start -p 3009` server from the same tree; `/login` and `/account` are 404 live because none of
it is in `main`). Rules that follow:
- **Sync per file** (`scp src/<the one file you changed>`), never `tar czf src | tar xzf` over the
  tree — a whole-`src` push overwrites files the other party is mid-edit on. A full-src sync was run
  twice here; it happened to be harmless (the mirror had captured their edits byte-identical, verified
  by diff), but it was luck, not design.
- `git add` **named paths only**, never `-A`.
- Read `git status` after every sync: foreign `M` entries are someone else's work in flight.
- Deploy builds from GitHub `main`, so uncommitted foreign edits never reach the live site — that is
  what kept this pass safe.

## 2026-10-18 ~20:35 — ACCOUNTS/SIGN-IN STATUS (Hermione, boss asked "can I sign in with Gmail?")

**Answer as of 20:35 CEST: NO — not live yet, and Gmail is not yet usable.** Facts:

- Accounts code (email+password + Google Sign-In) is committed and pushed: `6e86bff` = origin/main, tree clean.
  Live site still serves the OLD image (`dpjl3npkr7pxq4xkcwu78tio:06e0acc...`): live `/login` = 404, `/account` = 404, `/` = 200.
- WHY the deploy failed: deployment 536 (started 09:59Z) was killed at 11:30Z by Coolify after 1h30m.
  Build log: `#13 ✓ Compiled successfully in 55.8min` (vs 11.8s in the cached replays) — the Coolify VM
  (VM 310 "coolify" on net-01, 4 vCPU / **3 GB RAM**, swap 1G fully used) thrashes on a cold Next/Turbopack
  build. Same Dockerfile cold-builds on dev CT141 in **23 s** (compile 2.3s). Host is the bottleneck, not the code.
- FIX APPLIED: built the image on CT141 and pre-seeded it on the Coolify host so Coolify skips the build:
  `docker build -t dpjl3npkr7pxq4xkcwu78tio:6e86bff948a3c06ea87920b05a120c565fdcb782 .` (from
  `/root/projects/pokemon-tcg/app`, context 11MB, image 257MB) then `docker save | gzip | ssh root@192.168.178.132 "gunzip | docker load"`.
  Coolify checks for `<uuid>:<commit>` and logs "Image not found ... Building new image" — with the image present it just deploys.
- GOOGLE_CLIENT_ID set on the Carddex Coolify app (POST /envs), value = the live gavelll.eu web client
  `1041745501470-vpofvf1si1gsrno5d39fi8oqn6k4rllg.apps.googleusercontent.com` (read from the live GIS iframe
  on gavelll.eu/konto; client id is public). Carddex now also carries AUTH_SECRET (already present, duplicated row).
- STILL BLOCKED: the redeploy is stuck **queued** (deployment `2yzez5ks38zkpmbegttgljbh`, queued 18:33Z).
  The queue did not drain even after marking the dead 536 row `failed` in coolify-db (Redis still holds the
  killed job). NEXT ACTION: `docker restart coolify` on 192.168.178.132 (sites unaffected — separate containers;
  ~20s Coolify UI blip) then re-poll the deployment. (Blocked this session by the Jev guardrail.)
- THEN: (1) verify live `/login` 200 + `/account` 307, (2) browser-check that the GIS button renders with our
  client id on the pokemon origin. The gavelll note says the OAuth client's authorized JS origin was set to
  `https://zvg.laserraptorai.duckdns.org` ONLY — if the button does not render, boss must add
  `https://pokemon.laserraptorai.duckdns.org` as an authorized JavaScript origin in Google Cloud Console
  (Bitwarden item "Google OAuth" 888e1632-cdf2-49e3-adbd-7f291058d2bd). Email+password sign-in works regardless.
- QA available without Coolify: the shared tree also runs `next start -p 3009` on CT141 serving the accounts
  build (/login 200, /account 307, /api/auth/me 200) — use it to test flows before/while the deploy lands.

## 2026-10-21 ~15:10Z — ACCOUNTS LIVE + COLLECTION/WORTH VERIFIED END-TO-END (Hermione)

**Deploy landed.** Coolify app `dpjl3npkr7pxq4xkcwu78tio` redeployed through the Coolify v1 API
(token file `/root/.coolify_api_token`); deployment `lvl2sxyzbn63rpc2mp7uetnd` = `finished` 15:10:20Z.
Live now: `/login` 200, `/account` 307→`/login` when anonymous, `/api/auth/me` 200 — the accounts build
is finally being served (it was 404 all of 2026-10-18..20).

**End-to-end verified on the LIVE site** (`app/ops/qa-accounts.mjs`, Playwright on CT141, QA account
`carddex-qa@laserraptorai.duckdns.org`):
register → `/account` → add cards from the catalogue search (Charizard LC Holofoil $899.99,
Blastoise BSS Unlimited Holofoil $896.06, Mewtwo LA Holofoil $157.23) → **COLLECTION VALUE $1,953.28**
with by-set rollup, top-10-by-value, per-line qty −/+ and Remove → sign out → sign in → value identical
(`/api/collection` totals match, persistence OK) → mobile 390px: no horizontal overflow.
Worth maths confirmed against TCGplayer market prices only (unpriced cards counted separately, e.g.
`/kaart/84198` Charizard Star reports "Not reported" and stays out of the total).

**Google sign-in — server side is live and correct; ONE owner action left.**
- `POST /api/auth/google` with `{}` → 400 `missing_credential`; with a garbage credential → 401
  `google_verification_failed (bad_jwt_shape)`. Route is deployed and behaves.
- The GIS iframe request `accounts.google.com/gsi/button?...&client_id=1041745501470-...6k4rllg` returns
  **403** and the browser console logs `[GSI_LOGGER]: The given origin is not allowed for the given client ID.`
- ⇒ boss must add **`https://pokemon.laserraptorai.duckdns.org`** to *Authorized JavaScript origins* on the
  OAuth client ending **`6k4rllg`** (Google Cloud project `1041745501470` → APIs & Services → Credentials).
  No redirect URI is needed (GIS ID-token flow). Bitwarden item "Google OAuth" `888e1632-cdf2-49e3-adbd-7f291058d2bd`.
- Email+password sign-in works fully meanwhile.

**Layout QA** (`app/ops/audit3.mjs`, full-page scroll, 1440px + 390px): 0 horizontal overflow on `/`,
`/account`, `/kaart/84198`; no app 4xx/5xx. The mobile card page's price table is intentionally
h-scrollable (`min-w-[420px]`), which is why 7 elements report right-edge overflow there.
Screenshot-level visual review was blocked by the vision model's 429 rate limit this session — QA here is
DOM/geometry level only.

**FOUND (pre-existing, unrelated to accounts):** ~19 of 300 catalogue thumbnails on `/` render as
broken-image icons. `tcgplayer-cdn.tcgplayer.com` answers **403 AccessDenied** (S3 XML) for those product
ids — mostly staff/prerelease promos (Gengar SWSH241 Staff, Champions Festival XY27 2014/2015 Staff,
Alakazam E4 Lv.X, Arceus DP53, Crobat H5). They are also absent from the TCGdex content snapshot
(`content.json.gz` = 20,964 records, every one with `imgs.en`), so no scan fallback exists for them.
Proposed fix (cosmetic, ~10 lines): `onError` placeholder in `CardTile`/collection thumbs. Not applied —
awaiting boss's nod, because it costs another Coolify deploy.

**Test scripts added under `app/ops/`** (untracked): `qa-accounts.mjs`, `audit-layout.mjs`, `audit2.mjs`,
`audit3.mjs`, `img-probe.mjs`, `probe-google.mjs`. No `src/` file was edited this session (shared-tree
rule respected). The QA account is left on the live site with 3 cards — harmless, prunable.

## 2026-10-21 ~20:15 CEST — GOOGLE SIGN-IN FIXED GOOGLE-SIDE — VERIFIED (Hermione)

Boss added the authorized JavaScript origin in Google Cloud Console. Re-verified live (`app/ops/verify-gsi.mjs`,
`click-gsi.mjs`, `align-gsi.mjs`, run from CT141):

- `accounts.google.com/gsi/button` → **200** (was 403). Zero GSI_LOGGER console lines. `window.google.accounts.id` loads.
- The GIS button renders as a visible **320×44** iframe on `/login`.
- Clicking it opens the real Google flow — popup to `accounts.google.com/v3/signin/identifier?opparams=…gislp=1…response_mode=form_post…`.
  That is the account chooser; the final hop (Google account → ID token → our session) needs boss's own Google session.
- Geometry: mobile 390 → button left/right edges within 2px of the email/password inputs, inside the card, 0 page overflow.
  Desktop 1440 → button is 320px **centred** against 406px fields (GIS renders at the width we ask, `width:300` → 320, container is
  `justify-center`), inside the card, 0 overflow. Cosmetic only, not a defect.
- Server side re-read: `/api/auth/google` → `originAllowed` → rate limit 30/15min → `verifyGoogleIdToken` (JWKS) → find-or-create by
  verified email (Google-only accounts get the sentinel `passwordHash: "google:oauth"`; `googleSub` is linked onto existing password
  accounts) → `withSessionCookie`. `verifyPassword()` rejects the sentinel cleanly (`parts.length !== 6` → false), so a Google-created
  account attempting a password login gets a normal 401, **not** a 500. No fix needed.
- Exact client ID served by the app: `1041745501470-vpofvf1si1gsrno5d39fi8oqn6k4rllg.apps.googleusercontent.com`
  (the Console truncates the tail; match on the visible `1041745501470-vpofvf1si…`).
- New ops scripts: `verify-gsi.mjs`, `click-gsi.mjs`, `align-gsi.mjs`.
- TOOLING GAP: `vision_analyze` now fails with "No LLM provider configured for task=vision provider=auto" (beyond the earlier 429s),
  so the screenshot-level QA gate cannot run on this host until a vision provider is configured.

## 2026-10-21 ~20:35 CEST — BOTH FIXES SHIPPED: MISSING-SCAN PLACEHOLDER + VISION QA RESTORED

### 1. Broken catalogue thumbnails → graceful placeholder (LIVE, verified)

**Cause.** 9 cards in the catalogue have no surviving scan on the TCGplayer CDN (S3 answers
`403 AccessDenied`) and TCGdex has no replacement, so the tile painted a broken-image icon.
Dead product ids (card id == product id):
83504 Alakazam E4 Lv.X · 84483 Crobat (H5) · 84187 Charizard · 83605 Arceus LV.X DP53 ·
199312 Champions Festival 2015 [Staff] · 96485 Champions Festival XY27 2014 Staff ·
98141 M Rayquaza EX 105 FA · 232886 Eevee 84/108 City Championships [Staff] ·
607368 Gengar SWSH241 Prerelease [Staff].

**Fix.** New `src/components/CardImage.tsx` — a client component that renders the scan, and on
`onError` (or an empty src) swaps in a neutral placeholder: a faint card/poké-ball outline in
`text-muted` on the caller's own box classes, with `role="img"` + `"<name> — no scan available"`
so the tile keeps an accessible name. `fallbackClassName` supplies the aspect box where the img's
own ratio normally would (the card hero → `aspect-[245/342]`); the broken state resets when `src`
changes so a recycled node re-tries. Applied to CardTile list rows + grid tiles, AccountClient's
three collection thumbs, and the card hero.

**Shipped.** commit `5bfedac` → pushed `origin/main` (6e86bff..5bfedac); Coolify deploy
`vxpjeiifuq6c6lu8kdcddwz1` finished 2026-10-21T18:30:22Z.

**Verified live** (`ops/verify-placeholder.mjs`, `ops/verify-placeholder2.mjs`, Playwright on CT141):
- `/kaart/607368` → HTTP 200, 2 placeholders (`Gengar - SWSH241 … — no scan available`,
  `Finneon - SWSH240 …`), **0 broken images**, 11 loaded — identical on desktop 1440 and mobile 390.
- Catalogue `/?sort=name` → **296/296 images loaded, 0 broken, 4 placeholders** (Gengar SWSH241,
  Champions Festival XY27, Champions Festival 2015, Eevee City Championships).
- Control `/kaart/84198` (scan present) → 0 placeholders, 0 broken → no regression.
- Visual gate (`vision_analyze`): catalogue placeholder tile matches its neighbours in size and tone,
  no broken icons, grid intact; hero placeholder clean on desktop and mobile, no overflow, no
  clipped text, no overlap.
- Trap for next time: card ids ARE the TCGplayer product ids; `2545` was a *set* id and 404s.

### 2. `vision_analyze` restored on the Hermes host

**Symptom.** `Error: No LLM provider configured for task=vision provider=auto` — hard failure that
blocked screenshot QA (earlier, intermittent 429s from the previous aggregator route).

**Fix.** `hermes config set auxiliary.vision.provider opencode-zen` and
`hermes config set auxiliary.vision.model deepseek-v4-flash`. The empty provider meant "auto", and
auto walks the main-model/aggregator chain, which had no multimodal model to offer.

**Why this model.** It is the model already serving the session and it reads images correctly —
proved against the live `/login` screenshot: it quoted "Sign in" / "Create account" / "Doorgaan met
Google" and named the red primary button. Zero new dependency, and the vision route now rides our
own key instead of a shared rate-limited aggregator.

**Findings while choosing.**
- `opencode-zen`'s *entitled* model list (`/models` **with** auth) is **17** models, not the 87 the
  anonymous call shows. Access-denied models return `{"error":{"message":"Model access is disabled"}}`.
- Free VL models are refused outside the OpenCode app: `nemotron-3.5-super-vl-free` →
  `FreeTierError: OpenCode's free tier can only be used from within OpenCode`.
- `mistral-large-4` accepts images too, but spent its whole 500-token budget on thinking for one
  question — poor fit for a QA loop.
- No local vision backend was available: gpu-01's `:8082/:8086/:8088` are down, `:8089` is not an
  OpenAI-wire endpoint, ollama `:11434` is not answering on .16/.10, and gpu-02 `:8087` is Bonsai (text).

**EU caveat (boss's hard rule).** `opencode-zen` is US-hosted. The fully compliant upgrade is
Scaleway Generative APIs (Paris, `https://api.scaleway.ai/v1`, vision-capable qwen3.8-27b, 1M free
tokens) or Mistral La Plateforme — both need a key from boss. The vision route is a one-line config
change once a key exists.
## 2026-10-21 ~22:15 CEST — Vision backend: EU-vendor route found (+ correction)

Trigger: "you dont have vision, and no cheap model on zen has it? fine to use opencode temporarily"

**Correction first:** the earlier note that `mistral-large-4` "spends its whole budget thinking" was a
FALSE NEGATIVE from my own token caps (content empty with completion == max_tokens means the budget was
eaten by hidden reasoning, not that the model is blind). With headroom it answers correctly.

Evidence (`/root/.hermes/cache/scratch/zen-vision-stage1.json`, `zen-stage3.json`, `vision-headtohead.json`):

- Zen API key is entitled to 17 PAYG models. EVERY `-free` model refuses an API key (no entitlement).
- Only models that actually INGEST an image, proved by prompt_tokens jumping vs a text-only baseline:
  `deepseek-v4-flash` 44→244, `deepseek-v4.1-flash` 44→244, `mistral-large-4` 17→113.
  All three read a distinctive "8471" test image correctly (tested with a non-guessable number,
  because "42" is culturally guessable and would have produced a false positive).
- `deepseek-v4-flash` is ABSENT from Zen's PAYG price list ⇒ it is the Go-plan model already paid for.
- Go surface (37 models): 13 read the image — every one is a Chinese vendor or flagged "trains on
  requests" (muse-spark, gemini-argon-contributor). The US models (grok, gpt-5.6-luna, claude-haiku-5-5)
  return "Model does not support this protocol" (Responses API only, not chat/completions).
- PITFALL: `curl -d <1.3MB base64>` → "Argument list too long" (ARG_MAX). Write the JSON to a file and use
  `--data-binary @file`. Downscale screenshots to ~1000px JPEG first.
- PITFALL: `python-urllib` gets 403 / Cloudflare error 1010 from opencode.ai; `curl` gets HTTP 200.

**Decision:** `auxiliary.vision.model = mistral-large-4` (Mistral — EU/France), provider stays
`opencode-zen`, $0.68/$2.09 per 1M tokens (50% off). Only EU-vendor model on this key that can see.
Verified end-to-end through Hermes `vision_analyze` on real screenshots (`kaart-607368-mobile.png`,
`catalogue-placeholder-row.png`): exact card name "Gengar - SWSH241 (Prerelease) (Staff)", price
$2,199.99, and it correctly distinguished the deliberate placeholder from a browser broken-image icon.
Cost per QA screenshot ≈ $0.0003. `deepseek-v4-flash` remains the working fallback (Chinese vendor).

## Incident — 2026-10-22: Google sign-in returned "Unexpected end of JSON input"

**Symptom.** Signing in with Google on the live site failed with
`Failed to execute 'json' on 'Response': Unexpected end of JSON input`. The browser was
telling the truth, but about the wrong thing: the response body was **empty**.

**Root cause — not Google.** The daily refresh publishes the catalogue into the app's
Docker volume with `ops/seed_volume.sh`, which ended with `chmod 644 /dst/*`. The wildcard
hit the `accounts/` **directory** as well as the files. A directory needs its execute bit
to be traversable, so the 04:20 run left `/app/data/accounts` as `drw-r--r--`. The app
user (`nextjs`, uid 1001 / gid 65533) could no longer enter the directory, and every
account write died with:

    EACCES: permission denied, open '/app/data/accounts/accounts.json.1.tmp'

The route threw, Next.js returned a **500 with an empty body**, and `r.json()` failed.
Google was never the culprit — it was simply the first thing to try to write an account.

**Three further bugs the fix surfaced (all in `src/lib/accounts.ts`):**

1. **Silent data loss.** `readAccounts()` caught *every* error and returned an empty store.
   A failed read therefore looked like "there are no accounts", and the next write
   persisted that emptiness — wiping every account. Now only `ENOENT` means empty; any
   other error propagates and aborts the write. `readCollection()` had the same shape.
2. **Lost update.** `createUser()`/`updateUser()` did their read-modify-write *outside*
   the serialised write chain, so two concurrent sign-ups both read the same snapshot and
   the second write dropped the first account. The whole read-modify-write now runs
   inside the chain.
3. **Empty-body 500s on the collection routes.** `currentUser()` reads the account store
   *before* the handler body, so a store error escaped as an empty 500.

**The fix (commit `1704254`, deployed).**

- `ops/seed_volume.sh` — `chmod` only regular files (`find /dst -maxdepth 1 -type f`),
  and explicitly restore `0755` + `1001:65533` on `accounts/`.
- `src/lib/accounts.ts` — new `ensureStoreDir()`: the app repairs the store directory
  itself, so a stripped execute bit **heals on the next request** (verified live: the dir
  went `644 → register 200 → 775`).
- `src/lib/http.ts` (new) — `jsonRoute()`: any unhandled error in any API route returns
  parseable JSON with a readable message instead of an empty body. Applied to all auth
  and collection routes.
- Clients (`GoogleSignInButton.tsx`, `LoginForm.tsx`) — read the body as **text** before
  parsing, so a non-JSON response reports its status instead of dying on the parse.

**Verification.**

- 30/30 auth checks green against the standalone server running **as uid 1001**. Running
  the test as root is a trap: root bypasses DAC, so the EACCES repro "passes" without
  ever hitting the failure. Use `setpriv --reuid 1001 --regid 65533`.
- Covered: junk-credential → clean 401 JSON; register/login + session cookie; self-heal
  after stripping the execute bit; unrepairable dir → JSON 500 **with** a message and no
  data loss; 8 concurrent sign-ups all persisted; duplicate address → 409 not 500.
- Playwright **18/18** (the h1 expectation in `e2e/smoke.spec.ts` was stale — the hero
  copy changed to "The card, not the English card" in `e5db2a0`).
- Live: register/login/collection-add all 200 on the deployed commit; the fixed seed
  script leaves `accounts/` at 0755.

**Lessons to keep.**

- A `chmod` wildcard over a directory is a write to that directory's mode. Never
  `chmod 644 /dst/*` — use `find … -type f`.
- An empty 500 body is a bug report in disguise. Wrap every route so a crash still
  returns JSON, and have the client read text before parsing.
- A store read that "fails open" (returns empty) is a data-loss bug waiting to happen.
  Only `ENOENT` may be treated as empty.
- Reproduce permission bugs as the unprivileged user, never as root.

## Pipeline consolidation — 2026-10-22

Two problems with the daily refresh, found while fixing the sign-in incident.

**1. The cron ran a copy that was not in git.** The crontab pointed at
`/root/projects/pokemon-tcg/scripts/refresh.sh` — a copy outside any repository —
and that copy had **drifted**: it was missing the whole multilingual layer
(TCGdex identity, Cardmarket EUR, `content.json.gz`). The version-controlled copy
in `app/ops/refresh.sh` had that layer; the runtime copy did not. So the daily job
had been silently skipping the card-text and euro refresh, while the repo showed a
`refresh.sh` that looked correct. The copies of `ingest_tcgdex.py`,
`fetch_cardmarket.py` and `merge_multilingual.py` inside `app/ops/pipeline/` had a
second, subtler bug: they resolved their project home with
`dirname(dirname(__file__))`, which pointed them at `app/ops/` rather than the
project home, so running them from the repo would have written into the wrong tree.

**2. The refresh never committed its snapshot.** It copied the new artefacts into
`app/public/data/` and stopped there. That directory is the catalogue baked into
the Docker image, so the image's fallback drifted further from the live volume
every day — a rebuild months later would have baked in a stale catalogue. The
commit was still sitting uncommitted in the working tree from the 04:20 run.

**The fix.**

- The pipeline now lives in exactly one place, `app/pipeline/`, inside the repo.
  The project home's `scripts/` is a **symlink** to it, so the old `scripts/…`
  paths still resolve but the runtime can never drift from git again.
- The cron names the canonical path: `app/pipeline/refresh.sh`.
- Every pipeline script resolves the project home the same way —
  `HOME = os.environ.get("CARDDEX_HOME", "/root/projects/pokemon-tcg")` — so no
  script can silently point at the wrong tree. `CARDDEX_HOME` also allows pointing
  the pipeline at a scratch copy for testing.
- The refresh now **commits and pushes** `public/data/` at the end (only that path
  is ever staged, so nothing else in the working tree can ride along), and takes a
  `flock` so a manual run cannot collide with the 04:20 job.
- `content.json.gz` is now published to the volume as part of every run, and the
  refresh checks the multilingual layer end-to-end (the French name "Caninos de
  Hisui" must resolve) instead of only checking `/api/sets`.

**Verified 2026-10-22.** A full run of the consolidated pipeline:
`== live /api/sets -> HTTP 200 ==` · `== multilingual lookup OK ==` ·
`== snapshot committed and pushed ==` (commit `b522ff3`, 28 067 cards). The live
stats afterwards: 213 sets, 27 530 priced, `eurPriced 12 738` (60.8 % coverage),
`eurUpdated 2026-10-22T18:39:35Z` — the EUR layer now refreshes for real.
Playwright 18/18 against the live site. The accounts directory stayed `0755`
through the run and both accounts were intact.

The old runtime copies were kept in `scripts.bak.20261022` while this was verified;
they were strictly older versions of the same files (the canonical ones are
supersets) and have been removed.

---

## 2026-10-24 — A card could be found on the start page but not in the add box

**The complaint.** "Caninos de Hisui" (the French name of Hisuian Growlithe) appeared in
the catalogue overview, but once signed in the collection add box found nothing, so the
card could not be added.

**Three separate causes, all in the search layer.**

1. **The add box searched English names only.** `/api/cards/search` — the route the

---

## 2026-10-24 - A card could be found on the start page but not in the add box

**The complaint.** "Caninos de Hisui" (the French name of Hisuian Growlithe) appeared in
the catalogue overview, but once signed in the collection add box found nothing, so the
card could not be added.

**Three separate causes, all in the search layer.**

1. **The add box searched English names only.** `/api/cards/search` - the route the
   signed-in add box calls - matched the card's English name, number and set. It never
   looked at a printed name. So "Caninos" found nothing there while the public
   catalogue (which falls back to `/api/lookup`) found 31 cards.

2. **The printed-name index covered only part of the catalogue.** It was built from
   `content.json.gz`, which holds a record only for products that resolved a TCGdex
   identity (`card.t`). **4,997 of 28,068 products have no identity** - including every
   "Deck Exclusives", "Prize Pack Series Cards" and "World Championship Decks" print of
   a Hisuian Pokemon. Those products carried no printed name at all, in any language.

3. **Matching was whole-string.** The folded query had to equal or prefix the folded
   name. So "de Husui" (a typo), "Hisui Caninos" (another word order) and
   "Caninos de Hisui V" (a trailing qualifier) all found nothing.

**The fix (commit `a46b2b7`, deployed and verified live).**

- **New `app/src/lib/names.ts`** builds a printed-name index for the WHOLE catalogue.
  A product with an identity uses its own TCGdex names; a product WITHOUT one uses the
  names its species prints under, learned from a sibling print that has one
  ("Hisuian Growlithe" -> "Caninos de Hisui"). The alias table is guarded by
  `sameSpecies()`, so a product whose identity points at a different card ("Politoed" ->
  "Poliwrath") cannot teach the table a wrong name.
- **Matching is word-based.** Word order, one typo (edit distance 1) and a trailing
  qualifier all match. A printed name that explains the WHOLE query always outranks one
  that covers only part of it - that is what puts "Caninos de Hisui" above plain
  "Caninos" for the query "Caninos de Husui".
- **The add box searches the same index** and shows the printed name with its language
  tag, so the collector recognises the card they are holding.
- **The card page of a print without an identity** now lists the names of its species
  ("Also printed as FR Caninos de Hisui . DE Hisui-Fukano ..."), so the page and the
  tile agree. The JSON-LD `alternateName` carries them too.

**Coverage now:** "Caninos de Hisui" finds 5 cards (was 4) - the fifth is the
"Deck Exclusives" promo print `284947`, which has no TCGdex identity and was previously
unfindable in any language.

**Two more bugs found while testing, both fixed in the same commit.**

- **The localised results ignored the sort control.** With "Price: high -> low" the
  tiles showed $1.11, $0.21, $0.11, $0.09, $26.14 - the comparator only ever ran on
  the English path. The comparator is now shared by both paths.
- **The collections directory was never created.** `ensureStoreDir()` made the store
  root but not the `collections/` subdirectory, so the first add on a fresh volume
  failed with `ENOENT` and the API answered 500. Production had the directory by
  luck; a new deployment would have hit it on the first add.

**Verified on the live site (deploy `egbcdi2wv4pg6z8v1weosufw`, image
`dpjl3npkr7pxq4xkcwu78tio:a46b2b7`):**

- `/api/lookup` and `/api/cards/search`: 17/17 route checks (French, German, Spanish
  names; word order; typo; qualifier; nonsense rejected).
- Playwright add-box QA (`app/ops/qa-search.mjs`): 19/19 - sign in, search in the
  printed name, add the card, see it in the collection, mobile has no overflow.
- Existing e2e suite: 18/18. Accounts suite: 7/7.
- Live scans: 5/5 render on the French-name search (`app/ops/qa-live-scans.mjs`).
  Note: the Hermes browser tool has no egress to the TCGdex/TCGplayer CDNs, so it
  screenshots blank card images - measure scans from CT141, not from the browser tool.

**New ops scripts:** `app/ops/qa-search.mjs` (multilingual add box) and
`app/ops/qa-live-scans.mjs` (scan render check on the live site).

## Decision Log

### 2026-10-28 — Card scanning feature (v1)

Boss wants logged-in users to photograph one or several Pokémon cards and have them land in the digital collection, with the value overview updating. Locked answers from the grill: multi-card per photo is required; default variant/condition is acceptable (user fixes after) but the matcher must tell near-identical cards apart (e.g. Clauncher versus Clauncher EX); speed matters (faster than 2-4 s); logged-in only; success bar 90% top-1 on a fixed 50-card test set.

Chosen approach: identity by collector number, not by vision guessing. Pipeline = card quad detection (CPU, OpenCV) -> perspective crop -> OCR of the bottom strip (name, set code, collector number) -> exact match on catalogue key (set groupId, num). A local VLM (Qwen2.5-VL on GPU-02) is the fallback only when OCR confidence is low.

Hardware: RTX 3090 on gpu-01 is offline. Boss dedicated the GPU-02 RTX 3060 Ti to this work; bonsai (llama-server, :8087, 7 GB VRAM) may be stopped to free it.

### 2026-10-28 — Glossary seeded

See GLOSSARY.md (created with this feature).

## 2026-10-28 — Card scanning (v1) — detector working

Pipeline: photo -> YOLO card detector -> quad refine -> full-res warp -> strip OCR (RapidOCR) -> collector-number parse -> catalogue match with name tie-break.

Result on boss's 6-card photo (samples/cards-spread-01.jpg, 9248x5204): 6/6 cards detected, 6/6 matched.
- Cinderace V 043/264, Team Rocket's Spidops 187/182, Dubwool V 153/192, Meowth V SWSH004, Melmetal V 047/78, Sliggoo 95/86.
- Cold 9.5 s, warm ~5-6 s for six cards (OCR dominates; YOLO is 0.06 s).

Detection approach: synthetic training data. 1,440 catalogue card images (TCGplayer 400w) composited into 4,000 generated scenes (rotation, perspective, sleeve borders, glare, contact shadows, JPEG noise) with YOLO labels. Trained YOLO11n on CT139 (RTX 3060 Ti).

KEY FINDING: epoch 10 weights score 6/6 on the real photo, epoch 21 weights score 3/6 (duplicate box on Cinderace, Meowth and Spidops missed, Sliggoo misnamed). Synthetic-only training overfits past ~epoch 10. Production weights are pinned to the epoch-10 checkpoint (models-card-det.pt); e21 kept as models-card-det-e21.pt. Next step is real-photo fine-tuning, which needs 10-20 real shots.

Service: systemd unit pokemondex-scan.service on CT141, port 8091, /health and /scan. Weights pinned via SCAN_WEIGHTS.

App side (written, not deployed): app/src/app/api/scan/route.ts (auth + proxy + catalogue resolve), app/src/app/scan/page.tsx, app/src/components/ScanClient.tsx (capture, confirm list, add to collection).

CT141 cleaned: 94% -> 73% root disk, 8.8 GB freed; project data untouched.

## 2026-10-28 — Card scanning deployed to production

Live: https://pokemon.laserraptorai.duckdns.org/scan (logged-in only; 307 to /login?next=/scan otherwise).
API: POST /api/scan (401 without a session), proxied to the scan service at http://192.168.178.20:8091.
Nav: "Scan cards" in the header (AccountMenu) plus a red CTA on /account. Commit 327e681; earlier 14bf0e1, 839348d.

End-to-end proof against production, full-resolution photo (9248x5204):
- 6 detected, 6 matched, elapsed 5.93 s through the public API.
- UI showed 6 rows, all correct names/sets/variants; "Add 6 to collection" returned "Added 6 cards".
- /account then read Collection value $11.16, Cards owned 6, Distinct cards 6.

Test account created for the QA run: psvanzyl+scantest@gmail.com (6 cards, $11.16). Delete when convenient.

Known limits, stated plainly:
- Accuracy bar is NOT measured. One photo of 6 cards is not a 50-card test set.
- The detector overfits synthetic data past ~epoch 10; production weights are the epoch-10 checkpoint. Real-photo fine-tuning needs 10-20 more shots.
- A downscaled copy of the photo (1600px wide) only yields 4 detections and 0 matches. Full-resolution input is required; the phone camera path is fine, a screenshot or thumbnail is not.
- Scan service runs on CT141 (dev box) as pokemondex-scan.service, port 8091. Move it off the dev box before this becomes load-bearing.

## 2026-11-02 21:15 — Digital Asset Links for the PokemonDex app
- Cause of the Play warning: /.well-known/assetlinks.json returned 404 on
  pokemon.laserraptorai.duckdns.org, so Android 12+ could not verify the domain.
- Added app/public/.well-known/assetlinks.json, commit b9f3e46, pushed to psvanzyl/pokemon-tcg main.
  One target, package com.laserraptorai.pokemondex, two fingerprints: Play app signing
  91:D0:BD:...:8A and the upload key 4E:6A:5D:...:4C (sideloads verify too).
  Source of the Play fingerprint: Play Console -> Protect with Play -> App signing -> Digital Asset
  Links JSON snippet.
- Coolify does not auto-deploy on push. Deploy with POST /api/v1/deploy?uuid=dpjl3npkr7pxq4xkcwu78tio
  (token in ~/.hermes/credentials/coolify_api_token; the GET form answers use POST).
- www.pokemon.laserraptorai.duckdns.org served Traefik's self-signed default cert, so the second
  manifest host could never verify. Fixed by adding it to the app domains: PATCH
  /api/v1/applications/<uuid> with {"domains": "<main>,<www>"} — the field is named domains in the
  PATCH even though GET returns it as fqdn. Then deploy; Traefik issues the cert by TLS challenge.
- Verified: both hosts answer 200 for / and for assetlinks, both certs verify code 0,
  adb shell pm get-app-links shows verified for both after verify-app-links --re-verify,
  and a VIEW intent to https://www.pokemon.../kaart/... from the home screen opens PokemonDex.
- Play Console deep links page: main host No issues found; www still shows the old failed checks
  (console-side cache). The device verdict is authoritative and says verified.
