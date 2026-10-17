# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> catalogue smoke >> search narrows the result set
- Location: e2e/smoke.spec.ts:24:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 0
Received:   205
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "Carddex" [ref=e5] [cursor=pointer]:
          - /url: /
        - generic [ref=e9]:
          - generic [ref=e10]: 28,056 cards · 213 sets
          - generic [ref=e11]: USD market prices, refreshed daily
    - main [ref=e12]:
      - generic [ref=e14]:
        - heading "The complete English Pokémon card index" [level=1] [ref=e15]
        - paragraph [ref=e16]: Every single card in the English Pokémon TCG catalogue with its current market price, searchable, filterable and sortable. 28,056 cards across 213 sets · prices in USD · last refresh 2026-10-17.
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]:
              - textbox "Search 28,000+ cards — name, set or card number (e.g. Charizard, 4/102)" [active] [ref=e21]: charizard
              - button "Clear search" [ref=e22]
            - generic [ref=e26]:
              - button "Filters 1" [ref=e27]:
                - text: Filters
                - generic [ref=e29]: "1"
              - combobox [ref=e30]:
                - 'option "Price: high → low" [selected]'
                - 'option "Price: low → high"'
                - 'option "Name: A → Z"'
                - 'option "Name: Z → A"'
                - 'option "Set: newest first"'
                - 'option "Set: oldest first"'
                - 'option "Rarity: rarest first"'
                - option "Card number"
          - generic [ref=e31]:
            - generic [ref=e32]:
              - strong [ref=e33]: "205"
              - text: cards
            - generic [ref=e34]: of 28,056 · snapshot 2026-10-17 · 213 sets
            - button "clear 1 filter" [ref=e35]
        - generic [ref=e37]:
          - generic [ref=e38]:
            - link "Charizard Star (Delta Species) $27,500.00 Charizard Star (Delta Species) EX Dragon Frontiers · 100/101 Ultra Rare HP 90" [ref=e39] [cursor=pointer]:
              - /url: /kaart/84198
              - generic [ref=e40]:
                - img "Charizard Star (Delta Species)" [ref=e41]
                - generic [ref=e42]: $27,500.00
              - generic [ref=e43]:
                - generic [ref=e44]: Charizard Star (Delta Species)
                - generic [ref=e45]: EX Dragon Frontiers · 100/101
                - generic [ref=e46]:
                  - generic [ref=e47]: Ultra Rare
                  - generic [ref=e48]: HP 90
            - link "Charizard - 9/12 (Box Topper) $12,000.00 Charizard - 9/12 (Box Topper) Jumbo Cards · 009/012 Promo HP 110" [ref=e49] [cursor=pointer]:
              - /url: /kaart/210851
              - generic [ref=e50]:
                - img "Charizard - 9/12 (Box Topper)" [ref=e51]
                - generic [ref=e52]: $12,000.00
              - generic [ref=e53]:
                - generic [ref=e54]: Charizard - 9/12 (Box Topper)
                - generic [ref=e55]: Jumbo Cards · 009/012
                - generic [ref=e56]:
                  - generic [ref=e57]: Promo
                  - generic [ref=e58]: HP 110
            - link "Charizard $2,999.99 Charizard Skyridge · 146/144 Secret Rare HP 110" [ref=e59] [cursor=pointer]:
              - /url: /kaart/84186
              - generic [ref=e60]:
                - img "Charizard" [ref=e61]
                - generic [ref=e62]: $2,999.99
              - generic [ref=e63]:
                - generic [ref=e64]: Charizard
                - generic [ref=e65]: Skyridge · 146/144
                - generic [ref=e66]:
                  - generic [ref=e67]: Secret Rare
                  - generic [ref=e68]: HP 110
            - link "Charizard $2,257.87 Charizard Base Set (Shadowless) · 004/102 Holo Rare HP 120" [ref=e69] [cursor=pointer]:
              - /url: /kaart/106999
              - generic [ref=e70]:
                - img "Charizard" [ref=e71]
                - generic [ref=e72]: $2,257.87
              - generic [ref=e73]:
                - generic [ref=e74]: Charizard
                - generic [ref=e75]: Base Set (Shadowless) · 004/102
                - generic [ref=e76]:
                  - generic [ref=e77]: Holo Rare
                  - generic [ref=e78]: HP 120
            - link "Shining Charizard $1,300.00 Shining Charizard Neo Destiny · 107/105 Secret Rare HP 100" [ref=e79] [cursor=pointer]:
              - /url: /kaart/89163
              - generic [ref=e80]:
                - img "Shining Charizard" [ref=e81]
                - generic [ref=e82]: $1,300.00
              - generic [ref=e83]:
                - generic [ref=e84]: Shining Charizard
                - generic [ref=e85]: Neo Destiny · 107/105
                - generic [ref=e86]:
                  - generic [ref=e87]: Secret Rare
                  - generic [ref=e88]: HP 100
            - link "Charizard - SM158 [Staff] $1,250.00 Charizard - SM158 [Staff] SM Promos · SM158 Promo HP 150" [ref=e89] [cursor=pointer]:
              - /url: /kaart/183967
              - generic [ref=e90]:
                - img "Charizard - SM158 [Staff]" [ref=e91]
                - generic [ref=e92]: $1,250.00
              - generic [ref=e93]:
                - generic [ref=e94]: Charizard - SM158 [Staff]
                - generic [ref=e95]: SM Promos · SM158
                - generic [ref=e96]:
                  - generic [ref=e97]: Promo
                  - generic [ref=e98]: HP 150
            - link "Charizard VMAX - 020/189 $1,233.33 Charizard VMAX - 020/189 Prize Pack Series Cards · 020/189 Ultra Rare HP 330" [ref=e99] [cursor=pointer]:
              - /url: /kaart/475983
              - generic [ref=e100]:
                - img "Charizard VMAX - 020/189" [ref=e101]
                - generic [ref=e102]: $1,233.33
              - generic [ref=e103]:
                - generic [ref=e104]: Charizard VMAX - 020/189
                - generic [ref=e105]: Prize Pack Series Cards · 020/189
                - generic [ref=e106]:
                  - generic [ref=e107]: Ultra Rare
                  - generic [ref=e108]: HP 330
            - link "Charizard $954.65 Charizard Base Set · 004/102 Holo Rare HP 120" [ref=e109] [cursor=pointer]:
              - /url: /kaart/42382
              - generic [ref=e110]:
                - img "Charizard" [ref=e111]
                - generic [ref=e112]: $954.65
              - generic [ref=e113]:
                - generic [ref=e114]: Charizard
                - generic [ref=e115]: Base Set · 004/102
                - generic [ref=e116]:
                  - generic [ref=e117]: Holo Rare
                  - generic [ref=e118]: HP 120
            - link "Charizard - S1/S4 (Box Topper) $900.00 Charizard - S1/S4 (Box Topper) Jumbo Cards · S1/S4 Promo HP 120" [ref=e119] [cursor=pointer]:
              - /url: /kaart/210841
              - generic [ref=e120]:
                - img "Charizard - S1/S4 (Box Topper)" [ref=e121]
                - generic [ref=e122]: $900.00
              - generic [ref=e123]:
                - generic [ref=e124]: Charizard - S1/S4 (Box Topper)
                - generic [ref=e125]: Jumbo Cards · S1/S4
                - generic [ref=e126]:
                  - generic [ref=e127]: Promo
                  - generic [ref=e128]: HP 120
            - link "Charizard (Black Dot Error) $899.99 Charizard (Black Dot Error) Base Set · 004/102 Holo Rare HP 120" [ref=e129] [cursor=pointer]:
              - /url: /kaart/657516
              - generic [ref=e130]:
                - img "Charizard (Black Dot Error)" [ref=e131]
                - generic [ref=e132]: $899.99
              - generic [ref=e133]:
                - generic [ref=e134]: Charizard (Black Dot Error)
                - generic [ref=e135]: Base Set · 004/102
                - generic [ref=e136]:
                  - generic [ref=e137]: Holo Rare
                  - generic [ref=e138]: HP 120
            - link "Charizard $899.99 Charizard Legendary Collection · 003/110 Holo Rare HP 120" [ref=e139] [cursor=pointer]:
              - /url: /kaart/84196
              - generic [ref=e140]:
                - img "Charizard" [ref=e141]
                - generic [ref=e142]: $899.99
              - generic [ref=e143]:
                - generic [ref=e144]: Charizard
                - generic [ref=e145]: Legendary Collection · 003/110
                - generic [ref=e146]:
                  - generic [ref=e147]: Holo Rare
                  - generic [ref=e148]: HP 120
            - link "Charizard GX (Secret) $840.75 Charizard GX (Secret) SM - Burning Shadows · 150/147 Rainbow Rare HP 250" [ref=e149] [cursor=pointer]:
              - /url: /kaart/138497
              - generic [ref=e150]:
                - img "Charizard GX (Secret)" [ref=e151]
                - generic [ref=e152]: $840.75
              - generic [ref=e153]:
                - generic [ref=e154]: Charizard GX (Secret)
                - generic [ref=e155]: SM - Burning Shadows · 150/147
                - generic [ref=e156]:
                  - generic [ref=e157]: Rainbow Rare
                  - generic [ref=e158]: HP 250
            - link "M Charizard EX (X) (Secret) $802.12 M Charizard EX (X) (Secret) XY - Flashfire · 108/106 Secret Rare HP 230" [ref=e159] [cursor=pointer]:
              - /url: /kaart/91246
              - generic [ref=e160]:
                - img "M Charizard EX (X) (Secret)" [ref=e161]
                - generic [ref=e162]: $802.12
              - generic [ref=e163]:
                - generic [ref=e164]: M Charizard EX (X) (Secret)
                - generic [ref=e165]: XY - Flashfire · 108/106
                - generic [ref=e166]:
                  - generic [ref=e167]: Secret Rare
                  - generic [ref=e168]: HP 230
            - 'link "Charizard GX $768.10 Charizard GX Hidden Fates: Shiny Vault · SV49/SV94 Shiny Holo Rare HP 250" [ref=e169] [cursor=pointer]':
              - /url: /kaart/197780
              - generic [ref=e170]:
                - img "Charizard GX" [ref=e171]
                - generic [ref=e172]: $768.10
              - generic [ref=e173]:
                - generic [ref=e174]: Charizard GX
                - generic [ref=e175]: "Hidden Fates: Shiny Vault · SV49/SV94"
                - generic [ref=e176]:
                  - generic [ref=e177]: Shiny Holo Rare
                  - generic [ref=e178]: HP 250
            - link "Charizard $737.50 Charizard Stormfront · 103/100 Secret Rare HP 120" [ref=e179] [cursor=pointer]:
              - /url: /kaart/84190
              - generic [ref=e180]:
                - img "Charizard" [ref=e181]
                - generic [ref=e182]: $737.50
              - generic [ref=e183]:
                - generic [ref=e184]: Charizard
                - generic [ref=e185]: Stormfront · 103/100
                - generic [ref=e186]:
                  - generic [ref=e187]: Secret Rare
                  - generic [ref=e188]: HP 120
            - link "Charizard $649.98 Charizard Plasma Storm · 136/135 Secret Rare HP 160" [ref=e189] [cursor=pointer]:
              - /url: /kaart/84193
              - generic [ref=e190]:
                - img "Charizard" [ref=e191]
                - generic [ref=e192]: $649.98
              - generic [ref=e193]:
                - generic [ref=e194]: Charizard
                - generic [ref=e195]: Plasma Storm · 136/135
                - generic [ref=e196]:
                  - generic [ref=e197]: Secret Rare
                  - generic [ref=e198]: HP 160
            - 'link "Charizard - SWSH066 (Prerelease) [Staff] $621.21 Charizard - SWSH066 (Prerelease) [Staff] SWSH: Sword & Shield Promo Cards · SWSH066 Promo HP 170" [ref=e199] [cursor=pointer]':
              - /url: /kaart/224366
              - generic [ref=e200]:
                - img "Charizard - SWSH066 (Prerelease) [Staff]" [ref=e201]
                - generic [ref=e202]: $621.21
              - generic [ref=e203]:
                - generic [ref=e204]: Charizard - SWSH066 (Prerelease) [Staff]
                - generic [ref=e205]: "SWSH: Sword & Shield Promo Cards · SWSH066"
                - generic [ref=e206]:
                  - generic [ref=e207]: Promo
                  - generic [ref=e208]: HP 170
            - 'link "Mega Charizard X ex - 125/094 $603.80 Mega Charizard X ex - 125/094 ME02: Phantasmal Flames · 125/094 Special Illustration Rare HP 360" [ref=e209] [cursor=pointer]':
              - /url: /kaart/662184
              - generic [ref=e210]:
                - img "Mega Charizard X ex - 125/094" [ref=e211]
                - generic [ref=e212]: $603.80
              - generic [ref=e213]:
                - generic [ref=e214]: Mega Charizard X ex - 125/094
                - generic [ref=e215]: "ME02: Phantasmal Flames · 125/094"
                - generic [ref=e216]:
                  - generic [ref=e217]: Special Illustration Rare
                  - generic [ref=e218]: HP 360
            - link "Blaine's Charizard $586.76 Blaine's Charizard Gym Challenge · 002/132 Holo Rare HP 100" [ref=e219] [cursor=pointer]:
              - /url: /kaart/83861
              - generic [ref=e220]:
                - img "Blaine's Charizard" [ref=e221]
                - generic [ref=e222]: $586.76
              - generic [ref=e223]:
                - generic [ref=e224]: Blaine's Charizard
                - generic [ref=e225]: Gym Challenge · 002/132
                - generic [ref=e226]:
                  - generic [ref=e227]: Holo Rare
                  - generic [ref=e228]: HP 100
            - link "Charizard (Delta Species) $564.76 Charizard (Delta Species) EX Crystal Guardians · 4/100 Holo Rare HP 120" [ref=e229] [cursor=pointer]:
              - /url: /kaart/84195
              - generic [ref=e230]:
                - img "Charizard (Delta Species)" [ref=e231]
                - generic [ref=e232]: $564.76
              - generic [ref=e233]:
                - generic [ref=e234]: Charizard (Delta Species)
                - generic [ref=e235]: EX Crystal Guardians · 4/100
                - generic [ref=e236]:
                  - generic [ref=e237]: Holo Rare
                  - generic [ref=e238]: HP 120
            - link "Charizard ex $500.00 Charizard ex EX FireRed & LeafGreen · 105/112 Ultra Rare HP 160" [ref=e239] [cursor=pointer]:
              - /url: /kaart/84199
              - generic [ref=e240]:
                - img "Charizard ex" [ref=e241]
                - generic [ref=e242]: $500.00
              - generic [ref=e243]:
                - generic [ref=e244]: Charizard ex
                - generic [ref=e245]: EX FireRed & LeafGreen · 105/112
                - generic [ref=e246]:
                  - generic [ref=e247]: Ultra Rare
                  - generic [ref=e248]: HP 160
            - link "Charizard $489.99 Charizard EX Dragon · 100/97 Secret Rare HP 120" [ref=e249] [cursor=pointer]:
              - /url: /kaart/84187
              - generic [ref=e250]:
                - img "Charizard" [ref=e251]
                - generic [ref=e252]: $489.99
              - generic [ref=e253]:
                - generic [ref=e254]: Charizard
                - generic [ref=e255]: EX Dragon · 100/97
                - generic [ref=e256]:
                  - generic [ref=e257]: Secret Rare
                  - generic [ref=e258]: HP 120
            - link "Charizard (XY Evolutions Prerelease) $479.99 Charizard (XY Evolutions Prerelease) XY Promos · 11/108 Promo HP 150" [ref=e259] [cursor=pointer]:
              - /url: /kaart/126022
              - generic [ref=e260]:
                - img "Charizard (XY Evolutions Prerelease)" [ref=e261]
                - generic [ref=e262]: $479.99
              - generic [ref=e263]:
                - generic [ref=e264]: Charizard (XY Evolutions Prerelease)
                - generic [ref=e265]: XY Promos · 11/108
                - generic [ref=e266]:
                  - generic [ref=e267]: Promo
                  - generic [ref=e268]: HP 150
            - link "Charizard G Lv.X $450.72 Charizard G Lv.X Supreme Victors · 143 Ultra Rare HP 120" [ref=e269] [cursor=pointer]:
              - /url: /kaart/84201
              - generic [ref=e270]:
                - img "Charizard G Lv.X" [ref=e271]
                - generic [ref=e272]: $450.72
              - generic [ref=e273]:
                - generic [ref=e274]: Charizard G Lv.X
                - generic [ref=e275]: Supreme Victors · 143
                - generic [ref=e276]:
                  - generic [ref=e277]: Ultra Rare
                  - generic [ref=e278]: HP 120
            - link "Charizard (6) $436.08 Charizard (6) Expedition · 006/165 Holo Rare HP 120" [ref=e279] [cursor=pointer]:
              - /url: /kaart/84183
              - generic [ref=e280]:
                - img "Charizard (6)" [ref=e281]
                - generic [ref=e282]: $436.08
              - generic [ref=e283]:
                - generic [ref=e284]: Charizard (6)
                - generic [ref=e285]: Expedition · 006/165
                - generic [ref=e286]:
                  - generic [ref=e287]: Holo Rare
                  - generic [ref=e288]: HP 120
            - link "Charizard $419.79 Charizard Base Set 2 · 004/130 Holo Rare HP 120" [ref=e289] [cursor=pointer]:
              - /url: /kaart/42479
              - generic [ref=e290]:
                - img "Charizard" [ref=e291]
                - generic [ref=e292]: $419.79
              - generic [ref=e293]:
                - generic [ref=e294]: Charizard
                - generic [ref=e295]: Base Set 2 · 004/130
                - generic [ref=e296]:
                  - generic [ref=e297]: Holo Rare
                  - generic [ref=e298]: HP 120
            - link "Charizard VSTAR - 018/172 $399.29 Charizard VSTAR - 018/172 Prize Pack Series Cards · 018/172 Ultra Rare HP 280" [ref=e299] [cursor=pointer]:
              - /url: /kaart/489291
              - generic [ref=e300]:
                - img "Charizard VSTAR - 018/172" [ref=e301]
                - generic [ref=e302]: $399.29
              - generic [ref=e303]:
                - generic [ref=e304]: Charizard VSTAR - 018/172
                - generic [ref=e305]: Prize Pack Series Cards · 018/172
                - generic [ref=e306]:
                  - generic [ref=e307]: Ultra Rare
                  - generic [ref=e308]: HP 280
            - link "Charizard G LV.X - DP45 $375.69 Charizard G LV.X - DP45 Diamond and Pearl Promos · DP45 Promo HP 120" [ref=e309] [cursor=pointer]:
              - /url: /kaart/84202
              - generic [ref=e310]:
                - img "Charizard G LV.X - DP45" [ref=e311]
                - generic [ref=e312]: $375.69
              - generic [ref=e313]:
                - generic [ref=e314]: Charizard G LV.X - DP45
                - generic [ref=e315]: Diamond and Pearl Promos · DP45
                - generic [ref=e316]:
                  - generic [ref=e317]: Promo
                  - generic [ref=e318]: HP 120
            - link "Radiant Charizard - 020/159 $331.87 Radiant Charizard - 020/159 Prize Pack Series Cards · 020/159 Radiant Rare HP 160" [ref=e319] [cursor=pointer]:
              - /url: /kaart/513804
              - generic [ref=e320]:
                - img "Radiant Charizard - 020/159" [ref=e321]
                - generic [ref=e322]: $331.87
              - generic [ref=e323]:
                - generic [ref=e324]: Radiant Charizard - 020/159
                - generic [ref=e325]: Prize Pack Series Cards · 020/159
                - generic [ref=e326]:
                  - generic [ref=e327]: Radiant Rare
                  - generic [ref=e328]: HP 160
            - link "Charizard (Celebrations Metal Card) $326.77 Charizard (Celebrations Metal Card) Miscellaneous Cards & Products · 004/102 Promo HP 120" [ref=e329] [cursor=pointer]:
              - /url: /kaart/252517
              - generic [ref=e330]:
                - img "Charizard (Celebrations Metal Card)" [ref=e331]
                - generic [ref=e332]: $326.77
              - generic [ref=e333]:
                - generic [ref=e334]: Charizard (Celebrations Metal Card)
                - generic [ref=e335]: Miscellaneous Cards & Products · 004/102
                - generic [ref=e336]:
                  - generic [ref=e337]: Promo
                  - generic [ref=e338]: HP 120
            - 'link "Charizard ex - 199/165 $319.84 Charizard ex - 199/165 SV: Scarlet & Violet 151 · 199/165 Special Illustration Rare HP 330" [ref=e339] [cursor=pointer]':
              - /url: /kaart/517045
              - generic [ref=e340]:
                - img "Charizard ex - 199/165" [ref=e341]
                - generic [ref=e342]: $319.84
              - generic [ref=e343]:
                - generic [ref=e344]: Charizard ex - 199/165
                - generic [ref=e345]: "SV: Scarlet & Violet 151 · 199/165"
                - generic [ref=e346]:
                  - generic [ref=e347]: Special Illustration Rare
                  - generic [ref=e348]: HP 330
            - link "M Charizard EX (Y) (Secret) $313.61 M Charizard EX (Y) (Secret) XY - Flashfire · 107/106 Secret Rare HP 220" [ref=e349] [cursor=pointer]:
              - /url: /kaart/91245
              - generic [ref=e350]:
                - img "M Charizard EX (Y) (Secret)" [ref=e351]
                - generic [ref=e352]: $313.61
              - generic [ref=e353]:
                - generic [ref=e354]: M Charizard EX (Y) (Secret)
                - generic [ref=e355]: XY - Flashfire · 107/106
                - generic [ref=e356]:
                  - generic [ref=e357]: Secret Rare
                  - generic [ref=e358]: HP 220
            - link "Charizard EX (100 Full Art) $295.26 Charizard EX (100 Full Art) XY - Flashfire · 100/106 Ultra Rare HP 180" [ref=e359] [cursor=pointer]:
              - /url: /kaart/91238
              - generic [ref=e360]:
                - img "Charizard EX (100 Full Art)" [ref=e361]
                - generic [ref=e362]: $295.26
              - generic [ref=e363]:
                - generic [ref=e364]: Charizard EX (100 Full Art)
                - generic [ref=e365]: XY - Flashfire · 100/106
                - generic [ref=e366]:
                  - generic [ref=e367]: Ultra Rare
                  - generic [ref=e368]: HP 180
            - link "M Charizard EX (X) $289.80 M Charizard EX (X) XY - Flashfire · 69/106 Ultra Rare HP 230" [ref=e369] [cursor=pointer]:
              - /url: /kaart/91206
              - generic [ref=e370]:
                - img "M Charizard EX (X)" [ref=e371]
                - generic [ref=e372]: $289.80
              - generic [ref=e373]:
                - generic [ref=e374]: M Charizard EX (X)
                - generic [ref=e375]: XY - Flashfire · 69/106
                - generic [ref=e376]:
                  - generic [ref=e377]: Ultra Rare
                  - generic [ref=e378]: HP 230
            - 'link "Charizard V (Alternate Full Art) $275.24 Charizard V (Alternate Full Art) SWSH09: Brilliant Stars · 154/172 Ultra Rare HP 220" [ref=e379] [cursor=pointer]':
              - /url: /kaart/263873
              - generic [ref=e380]:
                - img "Charizard V (Alternate Full Art)" [ref=e381]
                - generic [ref=e382]: $275.24
              - generic [ref=e383]:
                - generic [ref=e384]: Charizard V (Alternate Full Art)
                - generic [ref=e385]: "SWSH09: Brilliant Stars · 154/172"
                - generic [ref=e386]:
                  - generic [ref=e387]: Ultra Rare
                  - generic [ref=e388]: HP 220
            - link "Charizard (Library Exclusive) $275.00 Charizard (Library Exclusive) Miscellaneous Cards & Products · 14/181 Rare HP 150" [ref=e389] [cursor=pointer]:
              - /url: /kaart/695469
              - generic [ref=e390]:
                - img "Charizard (Library Exclusive)" [ref=e391]
                - generic [ref=e392]: $275.00
              - generic [ref=e393]:
                - generic [ref=e394]: Charizard (Library Exclusive)
                - generic [ref=e395]: Miscellaneous Cards & Products · 14/181
                - generic [ref=e396]:
                  - generic [ref=e397]: Rare
                  - generic [ref=e398]: HP 150
            - 'link "Mega Charizard Y ex - 294/217 $273.39 Mega Charizard Y ex - 294/217 ME: Ascended Heroes · 294/217 Mega Hyper Rare HP 360" [ref=e399] [cursor=pointer]':
              - /url: /kaart/676106
              - generic [ref=e400]:
                - img "Mega Charizard Y ex - 294/217" [ref=e401]
                - generic [ref=e402]: $273.39
              - generic [ref=e403]:
                - generic [ref=e404]: Mega Charizard Y ex - 294/217
                - generic [ref=e405]: "ME: Ascended Heroes · 294/217"
                - generic [ref=e406]:
                  - generic [ref=e407]: Mega Hyper Rare
                  - generic [ref=e408]: HP 360
            - link "Charizard V (Secret) $257.72 Charizard V (Secret) Champion's Path · 79/73 Secret Rare HP 220" [ref=e409] [cursor=pointer]:
              - /url: /kaart/223078
              - generic [ref=e410]:
                - img "Charizard V (Secret)" [ref=e411]
                - generic [ref=e412]: $257.72
              - generic [ref=e413]:
                - generic [ref=e414]: Charizard V (Secret)
                - generic [ref=e415]: Champion's Path · 79/73
                - generic [ref=e416]:
                  - generic [ref=e417]: Secret Rare
                  - generic [ref=e418]: HP 220
            - 'link "Charizard ex - 234/091 $257.31 Charizard ex - 234/091 SV: Paldean Fates · 234/091 Special Illustration Rare HP 330" [ref=e419] [cursor=pointer]':
              - /url: /kaart/535090
              - generic [ref=e420]:
                - img "Charizard ex - 234/091" [ref=e421]
                - generic [ref=e422]: $257.31
              - generic [ref=e423]:
                - generic [ref=e424]: Charizard ex - 234/091
                - generic [ref=e425]: "SV: Paldean Fates · 234/091"
                - generic [ref=e426]:
                  - generic [ref=e427]: Special Illustration Rare
                  - generic [ref=e428]: HP 330
            - link "Reshiram & Charizard GX (Secret) $244.36 Reshiram & Charizard GX (Secret) SM - Unbroken Bonds · 217/214 Secret Rare HP 270" [ref=e429] [cursor=pointer]:
              - /url: /kaart/189319
              - generic [ref=e430]:
                - img "Reshiram & Charizard GX (Secret)" [ref=e431]
                - generic [ref=e432]: $244.36
              - generic [ref=e433]:
                - generic [ref=e434]: Reshiram & Charizard GX (Secret)
                - generic [ref=e435]: SM - Unbroken Bonds · 217/214
                - generic [ref=e436]:
                  - generic [ref=e437]: Secret Rare
                  - generic [ref=e438]: HP 270
            - 'link "Special Delivery Charizard - SWSH075 $204.56 Special Delivery Charizard - SWSH075 SWSH: Sword & Shield Promo Cards · SWSH075 Promo HP 160" [ref=e439] [cursor=pointer]':
              - /url: /kaart/282259
              - generic [ref=e440]:
                - img "Special Delivery Charizard - SWSH075" [ref=e441]
                - generic [ref=e442]: $204.56
              - generic [ref=e443]:
                - generic [ref=e444]: Special Delivery Charizard - SWSH075
                - generic [ref=e445]: "SWSH: Sword & Shield Promo Cards · SWSH075"
                - generic [ref=e446]:
                  - generic [ref=e447]: Promo
                  - generic [ref=e448]: HP 160
            - 'link "Mega Charizard X ex - 130/094 $203.13 Mega Charizard X ex - 130/094 ME02: Phantasmal Flames · 130/094 Mega Hyper Rare HP 360" [ref=e449] [cursor=pointer]':
              - /url: /kaart/662185
              - generic [ref=e450]:
                - img "Mega Charizard X ex - 130/094" [ref=e451]
                - generic [ref=e452]: $203.13
              - generic [ref=e453]:
                - generic [ref=e454]: Mega Charizard X ex - 130/094
                - generic [ref=e455]: "ME02: Phantasmal Flames · 130/094"
                - generic [ref=e456]:
                  - generic [ref=e457]: Mega Hyper Rare
                  - generic [ref=e458]: HP 360
            - link "Charizard VMAX (Secret) $200.40 Charizard VMAX (Secret) Champion's Path · 74/73 Secret Rare HP 330" [ref=e459] [cursor=pointer]:
              - /url: /kaart/223073
              - generic [ref=e460]:
                - img "Charizard VMAX (Secret)" [ref=e461]
                - generic [ref=e462]: $200.40
              - generic [ref=e463]:
                - generic [ref=e464]: Charizard VMAX (Secret)
                - generic [ref=e465]: Champion's Path · 74/73
                - generic [ref=e466]:
                  - generic [ref=e467]: Secret Rare
                  - generic [ref=e468]: HP 330
            - link "Charizard (39) $198.32 Charizard (39) Expedition · 039/165 Rare HP 100" [ref=e469] [cursor=pointer]:
              - /url: /kaart/84184
              - generic [ref=e470]:
                - img "Charizard (39)" [ref=e471]
                - generic [ref=e472]: $198.32
              - generic [ref=e473]:
                - generic [ref=e474]: Charizard (39)
                - generic [ref=e475]: Expedition · 039/165
                - generic [ref=e476]:
                  - generic [ref=e477]: Rare
                  - generic [ref=e478]: HP 100
            - link "Charizard EX - XY121 $186.43 Charizard EX - XY121 XY Promos · XY121 Promo HP 180" [ref=e479] [cursor=pointer]:
              - /url: /kaart/117267
              - generic [ref=e480]:
                - img "Charizard EX - XY121" [ref=e481]
                - generic [ref=e482]: $186.43
              - generic [ref=e483]:
                - generic [ref=e484]: Charizard EX - XY121
                - generic [ref=e485]: XY Promos · XY121
                - generic [ref=e486]:
                  - generic [ref=e487]: Promo
                  - generic [ref=e488]: HP 180
            - link "Charizard $184.63 Charizard Trading Card Game Classic · 003/034 Classic Collection HP 120" [ref=e489] [cursor=pointer]:
              - /url: /kaart/527938
              - generic [ref=e490]:
                - img "Charizard" [ref=e491]
                - generic [ref=e492]: $184.63
              - generic [ref=e493]:
                - generic [ref=e494]: Charizard
                - generic [ref=e495]: Trading Card Game Classic · 003/034
                - generic [ref=e496]:
                  - generic [ref=e497]: Classic Collection
                  - generic [ref=e498]: HP 120
            - link "Charizard $176.65 Charizard EX Power Keepers · 6/108 Holo Rare HP 120" [ref=e499] [cursor=pointer]:
              - /url: /kaart/84188
              - generic [ref=e500]:
                - img "Charizard" [ref=e501]
                - generic [ref=e502]: $176.65
              - generic [ref=e503]:
                - generic [ref=e504]: Charizard
                - generic [ref=e505]: EX Power Keepers · 6/108
                - generic [ref=e506]:
                  - generic [ref=e507]: Holo Rare
                  - generic [ref=e508]: HP 120
            - link "Reshiram & Charizard GX - SM201 $173.89 Reshiram & Charizard GX - SM201 SM Promos · SM201 Promo HP 270" [ref=e509] [cursor=pointer]:
              - /url: /kaart/196347
              - generic [ref=e510]:
                - img "Reshiram & Charizard GX - SM201" [ref=e511]
                - generic [ref=e512]: $173.89
              - generic [ref=e513]:
                - generic [ref=e514]: Reshiram & Charizard GX - SM201
                - generic [ref=e515]: SM Promos · SM201
                - generic [ref=e516]:
                  - generic [ref=e517]: Promo
                  - generic [ref=e518]: HP 270
            - link "Charizard - 3/110 (WotC Legendary Collection) $160.26 Charizard - 3/110 (WotC Legendary Collection) Deck Exclusives · 003/110 Rare HP 120" [ref=e519] [cursor=pointer]:
              - /url: /kaart/118404
              - generic [ref=e520]:
                - img "Charizard - 3/110 (WotC Legendary Collection)" [ref=e521]
                - generic [ref=e522]: $160.26
              - generic [ref=e523]:
                - generic [ref=e524]: Charizard - 3/110 (WotC Legendary Collection)
                - generic [ref=e525]: Deck Exclusives · 003/110
                - generic [ref=e526]:
                  - generic [ref=e527]: Rare
                  - generic [ref=e528]: HP 120
            - link "M Charizard EX $159.64 M Charizard EX Generations · 12/83 Ultra Rare HP 220" [ref=e529] [cursor=pointer]:
              - /url: /kaart/113670
              - generic [ref=e530]:
                - img "M Charizard EX" [ref=e531]
                - generic [ref=e532]: $159.64
              - generic [ref=e533]:
                - generic [ref=e534]: M Charizard EX
                - generic [ref=e535]: Generations · 12/83
                - generic [ref=e536]:
                  - generic [ref=e537]: Ultra Rare
                  - generic [ref=e538]: HP 220
            - link "Charizard (40) $149.19 Charizard (40) Expedition · 040/165 Rare HP 120" [ref=e539] [cursor=pointer]:
              - /url: /kaart/84185
              - generic [ref=e540]:
                - img "Charizard (40)" [ref=e541]
                - generic [ref=e542]: $149.19
              - generic [ref=e543]:
                - generic [ref=e544]: Charizard (40)
                - generic [ref=e545]: Expedition · 040/165
                - generic [ref=e546]:
                  - generic [ref=e547]: Rare
                  - generic [ref=e548]: HP 120
            - 'link "Charizard $144.23 Charizard Celebrations: Classic Collection · 4/102 Classic Collection HP 120" [ref=e549] [cursor=pointer]':
              - /url: /kaart/250320
              - generic [ref=e550]:
                - img "Charizard" [ref=e551]
                - generic [ref=e552]: $144.23
              - generic [ref=e553]:
                - generic [ref=e554]: Charizard
                - generic [ref=e555]: "Celebrations: Classic Collection · 4/102"
                - generic [ref=e556]:
                  - generic [ref=e557]: Classic Collection
                  - generic [ref=e558]: HP 120
            - link "Charizard - 19/113 (Cosmos Holo) $138.46 Charizard - 19/113 (Cosmos Holo) Miscellaneous Cards & Products · 019/113 Promo HP 160" [ref=e559] [cursor=pointer]:
              - /url: /kaart/226672
              - generic [ref=e560]:
                - img "Charizard - 19/113 (Cosmos Holo)" [ref=e561]
                - generic [ref=e562]: $138.46
              - generic [ref=e563]:
                - generic [ref=e564]: Charizard - 19/113 (Cosmos Holo)
                - generic [ref=e565]: Miscellaneous Cards & Products · 019/113
                - generic [ref=e566]:
                  - generic [ref=e567]: Promo
                  - generic [ref=e568]: HP 160
            - link "Charizard $137.72 Charizard Secret Wonders · 3/132 Holo Rare HP 130" [ref=e569] [cursor=pointer]:
              - /url: /kaart/84189
              - generic [ref=e570]:
                - img "Charizard" [ref=e571]
                - generic [ref=e572]: $137.72
              - generic [ref=e573]:
                - generic [ref=e574]: Charizard
                - generic [ref=e575]: Secret Wonders · 3/132
                - generic [ref=e576]:
                  - generic [ref=e577]: Holo Rare
                  - generic [ref=e578]: HP 130
            - link "Charizard V - 017/172 $137.52 Charizard V - 017/172 Prize Pack Series Cards · 017/172 Ultra Rare HP 220" [ref=e579] [cursor=pointer]:
              - /url: /kaart/495194
              - generic [ref=e580]:
                - img "Charizard V - 017/172" [ref=e581]
                - generic [ref=e582]: $137.52
              - generic [ref=e583]:
                - generic [ref=e584]: Charizard V - 017/172
                - generic [ref=e585]: Prize Pack Series Cards · 017/172
                - generic [ref=e586]:
                  - generic [ref=e587]: Ultra Rare
                  - generic [ref=e588]: HP 220
            - link "Charizard & Braixen GX (Secret) $137.23 Charizard & Braixen GX (Secret) SM - Cosmic Eclipse · 251/236 Rainbow Rare HP 270" [ref=e589] [cursor=pointer]:
              - /url: /kaart/201611
              - generic [ref=e590]:
                - img "Charizard & Braixen GX (Secret)" [ref=e591]
                - generic [ref=e592]: $137.23
              - generic [ref=e593]:
                - generic [ref=e594]: Charizard & Braixen GX (Secret)
                - generic [ref=e595]: SM - Cosmic Eclipse · 251/236
                - generic [ref=e596]:
                  - generic [ref=e597]: Rainbow Rare
                  - generic [ref=e598]: HP 270
            - 'link "Charizard $134.82 Charizard ME: 30th Celebration Classic Collection · 4/102 Classic Collection HP 120" [ref=e599] [cursor=pointer]':
              - /url: /kaart/714372
              - generic [ref=e600]:
                - img "Charizard" [ref=e601]
                - generic [ref=e602]: $134.82
              - generic [ref=e603]:
                - generic [ref=e604]: Charizard
                - generic [ref=e605]: "ME: 30th Celebration Classic Collection · 4/102"
                - generic [ref=e606]:
                  - generic [ref=e607]: Classic Collection
                  - generic [ref=e608]: HP 120
            - link "M Charizard EX (Full Art) $124.72 M Charizard EX (Full Art) XY - Evolutions · 101/108 Ultra Rare HP 220" [ref=e609] [cursor=pointer]:
              - /url: /kaart/124114
              - generic [ref=e610]:
                - img "M Charizard EX (Full Art)" [ref=e611]
                - generic [ref=e612]: $124.72
              - generic [ref=e613]:
                - generic [ref=e614]: M Charizard EX (Full Art)
                - generic [ref=e615]: XY - Evolutions · 101/108
                - generic [ref=e616]:
                  - generic [ref=e617]: Ultra Rare
                  - generic [ref=e618]: HP 220
            - link "Charizard - SM158 $116.27 Charizard - SM158 SM Promos · SM158 Promo HP 150" [ref=e619] [cursor=pointer]:
              - /url: /kaart/183966
              - generic [ref=e620]:
                - img "Charizard - SM158" [ref=e621]
                - generic [ref=e622]: $116.27
              - generic [ref=e623]:
                - generic [ref=e624]: Charizard - SM158
                - generic [ref=e625]: SM Promos · SM158
                - generic [ref=e626]:
                  - generic [ref=e627]: Promo
                  - generic [ref=e628]: HP 150
            - 'link "Charizard VMAX $115.07 Charizard VMAX Shining Fates: Shiny Vault · SV107/SV122 Shiny Holo Rare HP 330" [ref=e629] [cursor=pointer]':
              - /url: /kaart/232496
              - generic [ref=e630]:
                - img "Charizard VMAX" [ref=e631]
                - generic [ref=e632]: $115.07
              - generic [ref=e633]:
                - generic [ref=e634]: Charizard VMAX
                - generic [ref=e635]: "Shining Fates: Shiny Vault · SV107/SV122"
                - generic [ref=e636]:
                  - generic [ref=e637]: Shiny Holo Rare
                  - generic [ref=e638]: HP 330
          - generic [ref=e640]:
            - button "Load 60 more" [ref=e641]
            - paragraph [ref=e642]: showing 60 of 205
    - contentinfo [ref=e643]:
      - generic [ref=e644]:
        - paragraph [ref=e645]: Prices from TCGplayer via TCGCSV daily dumps · USD · not affiliated with Nintendo, Creatures or The Pokémon Company.
        - paragraph [ref=e646]:
          - link "Sets" [ref=e647] [cursor=pointer]:
            - /url: /sets
          - link "About & method" [ref=e648] [cursor=pointer]:
            - /url: /about
  - alert [ref=e649]
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
  19 |     await expect(page.locator("text=/\\$\\d/").first()).toBeVisible();
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
> 34 |     expect(Number(after.replace(/,/g, ""))).toBeLessThan(Number(before.replace(/,/g, "")));
     |                                             ^ Error: expect(received).toBeLessThan(expected)
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