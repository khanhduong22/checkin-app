---
description: Task breakdown workflow - breaks requirements into actionable engineering tasks
---

# Task Breakdown Workflow

## Steps

1. **Analyze Requirements**:
   - Trace callers and existing types in `packages/shared/src/types`.
   - Identify database models impacted in `schema.prisma`.
2. **Break into Actionable Tasks**:
   - Task 1: Type contracts, DTOs, Zod schemas
   - Task 2: Database mutations / Prisma queries
   - Task 3: Backend route handlers & middleware
   - Task 4: Frontend UI & components
   - Task 5: Unit & E2E tests
3. **Execute Incrementally**:
   - Implement step-by-step with continuous test execution (`pnpm test`).
