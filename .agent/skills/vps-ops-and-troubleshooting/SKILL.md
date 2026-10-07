---
name: vps-ops-and-troubleshooting
description: Expert operational runbook and diagnostics for LimArt Checkin App on Contabo VPS. Covers Docker container lifecycle, Caddy reverse proxy, Valkey cache, pgBackRest backups/PITR, Dozzle log tracing, and zero-downtime Blue-Green deployments.
---

# Skill: VPS Operations & Troubleshooting (LimArt Checkin)

## 🎯 Purpose
Provide instant, infallible operational procedures for managing, inspecting, and recovering the **Checkin App** production and staging environments on **Contabo VPS** (`144.91.88.242`).

---

## 🗂️ 1. Container Inventory & Network Topology

All checkin services connect via the external Docker bridge network `ops_bridge`:

| Service / Container | Internal Port | Environment | Role / Notes |
| :--- | :---: | :--- | :--- |
| `checkin-app` | `3000` | Production (`limart.khanhdp.com`) | Next.js 16 Standalone Monolith |
| `checkin-api-v2` | `4000` | Staging (`limart2.khanhdp.com/api`) | Bun/Node Hono RESTful API |
| `checkin-admin-v2` | `3001` | Staging (`limart2.khanhdp.com/admin`) | Vite React SPA for Admin |
| `checkin-staff-v2` | `3002` | Staging (`limart2.khanhdp.com/`) | Vite React PWA for Staff |
| `checkin-db` | `5432` | Shared Persistent | PostgreSQL 17 + pgBackRest WAL streaming |
| `checkin-valkey` | `6389:6379` | Shared Cache | Valkey 8 in-memory LRU cache |
| `meilisearch` | `7700` | Shared Search | Vietnamese typo-tolerant search engine |
| `caddy` | `80, 443` | Reverse Proxy | Cloudflare Origin SSL + IP Forwarding |

---

## 🔍 2. Read-Only Diagnostic Commands (Safe to Run Anytime)

### Check Container Status & Resource Usage
```bash
# List all running checkin containers
ssh contabo "docker ps --filter 'name=checkin' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Check server memory (Must maintain >= 2.0 GiB available)
ssh contabo "free -h"

# Check disk space usage
ssh contabo "df -h /"
```

### Inspect Live Logs
```bash
# Production Next.js app logs (last 100 lines)
ssh contabo "docker logs --tail 100 -f checkin-app"

# Staging API v2 logs
ssh contabo "docker logs --tail 100 -f checkin-api-v2"

# Database logs
ssh contabo "docker logs --tail 50 checkin-db"

# Valkey cache logs
ssh contabo "docker logs --tail 50 checkin-valkey"
```

### Test HTTP Endpoints & Health
```bash
# Test Production response
curl -sI https://limart.khanhdp.com | head -n 5

# Test Staging health endpoint
curl -s https://limart2.khanhdp.com/health
```

---

## 🛠️ 3. Safe Recovery & Restart Procedures

### A. Restarting Web Services Without Data Loss
Restarting app containers does NOT touch persistent database data:
```bash
# Restart Production
ssh contabo "docker restart checkin-app"

# Restart Staging Canary
ssh contabo "docker restart checkin-api-v2 checkin-admin-v2 checkin-staff-v2"

# Reload Caddy Proxy (Zero-Downtime)
ssh contabo "docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
```

### B. Restarting Database & Cache (If Offline)
```bash
# Start DB and Cache if stopped
ssh contabo "docker start checkin-db checkin-valkey"

# Verify DB is ready to accept connections
ssh contabo "docker exec checkin-db pg_isready -U kido -d checkin_db"
```

---

## 💾 4. pgBackRest Backup & Point-in-Time Recovery (PITR)

### A. Check Backup Status
```bash
# Inspect backup history and WAL archives
ssh contabo "docker exec -u postgres checkin-db pgbackrest --stanza=checkin info"
```

### B. Trigger Manual Backup
```bash
# Run incremental backup
ssh contabo "/opt/checkin-app/scripts/pgbackrest-backup.sh incr"

# Run differential backup
ssh contabo "/opt/checkin-app/scripts/pgbackrest-backup.sh diff"
```

### C. Rewind Database to Exact Timestamp (Time Travel)
If an accidental table drop or catastrophic data corruption occurred at `14:32:10`:
```bash
ssh contabo "cd /opt/checkin-app && ./scripts/pgbackrest-restore.sh --time '2026-10-07 14:32:00'"
```

---

## ⚠️ 5. Strict VPS Operational Invariants

1. 🚫 **NEVER run `docker volume prune -a` or `docker volume rm checkin_pgdata`**.
2. 🚫 **NEVER run `docker compose build` directly on the VPS**. Builds must run on GitHub Actions runner.
3. 🚫 **NEVER run `prisma migrate reset` on production database**.
4. 🚫 **Maintain >= 2.0 GiB available RAM** before starting any auxiliary containers.
