# Project Directives & System Topology (checkin-app)

================================================================================
1. CONTABO VPS HOST & RUNTIME TOPOLOGY
================================================================================
- **Host**: Contabo VPS (`144.91.88.242`) | SSH Alias: `ssh contabo` (User: `root`).
- **Network Driver**: Docker external bridge `ops_bridge` (all containers share this network).
- **Reverse Proxy**: Caddy 2 (`caddy:2-alpine`, `/opt/kido-infra/caddy/Caddyfile`).
- **SSL / TLS**: Cloudflare Origin CA wildcard + Cloudflare Full Strict Proxy.
- **Client IP Forwarding**: Caddy extracts `Cf-Connecting-Ip` and passes via `X-Forwarded-For` and `X-Real-IP`.

### Active Environment & Domain Inventory
| Environment | Domain / URL | Branch / Compose | Active Containers | Architecture |
| :--- | :--- | :--- | :--- | :--- |
| 🚀 **Production** | `https://limart.khanhdp.com` | `feat/monorepo-migration` (`/opt/limart`) | `limart-api` (:4000)<br>`limart-admin` (:3001)<br>`limart-staff` (:3002) | Monorepo 3-Tier (Hono RESTful API + Vite Admin SPA + Vite Staff PWA) |
| 🧪 **Staging Canary** | `https://limart2.khanhdp.com` | `feat/monorepo-migration` (`/opt/limart`) | Routes to Monorepo 3-Tier stack via Caddy | Monorepo 3-Tier (Canary domain) |
| 🔄 **Backup Domain** | `https://limart3.khanhdp.com` | Caddy Redirect | None | Permanent HTTP 301 redirect ➔ `https://limart.khanhdp.com/` |
| 🛑 **Legacy Monolith** | N/A | `/opt/checkin-app` | `checkin-app` (:3000) | **Stopped & Decommissioned** (Next.js 16 Monolith, saves ~280 MiB RAM) |

### Shared Backing Services
- 🗄️ **PostgreSQL 17** (`limart-db` on port 5432): Database `checkin_db`. Backed by volume `checkin-app_checkin_pgdata`. Continuous WAL archiving via pgBackRest into volume `checkin_pgbackrest_data`.
- ⚡ **Valkey 8 Cache** (`limart-valkey` on port 6389:6379): 64MB LRU cache, singleflight anti-stampede protection.
- 🔍 **Meilisearch** (`meilisearch` on port 7700): Sub-50ms typo-tolerant search for unaccented Vietnamese names & tasks.

================================================================================
2. MONOREPO CODEBASE STRUCTURE
================================================================================
```
checkin-app/
├── apps/
│   ├── admin-spa/            # Admin management dashboard (Vite + React SPA, Nginx container)
│   ├── api/                  # High-performance RESTful API (Bun/Node + Hono, Port 4000)
│   └── staff-pwa/            # Staff attendance & tasks (Vite + React PWA, offline service worker)
├── packages/
│   ├── audit-trail/          # Cryptographic SHA-256 chained audit logger (@checkin/audit-trail)
│   ├── db/                   # Centralized Prisma client singleton & schema (@checkin/db)
│   ├── shared/               # Shared DTOs, types, helpers, and constants (@checkin/shared)
│   └── zero-downtime-deploy/ # Blue-green deployment swap orchestrator (@checkin/zero-downtime-deploy)
├── src/                      # Production Next.js 16 monolith application (v1)
├── prisma/                   # Root Prisma schema (mirrored to packages/db/prisma/schema.prisma)
├── scripts/                  # Deploy scripts (deploy-staging.sh, deploy-monorepo.sh, pgbackrest-*)
└── .agent/                   # AI Agent rules & skills
```

================================================================================
3. STRICT NON-DEV MAINTAINER PROTECTION INVARIANTS
================================================================================
> [!IMPORTANT]
> This repository is maintained by a **non-developer maintainer** using AI agents.
> All agents (Antigravity, Claude, Cursor) MUST adhere to these safety boundaries without exception:

1. **Clear, Supportive Vietnamese Communication**:
   - Explain what you are doing, why you are doing it, and the risk level (Thấp / Trung bình / Cao) before modifying code.
   - Avoid intimidating dev jargon. Provide exact copy-pasteable commands and verification steps.
2. **Zero Destructive Database Resets (STRICTLY PROHIBITED)**:
   - 🚫 **NEVER** run `prisma migrate reset` or `prisma db push --force-reset`.
   - 🚫 **NEVER** run `docker volume rm checkin_pgdata` or `docker volume prune -a` on VPS.
   - 🚫 **NEVER** delete raw database records without explicit user confirmation.
3. **Dual-Run DB Safety on Staging (ZERO AUTO-PUSH)**:
   - Staging canary connects directly to `checkin_db` in dual-run mode.
   - Staging deploy scripts (`scripts/deploy-staging.sh`) MUST NEVER execute `prisma db push` against the shared database.
   - Production schema updates run via non-destructive `prisma db push --skip-generate` ONLY during production CI/CD deployments.
4. **CI/CD Over Manual SSH Builds**:
   - 🚫 **NEVER** run `docker compose build` or `npm run build` on the remote VPS via SSH. Manual builds consume CPU/RAM and bypass test gates.
   - Deployments must always flow through Git commits to GitHub Actions. SSH is reserved for read-only diagnostics and container restarts.
5. **Evidence-First Verification**:
   - Always run tests (`pnpm test`) before reporting completion. Show real passing output.
   - Never suppress errors with empty `catch {}` blocks or silence types with `@ts-ignore` or unchecked `any`.
6. **Zero Public Staff Lists & Strict Zero-Trust Auth (STRICT PRIVACY INVARIANT)**:
   - 🚫 **NEVER** expose employee account lists, search/dropdown selectors, or passwordless quick-switchers in client-facing applications or public API endpoints.
   - Staff authentication MUST strictly require verified Google OAuth credentials matching active database records.
   - Development debug shortcuts, mock accounts, or bypass logins must NEVER be committed to client code or deployed to staging/production environments.

================================================================================
4. CI/CD DEPLOYMENT WORKFLOWS
================================================================================
- **Unified Monorepo Deployment (`deploy-monorepo.yml`)**:
  - **Triggers**: Push commit to `main` or `feat/monorepo-migration` (filtered by active monorepo paths), or manual `workflow_dispatch`.
  - **Target Domains**: Serves Production (`limart.khanhdp.com`) and Staging Canary (`limart2.khanhdp.com`).
  - **Mechanism**: Builds GHCR multi-tier images (`api`, `admin`, `staff`) ➡️ SSH invokes deployment script (`scripts/deploy-staging.sh` / `scripts/deploy-monorepo.sh`) ➡️ Starts candidate container on port 4000 ➡️ Healthchecks `/health` (45s timeout) ➡️ Atomic container rename swap ➡️ Caddy zero-downtime reload.
- **Legacy Monolith Pipeline (`deploy.yml`) - DEPRECATED**:
  - Previously built and deployed the Next.js 16 standalone monolith (`checkin-app` on port 3000).
  - Kept for historical reference only; inactive now that production runs on the Monorepo 3-Tier stack.

================================================================================
5. ESSENTIAL COMMANDS CHEATSHEET
================================================================================

### Local Testing & Development
```bash
# Run all unit tests across the monorepo (Turbo cached)
pnpm test

# Run tests for specific packages
pnpm --filter @checkin/shared test
pnpm --filter @checkin/audit-trail test
pnpm --filter @checkin/api test
pnpm --filter @checkin/staff-pwa test

# Run Playwright E2E browser tests
npm run test:e2e
```

### Read-Only Production & Staging Diagnostics (Safe to run)
```bash
# Check running Limart Monorepo containers
ssh contabo "docker ps --filter 'name=limart' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Check memory status (Must maintain >= 2.0 GiB available)
ssh contabo "free -h"

# Inspect live logs via terminal
ssh contabo "docker logs --tail 100 -f limart-api"         # Hono API logs
ssh contabo "docker logs --tail 100 -f limart-admin"       # Admin SPA logs
ssh contabo "docker logs --tail 100 -f limart-staff"       # Staff PWA logs
ssh contabo "docker logs --tail 50 limart-db"              # PostgreSQL database logs
ssh contabo "docker logs --tail 50 limart-valkey"          # Valkey cache logs

# Probe HTTP health
curl -sI https://limart.khanhdp.com | head -n 5           # Prod HTTP status
curl -s https://limart.khanhdp.com/health                 # Prod API health JSON
curl -s https://limart2.khanhdp.com/health                # Staging canary API health JSON
```

### Safe Recovery & Restart Procedures
```bash
# Restart Monorepo 3-Tier containers (Safe: no data loss)
ssh contabo "docker restart limart-api limart-admin limart-staff"

# Reload Caddy Reverse Proxy
ssh contabo "docker exec caddy caddy reload --config /etc/caddy/Caddyfile"

# Emergency Rollback via GitHub Actions:
# Go to https://github.com/khanhduong22/checkin-app/actions -> Select last successful run -> Re-run all jobs
```

### pgBackRest Backup & Point-in-Time Recovery (PITR)
```bash
# Inspect backup status & WAL archive health
ssh contabo "docker exec -u postgres limart-db pgbackrest --stanza=checkin info"

# Trigger manual backup
ssh contabo "/opt/checkin-app/scripts/pgbackrest-backup.sh incr"

# Rewind database to exact time before an accident (Time Travel)
ssh contabo "cd /opt/checkin-app && ./scripts/pgbackrest-restore.sh --time 'YYYY-MM-DD HH:MM:SS'"
```

================================================================================
6. MASTER AGENT ORCHESTRATION & MANDATORY SUBAGENT DELEGATION
================================================================================
> [!IMPORTANT]
> **Strict Orchestrator Boundary**: The Master Agent in this repository is strictly an **Executive Assistant & Orchestrator**.
> - **The Master Agent MUST NOT** directly implement code, edit multi-line files, run deep debugging loops, or iterate tests in the master session.
> - **ALL engineering tasks** (coding, bugfixes, refactoring, test suites, E2E browser tests, benchmarks, log tracing) **MUST BE DELEGATED TO SUBAGENTS**.
> - Rule: `.agent/rules/master-orchestration.md` | Skill: `.agent/skills/subagent-orchestrator/SKILL.md`.

- **Master Agent Responsibilities**: Planning, requirement clarification with maintainer (supportive Vietnamese), subagent supervision, auditing return payloads & diffs, cross-contract verification, and handover summaries.
- **Mandatory Subagent Naming**:
  ```text
  [YYYY-MM-DD HH:mm | #<issue>] <Descriptive Role>
  ```
  *(If no issue number exists, use: `[YYYY-MM-DD HH:mm] <Descriptive Role>`)*
  - **Examples**:
    * `[2026-10-07 11:45 | #3151] Group E2E Recording Specialist`
    * `[2026-10-07 11:45 | #payroll] Salary Calculation Auditor`
    * `[2026-10-07 11:45] Staging Canary Health Verifier`
    * `[2026-10-07 11:45] Valkey Cache Concurrency Benchmarker`
- **Durable Disk Handover Protocol**: Subagents execute changes and test suites directly on disk, returning structured summaries (files modified, test pass/fail counts, residual risks). The master agent verifies disk state and reports the executive summary to the maintainer.

