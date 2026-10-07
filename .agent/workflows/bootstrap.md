---
description: Bootstrap workflow - setup and initialize local development
---

# Bootstrap Workflow

## Steps

1. **Verify Prerequisites**:
   - Node.js v20+, pnpm v10+
2. **Install Monorepo Dependencies**:
   ```bash
   pnpm install
   ```
3. **Generate Prisma Client**:
   ```bash
   pnpm --filter @checkin/db generate
   ```
4. **Build Shared Packages**:
   ```bash
   pnpm --filter @checkin/shared build
   pnpm --filter @checkin/audit-trail build
   pnpm --filter @checkin/zero-downtime-deploy build
   pnpm --filter @checkin/db build
   ```
5. **Run Baseline Tests**:
   ```bash
   pnpm test
   ```
