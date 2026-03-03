---
description: Deploy the application — always runs E2E tests, build check, git push, then Vercel production deploy.
---

# Deploy Workflow

> [!IMPORTANT]
> **"Deploy" = TẤT CẢ 5 bước dưới đây, theo đúng thứ tự. Không được bỏ bước nào.**
> Canonical reference: [`DEPLOY.md`](../../DEPLOY.md) tại project root.

// turbo-all

## Step 1: E2E Tests

```bash
npm run test:e2e
```

Phải **100% pass** trước khi tiếp. Nếu fail → dừng lại, fix trước.

## Step 2: Build Check

```bash
npm run build
```

Phải compile **0 errors**. Nếu build fail → dừng lại, fix trước.

## Step 3: Commit

```bash
git add -A
git commit -m "feat|fix|chore|test|docs: <mô tả>"
```

## Step 4: Git Push

```bash
git push origin main
```

## Step 5: Vercel Deploy

```bash
vercel --prod
```

Confirm URL live sau khi hoàn tất. Cả GitHub lẫn Vercel đều phải reflect commit mới nhất.
