#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ] && [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "[coresuite] Applying database migrations..."
  node ./node_modules/prisma/build/index.js migrate deploy || npx prisma migrate deploy
fi

exec "$@"
