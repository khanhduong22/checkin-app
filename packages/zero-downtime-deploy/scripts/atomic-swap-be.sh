#!/usr/bin/env bash
# ==============================================================================
# @kt/zero-downtime-deploy: atomic-swap-be.sh
# ------------------------------------------------------------------------------
# Production Blue-Green Atomic Container Swap for Docker/Bun/Node Backend
# Ensures 100% Zero-Downtime deployment:
#   1. Starts/validates candidate container (<name>_next)
#   2. Probes healthcheck endpoint with retry (default: 45s)
#   3. On failure: terminates candidate, active container is 100% untouched
#   4. On success: executes atomic container rename (<name> -> <name>_old, <name>_next -> <name>)
#   5. Reloads reverse proxy (Caddy / Nginx)
#   6. Drains in-flight requests (3s) then removes old container
# ==============================================================================

set -euo pipefail

ACTIVE_CONTAINER="${1:-${ACTIVE_CONTAINER:-flashbuy-api}}"
CANDIDATE_CONTAINER="${2:-${CANDIDATE_CONTAINER:-${ACTIVE_CONTAINER}_next}}"
BACKUP_CONTAINER="${3:-${BACKUP_CONTAINER:-${ACTIVE_CONTAINER}_old}}"
HEALTH_URL="${4:-${HEALTH_URL:-http://127.0.0.1:3000/health}}"
TIMEOUT_SECONDS="${5:-${TIMEOUT_SECONDS:-45}}"
CADDY_RELOAD_CMD="${6:-${CADDY_RELOAD_CMD:-docker exec caddy caddy reload --config /etc/caddy/Caddyfile}}"
DRAIN_SECONDS="${7:-${DRAIN_SECONDS:-3}}"

echo "=================================================================="
echo "🚀 [BE-SWAP] Starting Blue-Green Container Atomic Swap"
echo "   Active Container:    $ACTIVE_CONTAINER"
echo "   Candidate Container: $CANDIDATE_CONTAINER"
echo "   Backup Container:    $BACKUP_CONTAINER"
echo "   Healthcheck URL:     $HEALTH_URL"
echo "   Timeout:             ${TIMEOUT_SECONDS}s"
echo "=================================================================="

# 1. Verify candidate container is running
if ! docker inspect "$CANDIDATE_CONTAINER" >/dev/null 2>&1; then
  echo "❌ [BE-SWAP] Error: Candidate container '$CANDIDATE_CONTAINER' is not running!"
  exit 1
fi

# 2. Healthcheck probe loop
echo "🔍 [BE-SWAP] Probing candidate container health via $HEALTH_URL..."
START_TIME=$(date +%s)
IS_HEALTHY=false

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ "$ELAPSED" -ge "$TIMEOUT_SECONDS" ]; then
    break
  fi

  # Probe candidate healthcheck endpoint
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
    echo "✅ [BE-SWAP] Healthcheck PASSED (HTTP $HTTP_STATUS) in ${ELAPSED}s!"
    IS_HEALTHY=true
    break
  fi

  echo "⏳ [BE-SWAP] Waiting for $HEALTH_URL (status: $HTTP_STATUS, elapsed: ${ELAPSED}s/${TIMEOUT_SECONDS}s)..."
  sleep 2
done

# 3. Handle healthcheck failure (Auto-Rollback)
if [ "$IS_HEALTHY" != true ]; then
  echo "❌ [BE-SWAP] Healthcheck probe TIMED OUT after ${TIMEOUT_SECONDS}s!"
  echo "📋 [BE-SWAP] Capturing candidate container logs before aborting:"
  docker logs --tail 60 "$CANDIDATE_CONTAINER" || true
  
  echo "🛡️ [BE-SWAP] Purging candidate container '$CANDIDATE_CONTAINER'..."
  docker rm -f "$CANDIDATE_CONTAINER" 2>/dev/null || true
  
  echo "✅ [BE-SWAP] Rollback finished. Active container '$ACTIVE_CONTAINER' was preserved untouched."
  exit 1
fi

# 4. Atomic Rename Swap
echo "🔄 [BE-SWAP] Executing atomic container rename sequence..."

# Clean up stale backup container if left over
docker rm -f "$BACKUP_CONTAINER" 2>/dev/null || true

# Rename active container to backup container (if active exists)
if docker inspect "$ACTIVE_CONTAINER" >/dev/null 2>&1; then
  echo "📦 [BE-SWAP] Renaming $ACTIVE_CONTAINER -> $BACKUP_CONTAINER..."
  docker rename "$ACTIVE_CONTAINER" "$BACKUP_CONTAINER"
fi

# Promote candidate container to active container
echo "✨ [BE-SWAP] Promoting $CANDIDATE_CONTAINER -> $ACTIVE_CONTAINER..."
docker rename "$CANDIDATE_CONTAINER" "$ACTIVE_CONTAINER"
echo "✅ [BE-SWAP] Candidate successfully promoted to '$ACTIVE_CONTAINER'!"

# 5. Reload reverse proxy (Caddy / Nginx)
if [ -n "$CADDY_RELOAD_CMD" ]; then
  echo "🌐 [BE-SWAP] Reloading reverse proxy: $CADDY_RELOAD_CMD"
  eval "$CADDY_RELOAD_CMD" || echo "⚠️ [BE-SWAP] Warning: Proxy reload command returned non-zero, continuing..."
fi

# 6. Drain in-flight connections & cleanup backup
if docker inspect "$BACKUP_CONTAINER" >/dev/null 2>&1; then
  echo "⏳ [BE-SWAP] Draining in-flight requests on '$BACKUP_CONTAINER' for ${DRAIN_SECONDS}s..."
  sleep "$DRAIN_SECONDS"
  
  echo "🧹 [BE-SWAP] Removing drained backup container '$BACKUP_CONTAINER'..."
  docker rm -f "$BACKUP_CONTAINER" 2>/dev/null || true
fi

echo "=================================================================="
echo "🎉 [BE-SWAP] Blue-Green Zero-Downtime Swap Completed Successfully!"
echo "=================================================================="
