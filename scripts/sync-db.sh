#!/bin/bash
# ==============================================================================
# Database Synchronization Script: Neon DB -> Contabo VPS (checkin_db)
# 
# Usage:
#   ./scripts/sync-db.sh [backfill|full|backup-only] [--force-overwrite-danger]
#
# Modes:
#   backfill: (DEFAULT / RECOMMENDED) Idempotently merges delta records (UserTask,
#             CheckIn, WorkShift) from Neon into checkin_db without touching existing data.
#   full:     Full pg_dump from Neon & pg_restore into checkin_db.
#             REQUIRES --force-overwrite-danger. Automatically takes a full backup
#             of checkin_db before dropping/restoring schemas!
#   backup-only: Takes a standalone timestamped backup of checkin_db on VPS.
# ==============================================================================

set -euo pipefail

MODE="${1:-backfill}"
CONFIRM_FLAG="${2:-}"

# Configuration
CONTAINER_DB="checkin-db"
CONTAINER_APP="checkin-app"
LOCAL_DB_USER="${LOCAL_DB_USER:-kido}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-checkin_db}"
NEON_DB_URL="${NEON_DB_URL:-${NEON_DATABASE_URL:-}}"

if [ -z "$NEON_DB_URL" ] && [ "$MODE" != "backup-only" ]; then
  echo "Error: NEON_DB_URL or NEON_DATABASE_URL must be provided for backfill/full modes."
  exit 1
fi

BACKUP_DIR="/tmp"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
VPS_BACKUP_FILE="${BACKUP_DIR}/checkin_db_pre_sync_${TIMESTAMP}.dump"
NEON_DUMP_FILE="${BACKUP_DIR}/neon_dump_${TIMESTAMP}.dump"

cleanup() {
  echo "🧹 Cleaning up temporary dump files inside ${CONTAINER_DB}..."
  docker exec "${CONTAINER_DB}" rm -f "${NEON_DUMP_FILE}" 2>/dev/null || true
}
trap cleanup EXIT

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# --- 1. PRE-SYNC SAFETY BACKUP ---
take_pre_backup() {
  log "🛡️  Creating safety backup of current VPS database (${LOCAL_DB_NAME})..."
  docker exec "${CONTAINER_DB}" pg_dump -U "${LOCAL_DB_USER}" -d "${LOCAL_DB_NAME}" -F c -b -v -f "${VPS_BACKUP_FILE}"
  
  # Verify backup file size
  BACKUP_SIZE=$(docker exec "${CONTAINER_DB}" stat -c%s "${VPS_BACKUP_FILE}" 2>/dev/null || echo "0")
  if [ "$BACKUP_SIZE" -lt 1000 ]; then
    log "❌ ERROR: Safety backup failed or file size too small (${BACKUP_SIZE} bytes). Aborting!"
    exit 1
  fi
  log "✅ Safety backup successfully created at: ${VPS_BACKUP_FILE} (${BACKUP_SIZE} bytes)."
}

# --- 2. EXECUTION BY MODE ---

case "$MODE" in
  "backup-only")
    log "=== MODE: Standalone Backup of VPS checkin_db ==="
    take_pre_backup
    log "🎉 Standalone backup completed: ${VPS_BACKUP_FILE}"
    exit 0
    ;;

  "backfill")
    log "=== MODE: Safe Idempotent Backfill (Neon -> checkin_db) ==="
    take_pre_backup
    
    log "🚀 Executing backfill script inside ${CONTAINER_APP} container..."
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_APP}$"; then
      docker exec -e NEON_DATABASE_URL="${NEON_DB_URL}" "${CONTAINER_APP}" node scripts/backfill-from-neon.js
    else
      log "⚠️ ${CONTAINER_APP} container not running. Executing with node directly..."
      node scripts/backfill-from-neon.js
    fi
    log "🎉 Backfill operation finished successfully!"
    ;;

  "full")
    log "=== MODE: Full Dump & Restore (Neon -> checkin_db) ==="
    
    if [ "$CONFIRM_FLAG" != "--force-overwrite-danger" ]; then
      log "❌ DANGER: Full mode will DROP schemas and overwrite all live data in ${LOCAL_DB_NAME}!"
      log "   Production has been writing live data to VPS checkin_db since Oct 2."
      log "   To proceed, you MUST pass '--force-overwrite-danger' explicitly."
      log "   Example: ./scripts/sync-db.sh full --force-overwrite-danger"
      exit 1
    fi

    take_pre_backup

    log "1. Dumping Neon database to ${NEON_DUMP_FILE}..."
    docker exec "${CONTAINER_DB}" pg_dump "${NEON_DB_URL}" -F c -b -v -f "${NEON_DUMP_FILE}"

    log "2. Resetting public schema and neon_auth schema..."
    docker exec "${CONTAINER_DB}" psql -U "${LOCAL_DB_USER}" -d "${LOCAL_DB_NAME}" -c \
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS neon_auth CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

    log "3. Restoring dump to ${LOCAL_DB_NAME} with --no-owner --no-privileges..."
    docker exec "${CONTAINER_DB}" pg_restore -U "${LOCAL_DB_USER}" -d "${LOCAL_DB_NAME}" \
      --no-owner \
      --no-privileges \
      -v "${NEON_DUMP_FILE}"

    log "🎉 Full restore from Neon completed successfully!"
    ;;

  *)
    echo "Unknown mode: $MODE"
    echo "Usage: ./scripts/sync-db.sh [backfill|full|backup-only] [--force-overwrite-danger]"
    exit 1
    ;;
esac

log "=== Database Sync Task Completed ==="
