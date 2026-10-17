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
  alpine sh -c 'cp /src/*.gz /src/*.json /dst/ 2>/dev/null; chmod 644 /dst/*; ls -la /dst'

echo "--- what the app now sees in /app/data ---"
docker exec "$CTR" ls -la /app/data
