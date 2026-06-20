---
trigger: model_decision
description: Always apply when finalizing any major task or implementing a plan, to ensure system performance, query parallelization, and database indexing are verified.
---

# Performance Optimization Rule

> [!IMPORTANT]
> This rule is **MANDATORY** when finalizing any task that involves an implementation plan, database modifications, or data loading logic.
> A task is **NOT DONE** until its performance implications have been audited and optimized.

## Core Rules

1. **Query Concurrency Check**: Verify if there are any `await` calls inside loops or sequential maps. If found, convert them to `Promise.all` parallel executions.
2. **Database Index Verification**: Check if the task adds new filters, orders, or joins. If so, verify that corresponding database columns are properly indexed in `prisma/schema.prisma`.
3. **Background Job Isolation**: Ensure no heavy background computations (calculators, syncs, aggregations) are executed synchronously during user page-load flows.
4. **Walkthrough Optimization log**: The final `walkthrough.md` file **MUST** contain a dedicated section detailing how the changes were optimized for performance, or explicitly stating why no performance optimizations were necessary.

---

## Finalization Checklist

Before concluding any major task, you must check off the following items:
- [ ] No database queries are executed sequentially inside loops.
- [ ] All new foreign key relations and query filters are covered by Prisma `@@index` annotations.
- [ ] No synchronous background calculation blocks page rendering.
- [ ] Walkthrough includes the optimization details or an explicit note of performance safety.
