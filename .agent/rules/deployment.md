---
trigger: model_decision
description: Rule for managing VPS deployment, database migrations, and environment configurations for checkin-app.
---

# Production VPS Deployment and Database Rules

> [!IMPORTANT]
> The checkin-app has been migrated from Vercel to self-hosting on a Contabo VPS. Follow these rules to maintain the infrastructure and prevent workflow disruption.

## 1. Hosting Architecture
- **Production Host**: Contabo VPS (`144.91.88.242`)
- **Domain**: `https://limart.khanhdp.com`
- **Container Network**: Connected to the shared bridge network `ops_bridge`.
- **Nginx Proxy**: Managed by Nginx Proxy Manager (container `nginx-proxy-manager`) routing `limart.khanhdp.com` -> `http://checkin-app:3000`.
- **Infrastructure Code**: Declared in `kido-infra` Terraform files.

## 2. Database Configuration
- **Production Database**: Hosted inside the shared `postgres` container on the VPS (Database name: `checkin_db`, Port: `5432`).
  - Connection string: `DATABASE_URL="postgresql://kido:KidoVPS2026!@postgres:5432/checkin_db?sslmode=disable"`
  - Shared postgres is automatically backed up using the existing `pgbackrest` setup on the VPS.
- **Local Development Database**: Points to **Neon Postgres** cloud database:
  - Connection string in local `.env` and `.env.local` remains Neon.
  - This prevents local testing/vibe coding from altering production data.

## 3. Database Schema Changes & Migrations
- **Safe Migrations only**: NEVER run `prisma db push` on production.
- **Workflow**:
  1. The developer runs `npx prisma migrate dev` locally to generate migration files against the Neon DB sandbox.
  2. The developer commits and pushes the migration files (inside `prisma/migrations/`) to the `main` branch.
  3. The GitHub Actions CI/CD pipeline automatically deploys the code and runs `npx prisma migrate deploy` inside the running `checkin-app` container on the VPS to apply changes safely without resetting data.

## 4. Environment Variables
- Environment variables for production are kept in `/opt/checkin-app/.env` on the VPS.
- If a new environment variable is added to the application code, it must be added manually to `/opt/checkin-app/.env` on the VPS. It must not be committed to GitHub.

## 5. CI/CD Deployment
- Pushing to the `main` branch automatically triggers the GitHub Actions pipeline.
- Do NOT run manual PM2 or Vercel CLI deploy commands. The workflow runs tests, builds the standalone app check, and SSH deploys via `appleboy/ssh-action`.
