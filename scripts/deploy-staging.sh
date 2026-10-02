#!/usr/bin/env bash
# ==============================================================================
# Script: deploy-staging.sh
# Purpose: Autonomous deploy script for Staging Canary (limart2.khanhdp.com)
# ==============================================================================

set -euo pipefail

STAGING_DIR="/opt/checkin-staging"
CADDYFILE="/opt/kido-infra/caddy/Caddyfile"
NETWORK_NAME="ops_bridge"

echo "[STAGING DEPLOY] Initializing staging deployment..."

# 1. Ensure staging directory exists
mkdir -p "${STAGING_DIR}"
cd "${STAGING_DIR}"

# 2. Ensure shared network exists
if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
    docker network create "${NETWORK_NAME}"
fi

# 3. Download or sync staging compose file
curl -sSL "https://raw.githubusercontent.com/khanhduong22/checkin-app/feat/monorepo-migration/docker-compose.staging.yml" -o docker-compose.yml

# 4. Pull pre-built staging images from GHCR
echo "[STAGING DEPLOY] Logging into GHCR if credentials present..."
if [ -n "${GITHUB_TOKEN:-}" ]; then
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "${GITHUB_ACTOR:-khanhduong22}" --password-stdin
fi

echo "[STAGING DEPLOY] Pulling staging images..."
docker compose pull

# 5. Launch staging stack
echo "[STAGING DEPLOY] Starting staging containers (checkin-api-v2, checkin-admin-v2, checkin-staff-v2)..."
docker compose up -d --remove-orphans

# 6. Ensure Caddy reverse proxy config includes limart2.khanhdp.com
if [ -f "${CADDYFILE}" ]; then
    if ! grep -q "limart2.khanhdp.com" "${CADDYFILE}"; then
        echo "[STAGING DEPLOY] Appending limart2.khanhdp.com block to Caddyfile..."
        printf '\nlimart2.khanhdp.com {\n\timport cf_ssl\n\timport no_robots\n\thandle /api/* {\n\t\treverse_proxy checkin-api-v2:4000\n\t}\n\thandle /health* {\n\t\treverse_proxy checkin-api-v2:4000\n\t}\n\thandle /admin* {\n\t\treverse_proxy checkin-admin-v2:3001\n\t}\n\thandle /* {\n\t\treverse_proxy checkin-staff-v2:3002\n\t}\n}\n' >> "${CADDYFILE}"
    fi

    # 7. Gracefully reload Caddy
    echo "[STAGING DEPLOY] Reloading Caddy..."
    docker exec caddy caddy reload --config /etc/caddy/Caddyfile || true
fi

# 8. Wait for API healthcheck
echo "[STAGING DEPLOY] Waiting for checkin-api-v2 to respond..."
count=0
while [ "$count" -lt 15 ]; do
    if docker exec checkin-api-v2 wget -q -O - http://127.0.0.1:4000/health | grep -q '"status":"'; then
        echo "[STAGING DEPLOY] SUCCESS: checkin-api-v2 is healthy!"
        break
    fi
    count=$((count + 1))
    sleep 2
done

echo "[STAGING DEPLOY] Deployment to limart2.khanhdp.com completed successfully!"
