# Carddex — PRD

**One line:** the complete English Pokémon TCG single-card catalogue with daily market
prices, searchable, filterable and sortable — free, public, no account.

**Live:** https://pokemon.laserraptorai.duckdns.org

## Why

Every existing Pokémon card database either hides prices behind a login, paginates
aggressively, or drowns you in ads. TCGplayer itself has no "browse the whole catalogue
with facets" view. The data is public and free (TCGCSV republishes TCGplayer's daily
dumps); the value is in the index, the facets and the speed.

## Scope

| In scope | Out of scope |
|---|---|
| English-language Pokémon TCG singles (28,056 cards, 213 sets) | Sealed product — booster boxes, ETBs, tins, blisters, decks |
| Per-print price variants (Normal, Holofoil, Reverse Holofoil, 1st Edition, …) | Japanese / other-language printings |
| market / low / mid / high per variant, USD | Graded slabs and condition grades |
| Daily price snapshots + per-card history chart | Selling, carts, checkout, accounts |

## Users & jobs

1. **The collector checking a price** — "what is my Charizard worth?" → search by name,
   land on the card page, read the per-print table.
2. **The set completer** — "what am I missing from Evolving Skies and what will it cost?"
   → filter by set, sort by number, read the set value column on /sets.
3. **The bargain hunter** — "cheapest holo rares over $5" → filter rarity + price range,
   sort price ascending.
4. **The market watcher** — "is this card trending up?" → card page history chart.

## Acceptance criteria

- [x] Every English single in the source catalogue is present and reachable at its own URL.
- [x] Free-text search matches card name (accent- and punctuation-insensitive) and card number.
- [x] Facets: set, rarity, type, stage, print variant, price range, priced/unpriced — all with
      live result counts, all reflected in the URL so any view is shareable and back-button safe.
- [x] Eight sort orders, including price both ways and set chronology.
- [x] Card page: image, set, number, rarity, type, HP, stage, per-print price table,
      price-history chart, TCGplayer link, 12 neighbours from the same set.
- [x] Catalogue payload ≤ 1.5 MB gzipped and served pre-compressed; first paint < 2 s on LAN.
- [x] Mobile layout with a slide-in filter drawer, no horizontal overflow at 390 px.
- [x] Honest about its data: source, freshness, currency and caveats stated on /about.
- [x] No paywall, no login, no tracking.

## Non-goals (v1)

Wishlists, price alerts, portfolio tracking, price *forecasting*. History starts the day the
site went live — there is no backfill, because TCGCSV only serves the current day's prices.

## Success signal

Someone with a card in hand can answer "what is this worth, and what else is in that set?"
in under thirty seconds without an account.
