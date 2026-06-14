#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/coresuite-business}"
COMPOSE_FILE="docker-compose.prod.yml"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"
USE_CLOUDFLARE="${USE_CLOUDFLARE:-auto}"

cd "$APP_DIR"

echo "[deploy] Working directory: $APP_DIR"

if [ ! -f .env ]; then
  echo "[deploy] ERROR: .env not found in $APP_DIR"
  exit 1
fi

# Production overrides for Docker network
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_DB="${POSTGRES_DB:-coresuite}"
export POSTGRES_PASSWORD

cat > .env.docker <<EOF
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
EOF

grep -q '^POSTGRES_PASSWORD=' .env 2>/dev/null || echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" >> .env

# Patch DATABASE_URL for internal postgres service
if grep -q '^DATABASE_URL=' .env; then
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://'"${POSTGRES_USER}"':'"${POSTGRES_PASSWORD}"'@postgres:5432/'"${POSTGRES_DB}"'?schema=public"|' .env
else
  echo 'DATABASE_URL="postgresql://'"${POSTGRES_USER}"':'"${POSTGRES_PASSWORD}"'@postgres:5432/'"${POSTGRES_DB}"'?schema=public"' >> .env
fi

sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env || echo 'NODE_ENV=production' >> .env
sed -i 's|^APP_DEBUG=.*|APP_DEBUG=false|' .env || echo 'APP_DEBUG=false' >> .env

echo "[deploy] Building and starting postgres + app..."
docker compose -f "$COMPOSE_FILE" up -d --build postgres app

echo "[deploy] Waiting for postgres..."
sleep 8

echo "[deploy] Running migrations (via app container)..."
docker compose -f "$COMPOSE_FILE" exec -T app node ./node_modules/prisma/build/index.js migrate deploy

echo "[deploy] Seeding database..."
docker compose -f "$COMPOSE_FILE" --profile init run --rm seed

# Cloudflare tunnel: reuse existing container or start profile
if [ "$USE_CLOUDFLARE" = "true" ] || { [ "$USE_CLOUDFLARE" = "auto" ] && grep -q '^CLOUDFLARE_TUNNEL_TOKEN=' .env; }; then
  if grep -q '^CLOUDFLARE_TUNNEL_TOKEN=' .env && [ -n "$(grep '^CLOUDFLARE_TUNNEL_TOKEN=' .env | cut -d= -f2- | tr -d '"')" ]; then
    echo "[deploy] Starting cloudflared profile (TUNNEL_TOKEN from .env)..."
    docker compose -f "$COMPOSE_FILE" --profile cloudflare up -d cloudflared
  else
    echo "[deploy] CLOUDFLARE_TUNNEL_TOKEN missing — collega manualmente il tunnel esistente a http://coresuite-app:3000"
    echo "[deploy] Vedi deploy/cloudflared-config.example.yml"
  fi
else
  echo "[deploy] Cloudflare profile not started (USE_CLOUDFLARE=$USE_CLOUDFLARE)"
fi

echo "[deploy] Container status:"
docker compose -f "$COMPOSE_FILE" ps

echo "[deploy] Connecting existing Cloudflare tunnel containers to app network (if any)..."
for c in cloudflared cloudflare-tunnel coresuite-cloudflared tunnel; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    docker network connect coresuite-network "$c" 2>/dev/null && echo "[deploy] Linked $c -> coresuite-network" || true
  fi
done

echo "[deploy] Done. App reachable on docker network as http://coresuite-app:3000"
echo "[deploy] Configure tunnel ingress: business.coresuite.it / coresuite.it -> http://coresuite-app:3000"
