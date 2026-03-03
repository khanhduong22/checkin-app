---
trigger: model_decision
description: Always run tests to ensure no regressions when implementing new features or fixing bugs
---

# Testing and Regression Rule

> [!IMPORTANT]
> This rule is **MANDATORY** when implementing new features, fixing bugs, or performing major refactors. Ensuring system stability is a top priority.

## Critical Rules (MUST Follow)

1. **MUST** run existing tests before starting any work to establish a baseline.
2. **MUST** run tests after completing changes to ensure no regressions were introduced.
3. **MUST** write Unit Tests for **EVERY** function/utility added or modified. **Target: 100% coverage** on `src/lib/` and any exported helper functions.
4. **MUST** add reproduction tests for any bug fixes to ensure the bug does not return.
5. **MUST** report test results (pass/fail) in the task summary and walkthrough.
6. **MUST NOT** proceed to finalize a task if tests are failing, unless explicitly instructed by the user after explaining the failure and its impact.
7. **MUST** write E2E tests and get user confirmation **before** deploying to production (see Pre-Deploy Gate below).

## Unit Test Coverage Policy

- **Coverage target: 100%** for all functions in `src/lib/` and exported helpers.
- Every function MUST have tests covering:
  - ✅ Happy path (normal input)
  - ❌ Negative path (invalid/edge input)
  - 🔲 Boundary conditions (min/max values, empty arrays, null)
- Use **Vitest** (`vi.mock()`) to mock Prisma, NextAuth, and Next.js headers — never hit the real DB in unit tests.
- Run coverage report: `npm run test:coverage` and ensure no uncovered branches.

## Pre-Deploy Gate (MANDATORY)

Before deploying to production, ALL of the following steps must be completed **in order**:

```
┌──────────────────────────────────────────────────────────────┐
│ PRE-DEPLOY CHECKLIST (MUST complete in order):               │
├──────────────────────────────────────────────────────────────┤
│ 1. All Unit Tests passing ✅                                  │
│    → npm run test                                            │
├──────────────────────────────────────────────────────────────┤
│ 2. Build succeeds ✅                                         │
│    → npm run build                                           │
├──────────────────────────────────────────────────────────────┤
│ 3. User reviews build output and explicitly says "deploy" ✅ │
│    → STOP and use notify_user to request approval            │
├──────────────────────────────────────────────────────────────┤
│ 4. Write / run E2E Tests against staging or local ✅         │
│    → npm run test:e2e                                        │
├──────────────────────────────────────────────────────────────┤
│ 5. Present E2E results to user, ask for FINAL confirmation ✅│
│    → STOP and use notify_user for final deploy approval      │
├──────────────────────────────────────────────────────────────┤
│ 6. Only THEN: deploy to production                           │
│    → vercel deploy --prod (or equivalent)                    │
└──────────────────────────────────────────────────────────────┘
```

> [!CAUTION]
> **NEVER deploy without completing steps 3 and 5.** The user MUST confirm twice: once after build, once after E2E.

## Decision Flow (Feature/Bug Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│ WHEN implementing a feature or fixing a bug:                │
├─────────────────────────────────────────────────────────────┤
│ 1. Run baseline tests.                                      │
│    Are they passing?                                        │
│    NO  → Notify user of existing failures before proceeding. │
│    YES → Continue.                                          │
├─────────────────────────────────────────────────────────────┤
│ 2. Implement changes (Feature/Fix/Refactor).                │
├─────────────────────────────────────────────────────────────┤
│ 3. Write Unit Tests for ALL new/changed functions (100%).   │
├─────────────────────────────────────────────────────────────┤
│ 4. Run ALL tests + coverage report.                         │
│    Are they passing at 100% coverage?                       │
│    NO  → Analyze failures, fix code/tests, repeat step 4.   │
│    YES → Continue.                                          │
├─────────────────────────────────────────────────────────────┤
│ 5. Document test results in Walkthrough/Task Summary.       │
├─────────────────────────────────────────────────────────────┤
│ 6. IF deploying → follow Pre-Deploy Gate above.             │
└─────────────────────────────────────────────────────────────┘
```

## Running Tests

- **Unit tests**: `npm run test`
- **Unit tests (watch)**: `npm run test:watch`
- **Coverage report**: `npm run test:coverage`
- **E2E tests**: `npm run test:e2e`
- **E2E with UI**: `npm run test:e2e:ui`
- For specific test file: `npm run test -- src/lib/utils.test.ts`

## What to do on Failure

1. **Analyze logs**: Look for the specific assertion failure or error message.
2. **Determine Root Cause**: Is it a bug in the code, a bug in the test, or a change in requirements?
3. **Fix and Re-run**: Apply the necessary fix and run the tests again.
4. **Communicate**: If a failure is expected or cannot be fixed easily, notify the user with a detailed explanation.
