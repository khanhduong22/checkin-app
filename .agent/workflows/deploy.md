---
description: Deploy the application — always runs E2E tests, build check, git push, then Vercel production deploy.
---

# Deploy Workflow

> [!IMPORTANT]
> "Deploy" ALWAYS means ALL 4 steps below: **test → build → git → vercel**. Never skip any step.

// turbo-all

## Step 1: Run E2E Tests

```bash
npm run test:e2e
```

- Must pass **100%** before proceeding.
- If any test fails, stop and fix before deploying.

## Step 2: Build Check

```bash
npm run build
```

- Must compile with **0 errors** (TypeScript + Next.js build).
- If build fails, stop and fix before deploying.

## Step 3: Git Commit & Push

```bash
git add -A
git commit -m "<type>: <description>"
git push origin main
```

- Use conventional commit format: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- Push to `main` branch (Vercel listens to this branch).

## Step 4: Vercel Production Deploy

```bash
vercel --prod
```

- Deploys to production. Vercel CLI must be installed globally (`npm install -g vercel`).
- Confirm the deployment URL is live after the command completes.
- Both GitHub and Vercel must show the latest commit deployed.
