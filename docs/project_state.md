# pokemon-tcg ("Carddex") — project state

**Status: LIVE** — https://pokemon.laserraptorai.duckdns.org (Coolify on CT310)
**Last updated:** 2026-10-22
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
