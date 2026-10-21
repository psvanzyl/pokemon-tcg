# ops/ — Playwright probes for the live site

Throwaway QA tooling. Run from the app root on CT141: `node ops/<script>.mjs`.
Every script hits the **live** site (`https://pokemon.laserraptorai.duckdns.org`) unless noted,
and writes screenshots to `/tmp/<script-name>/`. None of them mutate catalogue data; the ones that
create an account say so.

| script | what it answers |
| --- | --- |
| `qa-accounts.mjs` | register / login / collection round-trip on a scratch account |
| `audit-layout.mjs` | header, grid and footer geometry at desktop + mobile |
| `audit3.mjs` | **bounded** full-page layout + image audit (use this one) |
| `audit2.mjs` | superseded by `audit3.mjs` — unbounded scroll loop, hangs on the catalogue |
| `img-probe.mjs` | which image URLs 403 / load, straight from the DOM |
| `probe-google.mjs` | is the Google Identity endpoint reachable and does it return a button |
| `verify-gsi.mjs` | the sign-in button renders, right size, right client id |
| `click-gsi.mjs` | clicking the button opens a real Google flow (popup / navigation) |
| `align-gsi.mjs` | the GIS iframe is aligned with the surrounding form |
| `verify-placeholder.mjs` | counts broken images vs `no scan available` placeholders on the catalogue, a dead-scan card and a control card |
| `verify-placeholder2.mjs` | dead-scan detail page `/kaart/607368` (desktop + mobile) and *which* cards fall back |
| `verify-thumbs.mjs` | collection-thumb branch: registers `carddex-thumb-<ts>@…`, adds one dead-scan card + one control, checks `/account`. **Deletes nothing** — remove the account afterwards from the app data volume (`/app/data/accounts`). |

Counting rules that actually catch a broken tile (a screenshot alone will not):
`document.images.filter(i => i.complete && i.naturalWidth === 0).length` must be `0`, and a card
with a working scan must show `0` placeholders — otherwise you are measuring the wrong thing.
