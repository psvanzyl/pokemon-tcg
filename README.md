# Carddex

The complete English Pokémon TCG single-card catalogue with daily market prices —
searchable, filterable, sortable. 28,056 cards, 213 sets, USD.

**Live:** https://pokemon.laserraptorai.duckdns.org

Next.js 16 · React 19 · Tailwind 4 · standalone Docker image · deployed on Coolify.

## What's in here

```
src/app/page.tsx            hero + catalogue
src/app/kaart/[id]/page.tsx card detail (prices, history, neighbours, JSON-LD)
src/app/sets/page.tsx       every set with card count and total market value
src/app/about/page.tsx      source, method, caveats
src/app/api/cards/route.ts  pre-gzipped catalogue (1.4 MB)
src/app/api/sets/route.ts   sets + stats
src/app/api/history/[id]/route.ts  per-card price series
src/components/             Catalogue, FilterPanel, CardTile, PriceTable, PriceChart
src/lib/                    data resolution, types, formatting
ops/                        harvest / normalise / history / publish pipeline
docs/PRD.md                 what this is and what it is not
docs/DEPLOY.md              deploy shape, data volumes, daily refresh, gotchas
e2e/smoke.spec.ts           Playwright smoke tests (desktop + mobile)
```

## Data

Card metadata and prices come from [TCGCSV](https://tcgcsv.com), which republishes
TCGplayer's daily product and price dumps as open JSON — no API key, no scraping.
A product counts as a single when its `extendedData` carries a `Number` (card number);
that is what excludes sealed product. Images are hotlinked from TCGplayer's CDN.

Not affiliated with Nintendo, Creatures Inc. or The Pokémon Company.
