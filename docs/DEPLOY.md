# Deploy & operate

## Shape

```
GitHub psvanzyl/pokemon-tcg  ──►  Coolify (CT310, 192.168.178.132)
   (repo root = this app)            dockerfile build pack, port 3000
                                     fqdn https://pokemon.laserraptorai.duckdns.org
                                     Traefik + Let's Encrypt at the edge
```

## Runtime data resolution

`src/lib/data.ts` resolves the catalogue in this order:

1. `$POKEMON_DATA_DIR` (explicit override, used by tests)
2. `/app/data` — Coolify persistent volume; **the daily refresh writes here, so new prices
   go live without a rebuild or redeploy**
3. `public/data` — snapshot baked into the image; the fallback when no volume is mounted

## Daily refresh

On dev CT141, `ops/refresh.sh`:

```
harvest.py          TCGCSV → data/raw/<groupId>.json.gz   (220 groups, 2 req/s, resumable)
normalize.py        → data/cards.json.gz + sets.json + stats.json + history.jsonl
build_history.py    → data/history.json.gz                (per-card series for the chart)
scp                 → CT310:/data/coolify/pokemon-data/   (the Coolify volume)
```

Cron on CT141 (04:20 daily) — TCGCSV publishes new prices around 03:00 UTC.

To publish a **code** change: commit + push to `main`, then Coolify deploy (webhook or UI).
To publish a **data** change: run `ops/refresh.sh`; no rebuild needed.

## Local development

```bash
npm ci
cp ../data/cards.json.gz ../data/sets.json ../data/stats.json public/data/
npm run dev            # http://localhost:3000
npm run typecheck
BASE_URL=http://127.0.0.1:3001 npm run test:e2e   # playwright, desktop + mobile
```

## Gotchas

- `public/data/` is the image fallback. If the volume is mounted but *empty*, the app
  silently falls back to the baked-in snapshot — check the volume first when prices look stale.
- The catalogue is served pre-gzipped from `/api/cards` with `Content-Encoding: gzip`
  (1.4 MB vs 7.2 MB decoded). Don't put a compressing proxy in front of it that re-encodes.
- Images are hotlinked from `tcgplayer-cdn.tcgplayer.com`. If that CDN ever blocks
  hotlinking, tiles go blank — the fallback is mirroring the 200w variants (~3 GB).
