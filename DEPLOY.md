# Deployment Guidelines

## 🚀 Overview
This project uses **Next.js** deployed on **Vercel** with a **Neon (Postgres)** database.
Legacy VPS deployment scripts have been removed. 

**DO NOT** attempt to deploy this manually to a VPS using PM2 unless explicitly requested for a specific reason.

## 🔄 Deployment Workflow
Authentication and deployment are handled automatically via GitHub Integration.

1.  **Develop**: Make changes and test locally (`yarn dev` or `yarn start`).
2.  **Commit**: Commit your changes.
3.  **Push**: Push to the `main` branch.
    ```bash
    git push origin main
    ```
4.  **Auto-Deploy**: Vercel will automatically trigger a new build and deployment.

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
