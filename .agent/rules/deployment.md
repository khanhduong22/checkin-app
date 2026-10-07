---
trigger: model_decision
description: Rule for managing VPS deployment, database migrations, and environment configurations for checkin-app.
---

# Production & Staging VPS Deployment Rules

> [!IMPORTANT]
> The checkin-app is hosted on **Contabo VPS** (`144.91.88.242`) with Docker and managed by Caddy 2 reverse proxy.
> Always adhere to these rules to maintain infrastructure stability and prevent production downtime or data loss.

---

## 1. Hosting Architecture & Dual-Run Environments

| Environment | Domain | Branch | Container(s) | Architecture |
| :--- | :--- | :--- | :--- | :--- |
| 🚀 **Production** | `https://limart.khanhdp.com` | `main` | `checkin-app` (Port 3000) | Next.js 16 Monolith Standalone |
| 🧪 **Staging Canary** | `https://limart2.khanhdp.com` | `feat/monorepo-migration` | `checkin-api-v2` (:4000)<br>`checkin-admin-v2` (:3001)<br>`checkin-staff-v2` (:3002) | Monorepo 3-Tier (Hono API + Admin SPA + Staff PWA) |

- **Network**: All containers run on the shared external Docker bridge network `ops_bridge`.
- **Reverse Proxy**: Managed by Caddy 2 (`/opt/kido-infra/caddy/Caddyfile`), terminating Cloudflare Strict SSL and forwarding real client IP headers (`Cf-Connecting-Ip` mapped to `X-Forwarded-For` and `X-Real-IP`).
- **Zero-Downtime Deployment**: Staging uses a blue-green atomic container swap (`scripts/deploy-staging.sh`). Production monorepo cutover uses `scripts/deploy-monorepo.sh`.

---

## 2. Database Safety & Dual-Run Rules (CRITICAL)

- **Dedicated PostgreSQL 17**: Hosted inside container `checkin-db` on port 5432 (DB: `checkin_db`, User: `kido`).
- **Continuous Backups**: pgBackRest streams WAL archives continuously into volume `checkin_pgbackrest_data`, enabling point-in-time recovery (PITR).
- **Dual-Run DB Sharing Rules**:
  - The Staging Canary stack connects directly to `checkin_db` in dual-run mode.
  - ⚠️ **ZERO AUTO-PUSH ON STAGING**: Staging deployment scripts MUST NOT run `prisma db push` or schema alterations against the shared production database.
- **Production Migrations**:
  - Schema changes are synchronized during Production deployment via `prisma db push --skip-generate`.
  - 🚫 **BANNED COMMANDS**:
    - `prisma migrate reset` is STRICTLY BANNED.
    - `prisma db push --force-reset` is STRICTLY BANNED.
    - `docker volume rm checkin_pgdata` or `docker volume prune -a` on VPS is STRICTLY BANNED.

---

## 3. CI/CD Deployment Workflows (No Manual VPS Builds)

> ⚠️ **DO NOT run manual `docker compose build` or PM2 commands directly on the VPS via SSH.** Manual builds consume excessive memory and bypass automated test gates.

1. **Deploying to Staging (`limart2.khanhdp.com`)**:
   - Push commit to `feat/monorepo-migration`.
   - Triggers `.github/workflows/deploy-monorepo.yml`:
     - Runs monorepo tests (`pnpm test`).
     - Builds Docker images and pushes to GHCR.
     - SSH invokes `scripts/deploy-staging.sh` with blue-green swap and /health verification.
2. **Deploying to Production (`limart.khanhdp.com`)**:
   - Merge approved PR into `main` and push.
   - Triggers `.github/workflows/deploy.yml`:
     - Runs unit tests and build check.
     - Deploys pre-built GHCR image to `/opt/checkin-app`.
     - Syncs schema safely.

---

## 4. Deployment Completion & Verification Rule (MANDATORY)

> [!IMPORTANT]
> **NEVER report a task or feature as complete while deployment is still pending or running.**
> Reporting "Done" prematurely makes it hard for the user to verify because the changes are not yet live on the server!

- **Deployment Watch Requirement**:
  - After pushing to GitHub (`main` or `feat/monorepo-migration`), the agent **MUST** wait for the GitHub Actions deployment workflow to finish.
  - Run `gh run watch <run-id>` or track `gh run view <run-id>` until the workflow status is `completed` with conclusion `success`.
  - If the deployment fails (`failure`), analyze the logs (`gh run view --log-failed`), fix the issue, and re-deploy.
- **Reporting Gate**:
  - ONLY after the CI/CD pipeline has successfully completed and the changes are verifiably live on the server (`limart.khanhdp.com` or `limart2.khanhdp.com`), the agent can report to the user that deployment is complete and ready for testing.

---

## 5. Environment Variables & Secret Hygiene

- **GitHub Secrets Managed**: Production environment secrets are stored in GitHub Repository Secrets. The CI/CD pipeline generates the VPS `.env` file dynamically during deployment.
- **Adding Variables**: Use the GitHub CLI (`gh secret set <NAME> --body "<VAL>"`) and add the key to the `env` and `envs` array in the respective workflow YAML file.
- **Never Commit Secrets**: Never hardcode API keys, database credentials, or secret tokens into git repositories.

---

## 6. Non-Dev Maintainer Support

When assisting a non-dev maintainer:
- Explain actions in clear, friendly Vietnamese.
- Provide full context and risk level before suggesting any deployment or configuration change.
- Refer to `AGENTS.md` and `DEPLOY.md` for standard operations.
