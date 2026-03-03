# Deployment Guidelines

## 🚀 Overview
This project uses **Next.js** deployed on **Vercel** with a **Neon (Postgres)** database.

**DO NOT** attempt to deploy this manually to a VPS using PM2 unless explicitly requested for a specific reason.

## 🔄 Deployment Workflow

> [!IMPORTANT]
> **"Deploy" = TẤT CẢ 5 bước dưới đây, theo đúng thứ tự. Không được bỏ bước nào.**

1. **E2E Tests**: Chạy test suite — phải **100% pass** trước khi tiếp.
   ```bash
   npm run test:e2e
   ```

2. **Build Check**: Build local — phải **0 errors**.
   ```bash
   npm run build
   ```
   > ⚠️ **CRITICAL**: Do NOT push if the build fails. Fix errors first.

3. **Commit**: Commit các thay đổi với conventional commit.
   ```bash
   git add -A
   git commit -m "feat|fix|chore|test: <mô tả>"
   ```

4. **Git Push**: Push lên `main`.
   ```bash
   git push origin main
   ```

5. **Vercel Deploy**: Deploy production qua CLI.
   ```bash
   vercel --prod
   ```
   Confirm URL live sau khi hoàn tất. Cả GitHub lẫn Vercel đều phải reflect commit mới nhất.


## 🛠 Project Configuration
### Environment Variables (Vercel)
Ensure the following variables are set in the Vercel Project Settings:

- `DATABASE_URL`: Connection string for Neon Postgres (Pooled connection).
- `NEXTAUTH_SECRET`: Secret key for authentication encryption.
- `NEXTAUTH_URL`: The production URL (e.g., `https://your-domain.com`).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials.

### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `prisma generate && prisma db push && next build` (or standard `next build` if configured in `package.json`).
- **Output Directory**: `.next`

## ⚠️ Important Notes for Agents
- **Linting**: The project is configured to **ignore lint errors** during the build (`ignoreDuringBuilds: true` in `next.config.mjs`). Do not waste time fixing minor styling/lint warnings unless they cause runtime errors.
- **Database**: 
    - Migrations are automatic. 
    - **NEVER** run `prisma db push --force-reset` on production.
- **Logs**: If a deployment fails, check the **Vercel Dashboard > Deployments > Logs** first. Do not debug blindly.
