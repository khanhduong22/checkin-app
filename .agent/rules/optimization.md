---
trigger: model_decision
description: Always apply when finalizing any major task or implementing a plan, to ensure system performance, query parallelization, and database indexing are verified.
---

# Performance Optimization & Caching Standards

> [!IMPORTANT]
> This rule is **MANDATORY** when finalizing any task that involves data retrieval, caching, background processing, or database modifications.
> High response speed (<100ms for APIs, <50ms for search) and low database load are core performance requirements.

---

## 1. Query Concurrency & Parallelization

1. **Eliminate Sequential Await in Loops**:
   - Never place `await prisma...` or `await fetch...` inside `for`, `for...of`, or `Array.map` loops without parallelization.
   - Use `Promise.all()` or `Promise.allSettled()` for concurrent I/O operations.
   - For database lookups by multiple IDs, use SQL `IN` operators: `where: { id: { in: ids } }`.

2. **Pagination & Field Projections**:
   - Always apply `take` and `skip` limits for lists and history tables.
   - Use `select` to fetch only required fields; avoid fetching huge relational trees indiscriminately.

---

## 2. Valkey 8 Caching & Singleflight Pattern

1. **Stateless Cache with Graceful Fallback**:
   - All cache reads must be wrapped in `try/catch` blocks.
   - If Valkey (`checkin-valkey`) is temporarily offline or connection drops, the system MUST fall back directly to PostgreSQL without throwing a 500 error.

2. **Singleflight Concurrency Locking**:
   - For expensive calculations (e.g. monthly payroll aggregation, leaderboard rankings), use the singleflight cache pattern to prevent "thundering herd" problems where concurrent requests hit the database simultaneously.

3. **Cache Invalidation Precision**:
   - When mutating attendance or shift status, invalidate only the specific user's cached stats key rather than flushing the entire cache.

---

## 3. Meilisearch Fast Search Indexing

1. **Typo-Tolerant Vietnamese Indexing**:
   - Ensure employee names, task definitions, and document titles are synced to Meilisearch with unaccented Vietnamese search attributes.
2. **Search Debounce & Limits**:
   - Frontend search inputs must debounce requests (default: 300ms) and limit result sets (default: top 10-20 items).

---

## 4. Finalization Checklist

Before concluding any major task, verify:
- [ ] No database queries are executed sequentially inside loops.
- [ ] All new foreign key relations and query filters are covered by Prisma `@@index` annotations.
- [ ] Cache fallbacks safely recover if Valkey is unreachable.
- [ ] No heavy synchronous calculations block the main request/response flow.
