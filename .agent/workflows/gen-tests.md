---
description: Generate executable test suites with Vitest and Playwright
---

# Generate Tests Workflow

> [!IMPORTANT]
> All tests MUST be executable code written with **Vitest** (`tests/unit/`) or **Playwright** (`tests/e2e/`).

---

## Steps

1. **Locate Target Logic**:
   - Determine which function, route handler, or component needs tests.
2. **Generate Unit Test (`tests/unit/<module>.test.ts`)**:
   - Use Vitest (`describe`, `it`, `expect`).
   - Mock Prisma client, NextAuth session, and Valkey cache appropriately.
   - Cover normal execution, validation errors, and boundary values.
3. **Execute & Verify**:
   ```bash
   pnpm test
   ```
4. **Report Results**:
   - Confirm all assertions pass with 0 failures before marking done.
