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
- **Production Database**: Hosted inside its own dedicated `checkin-db` container (Database name: `checkin_db`, Port: `5432`).
  - Connection string: `DATABASE_URL="postgresql://kido:KidoVPS2026!@checkin-db:5432/checkin_db?sslmode=disable"`
  - It runs isolated from the shared database container to prevent resource sharing conflicts and allow independent database restores.
- **Local Development Database**: Points to **Neon Postgres** cloud database:
  - Connection string in local `.env` and `.env.local` remains Neon.
  - This prevents local testing/vibe coding from altering production data.

## 3. Database Schema Changes & Migrations
- **Safe Migrations only**: NEVER run `prisma db push` on production.
- **Workflow**:
  1. The developer runs `npx prisma migrate dev` locally to generate migration files against the Neon DB sandbox.
  2. The developer commits and pushes the migration files (inside `prisma/migrations/`) to the `main` branch.
  3. The GitHub Actions CI/CD pipeline automatically deploys the code and runs `npx prisma migrate deploy` inside the running `checkin-app` container on the VPS to apply changes safely without resetting data.

## 4. Environment Variables & Secret Management
- **GitHub Secrets Managed**: Production environment variables are managed securely via **GitHub Actions Repository Secrets** (and NOT manually edited on the VPS).
- **Automatic .env Generation**: The CI/CD pipeline automatically reads the secrets, generates the production `.env` file on the fly, and transfers it to the VPS during deployment.
- **Adding New Variables**: If a new environment variable is introduced, the developer or AI agent can add it directly to GitHub Secrets using the `gh` CLI:
  ```bash
  gh secret set NEW_VAR_NAME --body "secret_value"
  ```
  And then add it to `.github/workflows/deploy.yml` in the `env` and `envs` list to ensure it is written to the VPS `.env` file.

## 5. CI/CD Deployment
- Pushing to the `main` branch automatically triggers the GitHub Actions pipeline.
- Do NOT run manual PM2 or Vercel CLI deploy commands. The workflow runs tests, builds the standalone app check, and SSH deploys via `appleboy/ssh-action`.
