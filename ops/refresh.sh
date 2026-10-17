#!/usr/bin/env bash
# Daily catalogue refresh: harvest -> normalise -> history -> publish.
#
# Runs on dev CT141 (project home). Writes the artefacts straight into the
# Coolify volume on CT310 so the running app picks up new prices WITHOUT a
# rebuild or redeploy (src/lib/data.ts prefers /app/data over the baked-in copy).
set -euo pipefail

ROOT=/root/projects/pokemon-tcg
APP=$ROOT/app
COOLIFY_HOST=root@192.168.178.132
VOLUME=/data/coolify/pokemon-data

echo "== $(date -Is) refresh start =="
cd "$ROOT"

python3 scripts/harvest.py
python3 scripts/normalize.py
python3 scripts/build_history.py

# snapshot for the image fallback (also keeps the repo's bundled copy current)
cp "$ROOT/data/cards.json.gz" "$APP/public/data/cards.json.gz"
cp "$ROOT/data/sets.json"     "$APP/public/data/sets.json"
cp "$ROOT/data/stats.json"    "$APP/public/data/stats.json"
cp "$ROOT/data/history.json.gz" "$APP/public/data/history.json.gz"

ssh -o BatchMode=yes "$COOLIFY_HOST" "mkdir -p $VOLUME"
scp -q "$ROOT/data/cards.json.gz" "$ROOT/data/sets.json" \
       "$ROOT/data/stats.json" "$ROOT/data/history.json.gz" \
       "$COOLIFY_HOST:$VOLUME/"

echo "== published to $COOLIFY_HOST:$VOLUME =="
ssh -o BatchMode=yes "$COOLIFY_HOST" "ls -la $VOLUME"
echo "== $(date -Is) refresh done =="
