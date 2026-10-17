# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> catalogue smoke >> home loads, catalogue renders cards with prices
- Location: e2e/smoke.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=/\\$\\d/').first()
Expected: visible
Received: hidden
Timeout:  20000ms

Call log:
  - Expect "toBeVisible" locator('text=/\\$\\d/').first() with timeout 20000ms
  - waiting for locator('text=/\\$\\d/').first()
    43 × locator resolved to <button type="button" class="rounded-full border px-2 py-0.5 text-[11px] transition border-ink-600 text-muted hover:border-ink-600/80 hover:text-slate-fg">Under $1</button>
       - unexpected value "hidden"

```

```yaml
- banner:
  - link "Carddex":
    - /url: /
  - text: 28,056 cards · 213 sets USD market prices, refreshed daily
- main:
  - heading "The complete English Pokémon card index" [level=1]
  - paragraph: Every single card in the English Pokémon TCG catalogue with its current market price, searchable, filterable and sortable. 28,056 cards across 213 sets · prices in USD · last refresh 2026-10-17.
  - textbox "Search 28,000+ cards — name, set or card number (e.g. Charizard, 4/102)"
  - button "Filters"
  - combobox:
    - 'option "Price: high → low" [selected]'
    - 'option "Price: low → high"'
    - 'option "Name: A → Z"'
    - 'option "Name: Z → A"'
    - 'option "Set: newest first"'
    - 'option "Set: oldest first"'
    - 'option "Rarity: rarest first"'
    - option "Card number"
  - strong: 28,056
  - text: cards of 28,056 · snapshot 2026-10-17 · 213 sets
  - link "Eevee - 143/191 (GYM) $100,000.00 Eevee - 143/191 (GYM) Southeast Asia Exclusives · 143/191 Common HP 50":
    - /url: /kaart/680957
    - img "Eevee - 143/191 (GYM)"
    - text: $100,000.00 Eevee - 143/191 (GYM) Southeast Asia Exclusives · 143/191 Common HP 50
  - link "Charizard Star (Delta Species) $27,500.00 Charizard Star (Delta Species) EX Dragon Frontiers · 100/101 Ultra Rare HP 90":
    - /url: /kaart/84198
    - img "Charizard Star (Delta Species)"
    - text: $27,500.00 Charizard Star (Delta Species) EX Dragon Frontiers · 100/101 Ultra Rare HP 90
  - link "Charizard - 9/12 (Box Topper) $12,000.00 Charizard - 9/12 (Box Topper) Jumbo Cards · 009/012 Promo HP 110":
    - /url: /kaart/210851
    - img "Charizard - 9/12 (Box Topper)"
    - text: $12,000.00 Charizard - 9/12 (Box Topper) Jumbo Cards · 009/012 Promo HP 110
  - link "Umbreon (H30) $11,000.00 Umbreon (H30) Skyridge · H30/H32 Holo Rare HP 70":
    - /url: /kaart/90140
    - img "Umbreon (H30)"
    - text: $11,000.00 Umbreon (H30) Skyridge · H30/H32 Holo Rare HP 70
  - 'link "Pikachu - 227/S-P $10,000.00 Pikachu - 227/S-P SWSH: Sword & Shield Promo Cards · 227/S-P Promo HP 60"':
    - /url: /kaart/257103
    - img "Pikachu - 227/S-P"
    - text: "$10,000.00 Pikachu - 227/S-P SWSH: Sword & Shield Promo Cards · 227/S-P Promo HP 60"
  - link "Mewtwo Star $9,200.00 Mewtwo Star EX Holon Phantoms · 103/110 Ultra Rare HP 80":
    - /url: /kaart/87427
    - img "Mewtwo Star"
    - text: $9,200.00 Mewtwo Star EX Holon Phantoms · 103/110 Ultra Rare HP 80
  - link "Torchic Star $6,500.00 Torchic Star EX Team Rocket Returns · 108/109 Ultra Rare HP 70":
    - /url: /kaart/89965
    - img "Torchic Star"
    - text: $6,500.00 Torchic Star EX Team Rocket Returns · 108/109 Ultra Rare HP 70
  - 'link "Mew - R/RGB $6,000.27 Mew - R/RGB ME: 30th Celebration · R/RGB RGB Rare HP 60"':
    - /url: /kaart/717607
    - img "Mew - R/RGB"
    - text: "$6,000.27 Mew - R/RGB ME: 30th Celebration · R/RGB RGB Rare HP 60"
  - link "Mewtwo - 51/108 (Prerelease) [Staff] $4,570.58 Mewtwo - 51/108 (Prerelease) [Staff] XY Promos · 51/108 Promo HP 130":
    - /url: /kaart/126021
    - img "Mewtwo - 51/108 (Prerelease) [Staff]"
    - text: $4,570.58 Mewtwo - 51/108 (Prerelease) [Staff] XY Promos · 51/108 Promo HP 130
  - link "Treecko Star $4,500.00 Treecko Star EX Team Rocket Returns · 109/109 Ultra Rare HP 70":
    - /url: /kaart/90046
    - img "Treecko Star"
    - text: $4,500.00 Treecko Star EX Team Rocket Returns · 109/109 Ultra Rare HP 70
  - link "Latias & Latios GX (Alternate Full Art) $4,499.66 Latias & Latios GX (Alternate Full Art) SM - Team Up · 170/181 Ultra Rare HP 250":
    - /url: /kaart/183899
    - img "Latias & Latios GX (Alternate Full Art)"
    - text: $4,499.66 Latias & Latios GX (Alternate Full Art) SM - Team Up · 170/181 Ultra Rare HP 250
  - 'link "Mew - B/RGB $3,746.75 Mew - B/RGB ME: 30th Celebration · B/RGB RGB Rare HP 60"':
    - /url: /kaart/717609
    - img "Mew - B/RGB"
    - text: "$3,746.75 Mew - B/RGB ME: 30th Celebration · B/RGB RGB Rare HP 60"
  - 'link "Mew - G/RGB $3,738.75 Mew - G/RGB ME: 30th Celebration · G/RGB RGB Rare HP 60"':
    - /url: /kaart/717608
    - img "Mew - G/RGB"
    - text: "$3,738.75 Mew - G/RGB ME: 30th Celebration · G/RGB RGB Rare HP 60"
  - link "Rosa's Encouragement - 084/088 [Finalist] $3,500.00 Rosa's Encouragement - 084/088 [Finalist] Professor Program Promos · 084/088 Promo":
    - /url: /kaart/717550
    - img "Rosa's Encouragement - 084/088 [Finalist]"
    - text: $3,500.00 Rosa's Encouragement - 084/088 [Finalist] Professor Program Promos · 084/088 Promo
  - link "Charizard $2,999.99 Charizard Skyridge · 146/144 Secret Rare HP 110":
    - /url: /kaart/84186
    - img "Charizard"
    - text: $2,999.99 Charizard Skyridge · 146/144 Secret Rare HP 110
  - link "Lugia ex $2,500.00 Lugia ex EX Unseen Forces · 105/115 Ultra Rare HP 100":
    - /url: /kaart/86912
    - img "Lugia ex"
    - text: $2,500.00 Lugia ex EX Unseen Forces · 105/115 Ultra Rare HP 100
  - link "Mudkip Star $2,500.00 Mudkip Star EX Team Rocket Returns · 107/109 Ultra Rare HP 70":
    - /url: /kaart/87616
    - img "Mudkip Star"
    - text: $2,500.00 Mudkip Star EX Team Rocket Returns · 107/109 Ultra Rare HP 70
  - link "Rocket's Mewtwo - 8 [Winner] $2,400.00 Rocket's Mewtwo - 8 [Winner] Best of Promos · 008/009 Promo HP 70":
    - /url: /kaart/167080
    - img "Rocket's Mewtwo - 8 [Winner]"
    - text: $2,400.00 Rocket's Mewtwo - 8 [Winner] Best of Promos · 008/009 Promo HP 70
  - link "Groudon Star $2,339.99 Groudon Star EX Delta Species · 111/113 Ultra Rare HP 90":
    - /url: /kaart/85927
    - img "Groudon Star"
    - text: $2,339.99 Groudon Star EX Delta Species · 111/113 Ultra Rare HP 90
  - 'link "Umbreon VMAX (Alternate Art Secret) $2,326.50 Umbreon VMAX (Alternate Art Secret) SWSH07: Evolving Skies · 215/203 Secret Rare HP 310"':
    - /url: /kaart/246723
    - img "Umbreon VMAX (Alternate Art Secret)"
    - text: "$2,326.50 Umbreon VMAX (Alternate Art Secret) SWSH07: Evolving Skies · 215/203 Secret Rare HP 310"
  - link "Charizard $2,257.87 Charizard Base Set (Shadowless) · 004/102 Holo Rare HP 120":
    - /url: /kaart/106999
    - img "Charizard"
    - text: $2,257.87 Charizard Base Set (Shadowless) · 004/102 Holo Rare HP 120
  - 'link "Gengar - SWSH241 (Prerelease) (Staff) $2,199.99 Gengar - SWSH241 (Prerelease) (Staff) SWSH: Sword & Shield Promo Cards · SWSH241 Promo HP 120"':
    - /url: /kaart/607368
    - img "Gengar - SWSH241 (Prerelease) (Staff)"
    - text: "$2,199.99 Gengar - SWSH241 (Prerelease) (Staff) SWSH: Sword & Shield Promo Cards · SWSH241 Promo HP 120"
  - link "Gengar & Mimikyu GX (Alternate Full Art) $2,155.56 Gengar & Mimikyu GX (Alternate Full Art) SM - Team Up · 165/181 Ultra Rare HP 240":
    - /url: /kaart/183830
    - img "Gengar & Mimikyu GX (Alternate Full Art)"
    - text: $2,155.56 Gengar & Mimikyu GX (Alternate Full Art) SM - Team Up · 165/181 Ultra Rare HP 240
  - link "Torchic - 3/5 $2,000.00 Torchic - 3/5 Kids WB Promos · 003/005 Promo HP 60":
    - /url: /kaart/162270
    - img "Torchic - 3/5"
    - text: $2,000.00 Torchic - 3/5 Kids WB Promos · 003/005 Promo HP 60
  - link "Jolteon Star $1,750.00 Jolteon Star EX Power Keepers · 101/108 Ultra Rare HP 70":
    - /url: /kaart/86351
    - img "Jolteon Star"
    - text: $1,750.00 Jolteon Star EX Power Keepers · 101/108 Ultra Rare HP 70
  - link "Flareon Star $1,700.00 Flareon Star EX Power Keepers · 100/108 Ultra Rare HP 70":
    - /url: /kaart/85503
    - img "Flareon Star"
    - text: $1,700.00 Flareon Star EX Power Keepers · 100/108 Ultra Rare HP 70
  - link "Raikou Star $1,600.00 Raikou Star EX Unseen Forces · 114/115 Ultra Rare HP 80":
    - /url: /kaart/88537
    - img "Raikou Star"
    - text: $1,600.00 Raikou Star EX Unseen Forces · 114/115 Ultra Rare HP 80
  - link "Houndoom (H11) $1,571.99 Houndoom (H11) Aquapolis · H11/H32 Holo Rare HP 70":
    - /url: /kaart/86199
    - img "Houndoom (H11)"
    - text: $1,571.99 Houndoom (H11) Aquapolis · H11/H32 Holo Rare HP 70
  - link "Champions Festival - BW95 (Worlds 13) [Top 16] $1,495.00 Champions Festival - BW95 (Worlds 13) [Top 16] Black and White Promos · BW95 Promo":
    - /url: /kaart/96568
    - img "Champions Festival - BW95 (Worlds 13) [Top 16]"
    - text: $1,495.00 Champions Festival - BW95 (Worlds 13) [Top 16] Black and White Promos · BW95 Promo
  - link "Rosa's Encouragement - 084/088 [Top 8] $1,450.00 Rosa's Encouragement - 084/088 [Top 8] Professor Program Promos · 084/088 Promo":
    - /url: /kaart/717548
    - img "Rosa's Encouragement - 084/088 [Top 8]"
    - text: $1,450.00 Rosa's Encouragement - 084/088 [Top 8] Professor Program Promos · 084/088 Promo
  - link "Tropical Tidal Wave - HGSS18 (Worlds 10) [Staff] $1,400.00 Tropical Tidal Wave - HGSS18 (Worlds 10) [Staff] HGSS Promos · HGSS18 Promo":
    - /url: /kaart/97703
    - img "Tropical Tidal Wave - HGSS18 (Worlds 10) [Staff]"
    - text: $1,400.00 Tropical Tidal Wave - HGSS18 (Worlds 10) [Staff] HGSS Promos · HGSS18 Promo
  - link "Gengar ex $1,399.99 Gengar ex EX FireRed & LeafGreen · 108/112 Ultra Rare HP 150":
    - /url: /kaart/85680
    - img "Gengar ex"
    - text: $1,399.99 Gengar ex EX FireRed & LeafGreen · 108/112 Ultra Rare HP 150
  - link "Vaporeon Star $1,399.95 Vaporeon Star EX Power Keepers · 102/108 Ultra Rare HP 70":
    - /url: /kaart/90292
    - img "Vaporeon Star"
    - text: $1,399.95 Vaporeon Star EX Power Keepers · 102/108 Ultra Rare HP 70
  - link "Lugia EX (Team Plasma) (134 Full Art) $1,344.25 Lugia EX (Team Plasma) (134 Full Art) Plasma Storm · 134/135 Ultra Rare HP 180":
    - /url: /kaart/86916
    - img "Lugia EX (Team Plasma) (134 Full Art)"
    - text: $1,344.25 Lugia EX (Team Plasma) (134 Full Art) Plasma Storm · 134/135 Ultra Rare HP 180
  - link "Gyarados Star (Delta Species) $1,333.56 Gyarados Star (Delta Species) EX Holon Phantoms · 102/110 Ultra Rare HP 80":
    - /url: /kaart/86003
    - img "Gyarados Star (Delta Species)"
    - text: $1,333.56 Gyarados Star (Delta Species) EX Holon Phantoms · 102/110 Ultra Rare HP 80
  - link "Shining Charizard $1,300.00 Shining Charizard Neo Destiny · 107/105 Secret Rare HP 100":
    - /url: /kaart/89163
    - img "Shining Charizard"
    - text: $1,300.00 Shining Charizard Neo Destiny · 107/105 Secret Rare HP 100
  - 'link "Rayquaza VMAX (Alternate Art Secret) $1,278.52 Rayquaza VMAX (Alternate Art Secret) SWSH07: Evolving Skies · 218/203 Secret Rare HP 320"':
    - /url: /kaart/246733
    - img "Rayquaza VMAX (Alternate Art Secret)"
    - text: "$1,278.52 Rayquaza VMAX (Alternate Art Secret) SWSH07: Evolving Skies · 218/203 Secret Rare HP 320"
  - link "Umbreon (H29) $1,252.62 Umbreon (H29) Aquapolis · H29/H32 Holo Rare HP 80":
    - /url: /kaart/90139
    - img "Umbreon (H29)"
    - text: $1,252.62 Umbreon (H29) Aquapolis · H29/H32 Holo Rare HP 80
  - 'link "Umbreon ex - 161/131 $1,250.07 Umbreon ex - 161/131 SV: Prismatic Evolutions · 161/131 Special Illustration Rare HP 280"':
    - /url: /kaart/610516
    - img "Umbreon ex - 161/131"
    - text: "$1,250.07 Umbreon ex - 161/131 SV: Prismatic Evolutions · 161/131 Special Illustration Rare HP 280"
  - link "Rayquaza $1,250.00 Rayquaza Dragons Exalted · 128/124 Secret Rare HP 120":
    - /url: /kaart/88630
    - img "Rayquaza"
    - text: $1,250.00 Rayquaza Dragons Exalted · 128/124 Secret Rare HP 120
  - link "Charizard - SM158 [Staff] $1,250.00 Charizard - SM158 [Staff] SM Promos · SM158 Promo HP 150":
    - /url: /kaart/183967
    - img "Charizard - SM158 [Staff]"
    - text: $1,250.00 Charizard - SM158 [Staff] SM Promos · SM158 Promo HP 150
  - link "Charizard VMAX - 020/189 $1,233.33 Charizard VMAX - 020/189 Prize Pack Series Cards · 020/189 Ultra Rare HP 330":
    - /url: /kaart/475983
    - img "Charizard VMAX - 020/189"
    - text: $1,233.33 Charizard VMAX - 020/189 Prize Pack Series Cards · 020/189 Ultra Rare HP 330
  - link "Nidoking (150) $1,200.00 Nidoking (150) Aquapolis · 150/147 Secret Rare HP 100":
    - /url: /kaart/87695
    - img "Nidoking (150)"
    - text: $1,200.00 Nidoking (150) Aquapolis · 150/147 Secret Rare HP 100
  - link "Raichu - 27/99 (Prerelease) [Staff] $1,200.00 Raichu - 27/99 (Prerelease) [Staff] Nintendo Promos · 27/99 Promo HP 90":
    - /url: /kaart/221179
    - img "Raichu - 27/99 (Prerelease) [Staff]"
    - text: $1,200.00 Raichu - 27/99 (Prerelease) [Staff] Nintendo Promos · 27/99 Promo HP 90
  - link "Ultra Ball $1,199.51 Ultra Ball Plasma Freeze · 122/116 Secret Rare HP 0":
    - /url: /kaart/90135
    - img "Ultra Ball"
    - text: $1,199.51 Ultra Ball Plasma Freeze · 122/116 Secret Rare HP 0
  - link "M Rayquaza EX (Shiny Full Art) $1,172.00 M Rayquaza EX (Shiny Full Art) XY - Ancient Origins · 98/98 Ultra Rare HP 220":
    - /url: /kaart/101520
    - img "M Rayquaza EX (Shiny Full Art)"
    - text: $1,172.00 M Rayquaza EX (Shiny Full Art) XY - Ancient Origins · 98/98 Ultra Rare HP 220
  - link "Rocket's Mewtwo ex $1,150.00 Rocket's Mewtwo ex EX Team Rocket Returns · 99/109 Ultra Rare HP 100":
    - /url: /kaart/88778
    - img "Rocket's Mewtwo ex"
    - text: $1,150.00 Rocket's Mewtwo ex EX Team Rocket Returns · 99/109 Ultra Rare HP 100
  - link "Suicune Star $1,100.00 Suicune Star EX Unseen Forces · 115/115 Ultra Rare HP 80":
    - /url: /kaart/89608
    - img "Suicune Star"
    - text: $1,100.00 Suicune Star EX Unseen Forces · 115/115 Ultra Rare HP 80
  - link "Rocket's Zapdos ex $1,079.99 Rocket's Zapdos ex EX Team Rocket Returns · 106/109 Ultra Rare HP 100":
    - /url: /kaart/88801
    - img "Rocket's Zapdos ex"
    - text: $1,079.99 Rocket's Zapdos ex EX Team Rocket Returns · 106/109 Ultra Rare HP 100
  - link "Entei Star $1,067.00 Entei Star EX Unseen Forces · 113/115 Ultra Rare HP 80":
    - /url: /kaart/85275
    - img "Entei Star"
    - text: $1,067.00 Entei Star EX Unseen Forces · 113/115 Ultra Rare HP 80
  - 'link "Gengar VMAX (Alternate Art Secret) $1,027.32 Gengar VMAX (Alternate Art Secret) SWSH08: Fusion Strike · 271/264 Secret Rare HP 320"':
    - /url: /kaart/253266
    - img "Gengar VMAX (Alternate Art Secret)"
    - text: "$1,027.32 Gengar VMAX (Alternate Art Secret) SWSH08: Fusion Strike · 271/264 Secret Rare HP 320"
  - link "Dialga EX (122 Secret Rare) $1,022.31 Dialga EX (122 Secret Rare) XY - Phantom Forces · 122/119 Secret Rare HP 180":
    - /url: /kaart/94689
    - img "Dialga EX (122 Secret Rare)"
    - text: $1,022.31 Dialga EX (122 Secret Rare) XY - Phantom Forces · 122/119 Secret Rare HP 180
  - 'link "Pikachu with Grey Felt Hat $1,000.59 Pikachu with Grey Felt Hat SV: Scarlet & Violet Promo Cards · 085 Promo HP 60"':
    - /url: /kaart/518861
    - img "Pikachu with Grey Felt Hat"
    - text: "$1,000.59 Pikachu with Grey Felt Hat SV: Scarlet & Violet Promo Cards · 085 Promo HP 60"
  - link "Gengar (Library Exclusive) $1,000.00 Gengar (Library Exclusive) Miscellaneous Cards & Products · 085/202 Holo Rare HP 110":
    - /url: /kaart/694960
    - img "Gengar (Library Exclusive)"
    - text: $1,000.00 Gengar (Library Exclusive) Miscellaneous Cards & Products · 085/202 Holo Rare HP 110
  - 'link "Paradise Resort - 092 (World Championships 2026) [Staff] $1,000.00 Paradise Resort - 092 (World Championships 2026) [Staff] ME: Mega Evolution Promo · 092 Promo"':
    - /url: /kaart/714598
    - img "Paradise Resort - 092 (World Championships 2026) [Staff]"
    - text: "$1,000.00 Paradise Resort - 092 (World Championships 2026) [Staff] ME: Mega Evolution Promo · 092 Promo"
  - link "Celebi ex $999.99 Celebi ex EX Unseen Forces · 117/115 Secret Rare HP 70":
    - /url: /kaart/84150
    - img "Celebi ex"
    - text: $999.99 Celebi ex EX Unseen Forces · 117/115 Secret Rare HP 70
  - link "Rayquaza ex $999.00 Rayquaza ex EX Deoxys · 102/107 Ultra Rare HP 100":
    - /url: /kaart/88643
    - img "Rayquaza ex"
    - text: $999.00 Rayquaza ex EX Deoxys · 102/107 Ultra Rare HP 100
  - link "Dragonite - 2/146 (National Championships) [Staff] $997.00 Dragonite - 2/146 (National Championships) [Staff] League & Championship Cards · 002/146 Promo HP 140":
    - /url: /kaart/185033
    - img "Dragonite - 2/146 (National Championships) [Staff]"
    - text: $997.00 Dragonite - 2/146 (National Championships) [Staff] League & Championship Cards · 002/146 Promo HP 140
  - link "Lucario - 53/127 (Prerelease) [Staff] $985.00 Lucario - 53/127 (Prerelease) [Staff] Diamond and Pearl Promos · 53/127 Promo HP 90":
    - /url: /kaart/187216
    - img "Lucario - 53/127 (Prerelease) [Staff]"
    - text: $985.00 Lucario - 53/127 (Prerelease) [Staff] Diamond and Pearl Promos · 53/127 Promo HP 90
  - link "Charizard $954.65 Charizard Base Set · 004/102 Holo Rare HP 120":
    - /url: /kaart/42382
    - img "Charizard"
    - text: $954.65 Charizard Base Set · 004/102 Holo Rare HP 120
  - button "Load 60 more"
  - paragraph: showing 60 of 28,056
- contentinfo:
  - paragraph: Prices from TCGplayer via TCGCSV daily dumps · USD · not affiliated with Nintendo, Creatures or The Pokémon Company.
  - paragraph:
    - link "Sets":
      - /url: /sets
    - link "About & method":
      - /url: /about
- alert
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.describe("catalogue smoke", () => {
  4  |   test("home loads, catalogue renders cards with prices", async ({ page }) => {
  5  |     const errors: string[] = [];
  6  |     page.on("pageerror", (e) => errors.push(String(e)));
  7  | 
  8  |     await page.goto("/");
  9  |     await expect(page.getByRole("heading", { level: 1 })).toContainText(
  10 |       "complete English Pokémon card index",
  11 |     );
  12 | 
  13 |     // wait for the catalogue to hydrate and paint tiles
  14 |     const tiles = page.locator('a[href^="/kaart/"]');
  15 |     await expect(tiles.first()).toBeVisible({ timeout: 30_000 });
  16 |     expect(await tiles.count()).toBeGreaterThan(20);
  17 | 
  18 |     // a price badge is present on at least one tile
> 19 |     await expect(page.locator("text=/\\$\\d/").first()).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  20 | 
  21 |     expect(errors, `uncaught JS errors: ${errors.join(" | ")}`).toHaveLength(0);
  22 |   });
  23 | 
  24 |   test("search narrows the result set", async ({ page }) => {
  25 |     await page.goto("/");
  26 |     const count = page.locator("strong.tabular-nums").first();
  27 |     await expect(count).toBeVisible({ timeout: 30_000 });
  28 |     const before = await count.innerText();
  29 | 
  30 |     await page.getByPlaceholder(/Search 28,000/).fill("charizard");
  31 |     await page.waitForTimeout(700);
  32 | 
  33 |     const after = await count.innerText();
  34 |     expect(Number(after.replace(/,/g, ""))).toBeLessThan(Number(before.replace(/,/g, "")));
  35 |     expect(Number(after.replace(/,/g, ""))).toBeGreaterThan(10);
  36 | 
  37 |     await expect(page.locator('a[href^="/kaart/"]').first()).toBeVisible();
  38 |     await expect(page.locator("body")).toContainText(/charizard/i);
  39 |   });
  40 | 
  41 |   test("filters and sorting work and land in the URL", async ({ page }) => {
  42 |     await page.goto("/?rar=Secret%20Rare&sort=price-desc");
  43 |     await expect(page.locator('a[href^="/kaart/"]').first()).toBeVisible({ timeout: 30_000 });
  44 |     await expect(page.locator("body")).toContainText("Secret Rare");
  45 | 
  46 |     // price-desc: first tile price >= second tile price
  47 |     const prices = await page
  48 |       .locator('a[href^="/kaart/"] .text-poke-gold')
  49 |       .allInnerTexts();
  50 |     const nums = prices
  51 |       .slice(0, 6)
  52 |       .map((t) => Number(t.replace(/[^0-9.]/g, "")))
  53 |       .filter((n) => !Number.isNaN(n));
  54 |     expect(nums.length).toBeGreaterThan(2);
  55 |     const sorted = [...nums].sort((a, b) => b - a);
  56 |     expect(nums).toEqual(sorted);
  57 |   });
  58 | 
  59 |   test("card detail page shows price table and metadata", async ({ page }) => {
  60 |     await page.goto("/?q=charizard");
  61 |     const first = page.locator('a[href^="/kaart/"]').first();
  62 |     await expect(first).toBeVisible({ timeout: 30_000 });
  63 |     await first.click();
  64 | 
  65 |     await expect(page).toHaveURL(/\/kaart\/\d+/);
  66 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  67 |     await expect(page.locator("body")).toContainText(/Market price/i);
  68 |     await expect(page.locator("body")).toContainText(/Prices by print/i);
  69 |     await expect(page.locator("body")).toContainText(/Price history/i);
  70 |     await expect(page.locator("body")).toContainText(/TCGplayer/i);
  71 |   });
  72 | 
  73 |   test("sets page lists sets and links into the catalogue", async ({ page }) => {
  74 |     await page.goto("/sets");
  75 |     await expect(page.getByRole("heading", { level: 1 })).toContainText("Sets");
  76 |     const rows = page.locator("tbody tr");
  77 |     await expect(rows.first()).toBeVisible();
  78 |     expect(await rows.count()).toBeGreaterThan(100);
  79 |   });
  80 | 
  81 |   test("about page explains the method", async ({ page }) => {
  82 |     await page.goto("/about");
  83 |     await expect(page.getByRole("heading", { level: 1 })).toContainText("About");
  84 |     await expect(page.locator("body")).toContainText("TCGCSV");
  85 |   });
  86 | 
  87 |   test("no horizontal overflow on the current viewport", async ({ page }) => {
  88 |     for (const path of ["/", "/sets", "/about"]) {
  89 |       await page.goto(path);
  90 |       await page.waitForTimeout(1500);
  91 |       const overflow = await page.evaluate(
  92 |         () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  93 |       );
  94 |       expect(overflow, `horizontal overflow on ${path}: ${overflow}px`).toBeLessThanOrEqual(2);
  95 |     }
  96 |   });
  97 | });
  98 | 
```