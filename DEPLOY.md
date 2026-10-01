# Deployment Guidelines

## 🚀 Overview
This project uses **Next.js 16 (Docker standalone)** deployed on **Contabo VPS** (`https://limart.khanhdp.com`) via GitHub Actions CI/CD with:
- **PostgreSQL 17** (`checkin-db` container on port 5432)
- **Valkey 8 Cache** (`checkin-valkey` container on port 6389)
- **Meilisearch** (`meilisearch` container on `ops_bridge` network)
- **Nginx Proxy Manager** (SSL termination & reverse proxy)

## 🔄 Deployment Workflow

> [!IMPORTANT]
> **Tất cả deployment lên production đều được kích hoạt tự động qua GitHub Actions khi push vào branch `main`.**

1. **Unit Tests**: Chạy unit test suite — phải **100% pass** trước khi push.
   ```bash
   npm run test
   ```

2. **Build Check**: Kiểm tra build local — phải **0 errors**.
   ```bash
   npm run build
   ```
   > ⚠️ **CRITICAL**: Do NOT push if the build fails. Fix errors first.

3. **Commit**: Commit các thay đổi với conventional commit.
   ```bash
   git add -A
   git commit -m "feat|fix|chore|test: <mô tả>"
   ```

4. **Git Push**: Push lên `main` để kích hoạt workflow `.github/workflows/deploy.yml`.
   ```bash
   git push origin main
   ```

5. **CI/CD Pipeline**: GitHub Actions sẽ tự động:
   - Run unit tests & build test
   - Deploy via SSH to VPS: copy docker-compose, gen `.env`, chạy `docker compose up -d --build checkin-app`
   - Chạy `prisma db push` tự động đồng bộ schema database.


## 🛠 Project Configuration
### Environment Variables (GitHub Secrets)
Ensure the following variables are set in GitHub Repository Secrets (managed via CI/CD):

- `DATABASE_URL`: Connection string for PostgreSQL container (`postgresql://kido:...@checkin-db:5432/checkin_db?sslmode=disable`).
- `NEXTAUTH_SECRET`: Secret key for authentication encryption.
- `NEXTAUTH_URL`: The production URL (`https://limart.khanhdp.com`).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials.
- `REDIS_URL`: Valkey connection URL (`redis://checkin-valkey:6379`).
- `MEILISEARCH_HOST`: Meilisearch URL (`http://meilisearch:7700`).
- `MEILISEARCH_KEY`: Meilisearch API / Master key.

### Docker & Service Architecture
- **Web App**: `checkin-app` container (Next.js standalone on port 3000).
- **Database**: `checkin-db` container (PostgreSQL 17 on port 5432).
- **Cache**: `checkin-valkey` container (Valkey 8 on port 6389).
- **Search**: `meilisearch` container on shared `ops_bridge` network.

## ⚠️ Important Notes for Agents
- **Graceful Fallback**: Cache and search integrations MUST fail gracefully back to PostgreSQL without throwing 500.
- **Database Safety**: 
    - **NEVER** run `prisma migrate reset` or `prisma db push --force-reset` on production.
    - Database backups are located at `/opt/checkin-app/backups/`.
- **Logs**: If an issue occurs, check container logs via:
  ```bash
  docker logs -f checkin-app --tail 100
  docker logs -f checkin-valkey --tail 50
  ```
