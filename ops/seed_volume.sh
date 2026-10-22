#!/bin/sh
# Copy the published catalogue files into the Carddex persistent volume.
# Usage: seed_volume.sh [src_dir]   (default /data/coolify/pokemon-data)
set -e
SRC="${1:-/data/coolify/pokemon-data}"
VOL="dpjl3npkr7pxq4xkcwu78tio-pokemon-data"
CTR=$(docker ps --format '{{.Names}}' | grep -i dpjl | head -1)

echo "container: $CTR"
echo "src:       $SRC"

docker run --rm \
  -v "$VOL":/dst \
  -v "$SRC":/src:ro \
  alpine sh -c '
    cp /src/*.gz /src/*.json /dst/ 2>/dev/null
    # chmod must only ever touch regular files. A blanket `chmod 644 /dst/*` also hit the
    # accounts/ DIRECTORY, stripping its execute bit -- the app could then no longer
    # traverse into it and every account write failed with EACCES (500 with an empty body,
    # which the browser reported as "Unexpected end of JSON input").
    find /dst -maxdepth 1 -type f -exec chmod 644 {} +
    # The account store lives in a subdirectory: keep it traversable and owned by the
    # app user (nextjs = uid 1001, gid 65533) so sign-in can persist users.
    if [ -d /dst/accounts ]; then
      chmod 755 /dst/accounts
      chmod 755 /dst/accounts/collections 2>/dev/null || true
      chown -R 1001:65533 /dst/accounts
    fi
    ls -la /dst
  '

echo "--- what the app now sees in /app/data ---"
docker exec "$CTR" ls -la /app/data
