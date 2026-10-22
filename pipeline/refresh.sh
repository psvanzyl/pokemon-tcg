#!/usr/bin/env bash
# Daily catalogue refresh: harvest -> normalise -> identity/EUR -> history -> publish -> reload -> commit.
#
# Runs on dev CT141 (project home). Publishes the artefacts into the Coolify
# docker volume on CT310 and then restarts the app container, because
# src/lib/data.ts caches the parsed JSON in module scope: the restart is what
# makes the new prices visible without a rebuild or redeploy.
#
# Finally it COMMITS and PUSHES the snapshot, so the copy baked into the Docker
# image (app/public/data) never drifts from what the live volume serves. Before
# this step the repo's fallback was only refreshed in the working tree, so a
# rebuild months later would bake in a stale catalogue.
set -euo pipefail

ROOT=${CARDDEX_HOME:-/root/projects/pokemon-tcg}
APP=$ROOT/app
PIPELINE=$APP/pipeline
COOLIFY_HOST=root@192.168.178.132
STAGE=/data/coolify/pokemon-data
LIVE=https://pokemon.laserraptorai.duckdns.org

# One refresh at a time: a second run would fight the first over the git index
# and over the volume copy.
LOCK=/tmp/carddex-refresh.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "== $(date -Is) another refresh is already running — exiting =="
  exit 0
fi

echo "== $(date -Is) refresh start =="
cd "$ROOT"

python3 "$PIPELINE/harvest.py"
python3 "$PIPELINE/normalize.py"

# --- multilingual layer ------------------------------------------------------
# TCGdex (MIT, self-hosted clone) supplies the language-independent card identity
# and the six print languages; Cardmarket's free daily download supplies EUR.
# merge_multilingual.py rewrites cards.json.gz (adding the "t" identity) and writes
# content.json.gz. Order matters: the merge must run before the publish step below.
# A missing clone must not take the price refresh down with it — skip it loudly.
if [ -d "$ROOT/data/tcgdex-source/data" ]; then
  python3 "$PIPELINE/ingest_tcgdex.py"
  python3 "$PIPELINE/fetch_cardmarket.py"
  python3 "$PIPELINE/merge_multilingual.py"
else
  echo "!! data/tcgdex-source missing — skipping identity ingest, EUR fetch and merge."
  echo "!! content.json.gz is left unchanged; two days of this means stale card text."
  echo "!! restore: git clone --depth 1 https://github.com/tcgdex/cards-database $ROOT/data/tcgdex-source"
fi

python3 "$PIPELINE/build_history.py"

# snapshot for the image fallback (also keeps the repo's bundled copy current)
for f in cards.json.gz history.json.gz content.json.gz; do cp "$ROOT/data/$f" "$APP/public/data/$f"; done
for f in sets.json stats.json; do cp "$ROOT/data/$f" "$APP/public/data/$f"; done

# 1. stage the files on the Coolify host
ssh -o BatchMode=yes "$COOLIFY_HOST" "mkdir -p $STAGE"
scp -q "$ROOT/data/cards.json.gz" "$ROOT/data/sets.json" \
       "$ROOT/data/stats.json" "$ROOT/data/history.json.gz" \
       "$ROOT/data/content.json.gz" \
       "$COOLIFY_HOST:$STAGE/"

# 2. copy host dir -> the docker volume the app actually mounts, then reload
scp -q -o BatchMode=yes "$PIPELINE/seed_volume.sh" "$COOLIFY_HOST:/root/seed_volume.sh"
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

# 4. commit + push the snapshot ----------------------------------------------
# Only public/data/ is staged, so a half-finished edit elsewhere in the working
# tree can never ride along in the commit. The push keeps the repo's baked-in
# fallback in step with what the live volume is serving.
echo "== committing the catalogue snapshot =="
cd "$APP"
git add -- public/data
if git diff --cached --quiet -- public/data; then
  echo "== snapshot unchanged — nothing to commit =="
  # Still make sure the branch is not left behind origin/main.
  git fetch -q origin main
  if ! git merge-base --is-ancestor origin/main HEAD; then
    if git diff --quiet && git diff --cached --quiet; then
      git rebase origin/main && git push -q origin main && echo "== branch synced with origin/main =="
    else
      echo "!! origin/main has moved on and the working tree has local changes — not syncing."
    fi
  fi
else
  CARDS=$(python3 -c "import json;print(json.load(open('$ROOT/data/stats.json')).get('cards','?'))" 2>/dev/null || echo "?")
  git commit -q -m "data: catalogue snapshot $(date +%F) (${CARDS} cards)" -- public/data
  git fetch -q origin main
  if ! git merge-base --is-ancestor origin/main HEAD; then
    # Rebase only on a clean tree: `git rebase` refuses to run with unstaged
    # changes, and the refresh must not fail because someone is mid-edit.
    if git diff --quiet && git diff --cached --quiet; then
      echo "== rebasing onto origin/main =="
      git rebase origin/main
    else
      echo "!! origin/main has moved on and the working tree has local changes."
      echo "!! skipping the rebase — the snapshot stays local until this is resolved."
    fi
  fi
  PUSHED=0
  for attempt in 1 2 3; do
    if git push -q origin main; then PUSHED=1; break; fi
    echo "!! push attempt $attempt failed, retrying"
    sleep 5
  done
  if [ "$PUSHED" = "1" ]; then
    echo "== snapshot committed and pushed =="
  else
    # The live site is already correct at this point — the repo copy is only the
    # image fallback — so this is a warning, not a failed refresh.
    echo "!! SNAPSHOT PUSH FAILED — the live site is fine, but the repo fallback is now behind."
    echo "!! fix by hand: cd $APP && git push origin main"
  fi
fi

echo "== $(date -Is) refresh done =="
