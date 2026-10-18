# Carddex — competitive landscape & positioning (research 2026-10-18)

Question from boss: "there are so many Pokémon websites already — how does Carddex
differentiate itself?" Plus: add French cards (ref: pokepedia.fr/Caninos_de_Hisui).

## 1. The French card that started it

`Caninos de Hisui` (FR) = `Hisuian Growlithe` (EN) = `Hisui-Fukano` (DE) =
`Growlithe di Hisui` (IT) = `Growlithe de Hisui` (ES).
One card, one id in TCGdex: `swsh10-070`, set FR `Astres Radieux` / EN `Astral Radiance`,
070/189, **Cardmarket product 658659**, **TCGplayer product 272271**.
Second printing: `sv06-099` (cm 769273 / tp 550143).

That single fact is the whole positioning story: the *identity* of a card is
language-independent, but every price site makes you search in English.

## 2. Who is already out there (evidence, not impression)

| Tier | Sites | What they own |
|---|---|---|
| Official | pokemon.com card database, tcg.pokemon.com galleries | authority, EN-only, **no prices at all** |
| Marketplaces | TCGplayer (US, USD), Cardmarket (EU, EUR, the EU price reference) | liquidity |
| Free catalogues / trackers | Pokécardex (FR, free, ad-free, community, apps), pokemoncard.io (decks/community), PokéItem (FR, freemium, scanner), Pokéllector, PokeDen, CardTrack, PokePrices (free, no-login, sold-sales + PSA) | the "browse a catalogue" job — **saturated** |
| Paid APIs / tools | Tcggraph, cardmarket-api.com, Listrune, Eyevo | per-language + EUR pricing, behind a paywall |

**Verdict: "we also have French cards" is not differentiation — it is table stakes.**
Multilingual catalogues already exist (TCG CollectWorld claims 153k cards / 10 languages;
Eyevo 8 languages; Listrune 13 print languages). A site whose pitch is "French cards too"
is dead on arrival.

## 3. What is genuinely still empty

1. **Free, language-agnostic card identity.** Nobody free lets a collector type the name
   *printed on their card* ("Caninos de Hisui", "Dracaufeu", "Glurak") and land on a page
   that knows every language printing, with the per-language card scan. TCGdex gives us the
   identity graph (one id, five names, five images) for free/MIT. Pokécardex is FR-only,
   TCGplayer/pokemoncard.io are EN-only, Cardmarket needs the EN name or set+number.
2. **EUR + USD on the same card, with provenance.** Cardmarket in EUR is the number EU
   collectors actually trade on; the site is USD-only today. Competitors that have both
   sell it as a paid API.
3. **An open data commons.** Carddex does not need revenue. Publishing the normalised
   dataset + a keyless JSON API + daily snapshots (MIT) makes it the substrate other tools
   build on. A commercial competitor cannot copy that without killing its own revenue.
   Fits boss's EU-hosted-only rule and is marketable: EU-hosted, no ads, no account,
   no tracking.

**Do not** chase catalogue size, decks, scanners, AI grading, VR vaults, community forums —
all occupied, all expensive, none winnable by one person in a homelab.

**Naming warning:** the French incumbent is *Pokécardex*. A site called *Carddex* shipping
French content will read as a knockoff. Positioning must be explicitly
"independent, data-first, multilingual, non-commercial", or the FR-facing label differs.

## 4. Hard limits measured (do not promise what we cannot deliver)

Measured against api.tcgdex.net on 2026-10-18:

- `swsh10-070` has **identical** Cardmarket pricing in en/fr/de/it/es (`cm_id 658659`,
  trend 0.06, low 0.02). **TCGdex prices are per Cardmarket *product*, not per language.**
  => Carddex **cannot** honestly show "the French copy is cheaper than the English one"
  (that is Cardmarket *listing*-level data, which Tcggraph/Listrune scrape and sell).
  We can show EUR *and* USD side by side, each labelled with its source and fetch time.
- Price coverage of French printings: **~51%** (150-card random sample: 77/150 had a
  Cardmarket price block; 75/150 had a TCGplayer cross-ref; 150/150 sample usable for names).
- Print-language counts (TCGdex): EN 23,770 · **FR 22,155** · DE 20,483 · **NL 0**.
  FR sets: 202 (EN 220). Dutch is not shipped — TCGplayer has no Dutch at all, Cardmarket
  carries Dutch only as a listing attribute. **The Dutch-language catalogue is an empty pond.**
- Crosswalk quality: sample FR printings → `thirdParty.tcgplayer` ids resolved into our
  existing 28,056-card catalogue **78/78** — the join is lossless where a ref exists.

## 5. Recommended build (French first, language layer generic)

1. Self-host TCGdex (`docker.io/tcgdex/server`, ~86 MB, MIT; or parse the `data/` tree of
   github.com/tcgdex/cards-database) in its own LXC — no rate limits, no third-party
   dependency, fits the homelab pattern. Do NOT bulk-pull 22k cards one request at a time
   from the community API.
2. Crosswalk on `thirdParty.tcgplayer` → existing productIds (verified lossless).
3. Dataset gains per card: `names{en,fr,de,it,es}`, per-language image URL, set name per
   language, plus `eur{low,trend,avg7,avg30,updated}` next to the existing USD fields.
4. UI: multilingual, accent-insensitive search; card page lists the printing in each
   language with its own scan; every price labelled (source, field, timestamp) with the
   existing outlier flag from open item 6 in project_state.md.

Effort: pipeline + crosswalk ~1 day, UI + QA ~1 day, two deploys.
