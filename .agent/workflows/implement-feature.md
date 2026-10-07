---
description: Lean feature implementation workflow - implement with TDD and verify
---

# Feature Implementation Workflow

> [!IMPORTANT]
> Focus on working code, type safety, and passing tests. Do NOT create ceremonial markdown docs in `docs/`.

---

## Steps

1. **Clarify Requirements & Constraints**:
   - Inspect existing models in `prisma/schema.prisma` and `packages/db`.
   - Verify RBAC roles and API payload types in `@checkin/shared`.
2. **Implementation (TDD)**:
   - Write or update unit tests in `tests/unit/` or package tests.
   - Implement the feature logic with clean, modular functions.
   - Ensure proper error handling and input validation with Zod.
3. **Run Verification**:
   ```bash
   pnpm test
   ```
4. **Update Core Docs (If applicable)**:
   - If a new environment variable or container port was added, update `AGENTS.md` and `DEPLOY.md`.
