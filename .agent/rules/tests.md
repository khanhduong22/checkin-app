---
trigger: model_decision
description: Always run tests to ensure no regressions when implementing new features or fixing bugs
---

# Testing and Regression Standards

> [!IMPORTANT]
> This rule is **MANDATORY** when implementing new features, fixing bugs, or performing major refactors.
> Ensuring system stability and regression prevention is a non-negotiable priority.

---

## 1. Critical Rules (MUST Follow)

1. **MUST** run existing tests before starting any work to establish a baseline.
2. **MUST** run tests after completing changes to ensure no regressions were introduced.
3. **MUST** write Unit Tests for **EVERY** function, route handler, or utility added or modified. **Target: 100% coverage** on business logic and exported helpers.
4. **MUST** add reproduction tests for any bug fixes to ensure the bug cannot regress.
5. **MUST** report test results (pass/fail) with exact command output in task summaries.
6. **MUST NOT** finalize a task or declare victory if any test is failing.
7. **MUST NOT** push code to remote repositories without passing the Pre-Deploy Gate below.

---

## 2. Test Execution Commands

### Monorepo v2 Test Suites (Fastest & Standard)
```bash
# Run all tests across the monorepo via Turbo cache
pnpm test

# Run tests for specific packages or apps
pnpm --filter @checkin/shared test
pnpm --filter @checkin/audit-trail test
pnpm --filter @checkin/api test
pnpm --filter @checkin/staff-pwa test
pnpm --filter @checkin/zero-downtime-deploy test
```

### Next.js Monolith v1 Test Suites
```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- tests/unit/stats.test.ts
```

### End-to-End (E2E) Browser Tests (Playwright)
```bash
# Headless E2E tests
npm run test:e2e

# Interactive UI E2E runner
npm run test:e2e:ui
```

---

## 3. Pre-Deploy Gate (MANDATORY)

Before committing and pushing code to trigger deployment, ALL of the following steps must be completed **in exact order**:

```
┌──────────────────────────────────────────────────────────────┐
│ PRE-DEPLOY CHECKLIST (MUST complete in order):               │
├──────────────────────────────────────────────────────────────┤
│ 1. All Unit Tests passing 100% ✅                             │
│    → pnpm test (or npm run test)                             │
├──────────────────────────────────────────────────────────────┤
│ 2. Typecheck & Build succeeds with 0 errors ✅                │
│    → pnpm build (or npm run build)                           │
├──────────────────────────────────────────────────────────────┤
│ 3. User reviews build output and confirms deploy ✅           │
│    → Stop and request confirmation                           │
├──────────────────────────────────────────────────────────────┤
│ 4. Playwright E2E Tests pass ✅                               │
│    → npm run test:e2e                                        │
├──────────────────────────────────────────────────────────────┤
│ 5. User gives final approval ✅                               │
│    → Present test evidence to user                           │
├──────────────────────────────────────────────────────────────┤
│ 6. Git Push to trigger GitHub Actions VPS Deploy ✅           │
│    → Staging:    git push origin feat/monorepo-migration     │
│    → Production: git push origin main                        │
└──────────────────────────────────────────────────────────────┘
```

> [!CAUTION]
> **NEVER deploy without passing steps 1 through 5.**
> Never bypass GitHub Actions by attempting manual builds on the VPS.

---

## 4. Test Mocking & Data Safety Guidelines

- **Mock External Boundaries**: Use Vitest mocks (`vi.mock()`) for database calls, Google OAuth, and external mail APIs. Never execute live mutations on the production database during unit test runs.
- **Parametric Coverage**: Every new utility or route handler must cover:
  - ✅ Happy path (valid inputs, expected outputs).
  - ❌ Negative path (missing parameters, unauthorized access, expired sessions).
  - 🔲 Boundary conditions (min/max limits, empty arrays, null/undefined inputs).
- **Graceful Fallbacks**: Test that if Valkey or Meilisearch is unavailable, the system safely falls back to PostgreSQL without throwing unhandled exceptions.
