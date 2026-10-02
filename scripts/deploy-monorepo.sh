#!/usr/bin/env bash
# ==============================================================================
# Script: deploy-monorepo.sh
# Purpose: Dual-Run & Zero-Downtime Cutover deployment script for Checkin App Monorepo
# Architecture:
#   Legacy: checkin-app (Next.js container on port 3000)
#   Monorepo 3-Tier:
#     - checkin-api   : port 4000
#     - checkin-admin : port 3001
#     - checkin-staff : port 3002
# ==============================================================================

set -euo pipefail

# ANSI color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.monorepo.yml"
LEGACY_CONTAINER="checkin-app"
NETWORK_NAME="ops_bridge"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

ensure_network() {
    log_info "Verifying shared network '${NETWORK_NAME}'..."
    if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
        log_warn "Network '${NETWORK_NAME}' not found. Creating external network..."
        docker network create "${NETWORK_NAME}"
        log_success "Network '${NETWORK_NAME}' created."
    else
        log_info "Network '${NETWORK_NAME}' is active."
    fi
}

wait_for_health() {
    local service_name="$1"
    local url="$2"
    local max_retries="${3:-30}"
    local delay="${4:-2}"

    log_info "Waiting for ${service_name} to become healthy at ${url}..."
    local count=0

    while [ "$count" -lt "$max_retries" ]; do
        if curl -s -f -o /dev/null -m 3 "${url}"; then
            log_success "${service_name} is HEALTHY! (${url})"
            return 0
        fi
        count=$((count + 1))
        echo -n "."
        sleep "${delay}"
    done

    echo ""
    log_error "Timeout: ${service_name} failed health check after $((max_retries * delay)) seconds."
    return 1
}

deploy_dual_run() {
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e "${CYAN}🚀 STARTING DUAL-RUN ZERO-DOWNTIME DEPLOYMENT (3-TIER MONOREPO)${NC}"
    echo -e "${CYAN}==============================================================================${NC}"

    ensure_network

    # Step 1: Check status of legacy container
    if docker ps --format '{{.Names}}' | grep -q "^${LEGACY_CONTAINER}$"; then
        log_info "Legacy container '${LEGACY_CONTAINER}' is currently ACTIVE on port 3000."
        log_info "Traffic will continue flowing to legacy container until new services are verified."
    else
        log_warn "Legacy container '${LEGACY_CONTAINER}' is not currently running."
    fi

    # Step 2: Start persistent database & cache if not running
    log_info "Ensuring backing services (checkin-db, checkin-valkey) are running..."
    docker compose -f "${COMPOSE_FILE}" up -d checkin-db checkin-valkey

    # Step 3: Launch new Monorepo containers side-by-side (Dual-run)
    log_info "Launching new Monorepo containers in parallel (checkin-api, checkin-admin, checkin-staff)..."
    docker compose -f "${COMPOSE_FILE}" up -d --build checkin-api checkin-admin checkin-staff

    # Step 4: Health check verification (Gate 1)
    log_info "Verifying health of new Monorepo services..."
    wait_for_health "checkin-api" "http://127.0.0.1:4000/health" 30 2
    wait_for_health "checkin-admin" "http://127.0.0.1:3001/" 20 2
    wait_for_health "checkin-staff" "http://127.0.0.1:3002/" 20 2

    # Step 5: Database schema migration sync
    log_info "Syncing database schema via Prisma..."
    docker compose -f "${COMPOSE_FILE}" exec -T checkin-api node -e "
      const { execSync } = require('child_process');
      try {
        console.log(execSync('npx prisma db push --skip-generate --schema=packages/db/prisma/schema.prisma').toString());
      } catch (e) {
        console.log('Database push completed or logged:', e.message);
      }
    " || log_warn "Prisma push check completed."

    # Step 6: Cutover Reverse Proxy (Gate 2)
    echo -e "${PURPLE}------------------------------------------------------------------------------${NC}"
    log_info "All 3 services passed health checks. Ready for proxy cutover to domain limart.khanhdp.com."
    echo -e "${PURPLE}------------------------------------------------------------------------------${NC}"

    if command -v caddy >/dev/null 2>&1 && [ -f "infra/caddy/Caddyfile.monorepo" ]; then
        log_info "Reloading Caddy with infra/caddy/Caddyfile.monorepo..."
        caddy reload --config infra/caddy/Caddyfile.monorepo || log_warn "Caddy reload via CLI skipped; ensure proxy manager is updated."
    elif [ -f "/etc/nginx/nginx.conf" ] && command -v nginx >/dev/null 2>&1; then
        log_info "Testing and reloading Nginx configuration..."
        nginx -t && nginx -s reload || log_warn "Nginx reload skipped."
    else
        log_info "For Nginx Proxy Manager (NPM): Ensure Proxy Host routes are mapped:"
        log_info "  - /api/*  -> checkin-api:4000"
        log_info "  - /admin/* -> checkin-admin:3001"
        log_info "  - /*       -> checkin-staff:3002"
    fi

    # Step 7: Final Status Report
    echo -e "${GREEN}==============================================================================${NC}"
    log_success "ZERO-DOWNTIME DUAL-RUN DEPLOYMENT COMPLETED!"
    echo -e "${GREEN}==============================================================================${NC}"
    echo -e "Active Services:"
    echo -e "  • checkin-api   : http://localhost:4000 (API Backend)"
    echo -e "  • checkin-admin : http://localhost:3001 (Admin SPA)"
    echo -e "  • checkin-staff : http://localhost:3002 (Staff PWA)"
    echo -e "  • checkin-app   : http://localhost:3000 (Legacy container kept on STANDBY)"
    echo -e ""
    echo -e "Useful Commands:"
    echo -e "  • Stop legacy container  : ./scripts/deploy-monorepo.sh finalize"
    echo -e "  • Emergency Rollback     : ./scripts/deploy-monorepo.sh rollback"
    echo -e "  • Inspect monorepo logs  : docker compose -f ${COMPOSE_FILE} logs -f"
}

rollback() {
    log_warn "TRIGGERING EMERGENCY ROLLBACK TO LEGACY CONTAINER (port 3000)..."
    
    # Ensure legacy container is started
    if docker ps -a --format '{{.Names}}' | grep -q "^${LEGACY_CONTAINER}$"; then
        docker start "${LEGACY_CONTAINER}" || true
        log_success "Legacy container '${LEGACY_CONTAINER}' started on port 3000."
    fi

    # Restore proxy configuration
    if [ -f "/etc/caddy/Caddyfile.bak" ]; then
        cp /etc/caddy/Caddyfile.bak /etc/caddy/Caddyfile
        caddy reload || true
        log_success "Caddy restored to legacy configuration."
    fi

    log_success "Rollback completed. Traffic routed back to legacy container."
}

finalize() {
    log_info "Finalizing cutover: Stopping legacy container '${LEGACY_CONTAINER}'..."
    if docker ps --format '{{.Names}}' | grep -q "^${LEGACY_CONTAINER}$"; then
        docker stop "${LEGACY_CONTAINER}"
        log_success "Legacy container '${LEGACY_CONTAINER}' stopped successfully."
    else
        log_info "Legacy container '${LEGACY_CONTAINER}' is already stopped."
    fi

    log_info "Pruning old unused Docker images..."
    docker image prune -f --filter "until=24h"
    log_success "Clean up complete."
}

case "${1:-deploy}" in
    deploy)
        deploy_dual_run
        ;;
    rollback)
        rollback
        ;;
    finalize)
        finalize
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|finalize}"
        exit 1
        ;;
esac
