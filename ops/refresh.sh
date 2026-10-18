#!/usr/bin/env bash
# Daily catalogue refresh: harvest -> normalise -> identity/EUR -> history -> publish -> reload.
#
# Runs on dev CT141 (project home). Publishes the artefacts into the Coolify
# docker volume on CT310 and then restarts the app container, because
# src/lib/data.ts caches the parsed JSON in module scope: the restart is what
# makes the new prices visible without a rebuild or redeploy.
set -euo pipefail

ROOT=/root/projects/pokemon-tcg
APP=$ROOT/app
COOLIFY_HOST=root@192.168.178.132
STAGE=/data/coolify/pokemon-data
LIVE=https://pokemon.laserraptorai.duckdns.org

echo "== $(date -Is) refresh start =="
cd "$ROOT"

python3 scripts/harvest.py
python3 scripts/normalize.py

# --- multilingual layer ------------------------------------------------------
# TCGdex (MIT, self-hosted clone) supplies the language-independent card identity
# and the six print languages; Cardmarket's free daily download supplies EUR.
# merge_multilingual.py rewrites cards.json.gz (adding the "t" identity) and writes
# content.json.gz. Order matters: the merge must run before the publish step below.
# A missing clone must not take the price refresh down with it — skip it loudly.
if [ -d "$ROOT/data/tcgdex-source/data" ]; then
  python3 scripts/ingest_tcgdex.py
  python3 scripts/fetch_cardmarket.py
  python3 scripts/merge_multilingual.py
else
  echo "!! data/tcgdex-source missing — skipping identity ingest, EUR fetch and merge."
  echo "!! content.json.gz is left unchanged; two days of this means stale card text."
  echo "!! restore: git clone --depth 1 https://github.com/tcgdex/cards-database $ROOT/data/tcgdex-source"
fi

python3 scripts/build_history.py

# snapshot for the image fallback (also keeps the repo's bundled copy current)
for f in cards.json.gz history.json.gz; do cp "$ROOT/data/$f" "$APP/public/data/$f"; done
for f in sets.json stats.json content.json.gz; do cp "$ROOT/data/$f" "$APP/public/data/$f"; done

# 1. stage the files on the Coolify host
ssh -o BatchMode=yes "$COOLIFY_HOST" "mkdir -p $STAGE"
scp -q "$ROOT/data/cards.json.gz" "$ROOT/data/sets.json" \
       "$ROOT/data/stats.json" "$ROOT/data/history.json.gz" \
       "$ROOT/data/content.json.gz" \
       "$COOLIFY_HOST:$STAGE/"

# 2. copy host dir -> the docker volume the app actually mounts, then reload
scp -q -o BatchMode=yes "$APP/ops/seed_volume.sh" "$COOLIFY_HOST:/root/seed_volume.sh"
ssh -o BatchMode=yes "$COOLIFY_HOST" "
  set -e
  sh /root/seed_volume.sh $STAGE
  CTR=\$(docker ps --format '{{.Names}}' | grep -i dpjl | head -1)
  echo \"restarting \$CTR\"
  docker restart \"\$CTR\" >/dev/null
"

# 3. prove the live site is serving the new snapshot
sleep 6
CODE=$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$LIVE/api/sets")
echo "== live /api/sets -> HTTP $CODE =="
[ "$CODE" = "200" ] || { echo "!! live check failed"; exit 1; }

# and that the multilingual layer survived the refresh: "Caninos de Hisui" is the
# French name for Hisuian Growlithe and only resolves if content.json.gz is live.
ALT=$(curl -s -m 20 "$LIVE/api/lookup?q=Caninos%20de%20Hisui" | tr -d '\n' | head -c 220)
case "$ALT" in
  *'"lang":"fr"'*) echo "== multilingual lookup OK: $ALT" ;;
  *) echo "!! multilingual lookup FAILED — content.json.gz may be missing from the volume: $ALT" ;;
esac
echo "== $(date -Is) refresh done =="
