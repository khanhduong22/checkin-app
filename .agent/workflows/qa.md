---
description: Automated QA & testing workflow - write and run executable Vitest and Playwright tests
---

# QA & Testing Workflow

> [!IMPORTANT]
> Write runnable, executable tests (`tests/unit/` with Vitest, `tests/e2e/` with Playwright, or package tests) instead of markdown test case documents.

---

## Step 1: Identify Test Boundaries
1. Analyze the feature or bug fix:
   - Happy Path (Golden Flow)
   - Negative Path (Input validation, unauthorized access)
   - Boundary Cases (Min/max, null, empty inputs)

## Step 2: Implement Executable Tests
1. For backend / utility logic:
   - Add tests to `tests/unit/` or package `test/` folder using Vitest.
   - Target: 100% branch coverage on modified functions.
2. For frontend / user flows:
   - Add Playwright tests to `tests/e2e/`.

## Step 3: Run & Verify
```bash
# Run monorepo unit tests
pnpm test

# Run E2E tests
npm run test:e2e
```
3. Report passing test count and execution time in task summary.
