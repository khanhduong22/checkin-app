---
name: performance-optimizer
description: Use to check, optimize, and maintain system performance, cache structures, query parallelization, and database indexing.
license: MIT
metadata:
  version: "1.0"
  capabilities:
    ["Query Optimization", "Caching", "Concurrent Fetching", "Database Indexing", "Bundle Optimization"]
  languages: ["TypeScript", "JavaScript", "SQL"]
  databases: ["Postgres", "Prisma", "Neon"]
---

# Performance Optimization & System Scaling Standards

This skill provides comprehensive guidelines and techniques to keep the checkin-app loading fast, responsive, and scaling smoothly under load.

## Core Performance Principles

1.  **Concurrency over Sequency**: Never run database queries or network requests sequentially when they can be run in parallel.
2.  **No Blocking Calculations**: User page render requests must be immediate. Defer heavy background calculations to scheduled cron processes.
3.  **No Full Table Scans**: Verify that every lookup, filter, join, and sorting field is properly covered by database indexes.

---

## 1. Concurrency Patterns (N+1 Query Resolution)

When fetching data for multiple items (e.g., lists of users, tasks, shifts), avoid using `await` inside loops. This forces the server to wait for each query to complete sequentially, multiplying response times.

### Sequential Anti-Pattern (Slow ❌)
```typescript
const users = await prisma.user.findMany();
const data = [];
for (const u of users) {
  // Each lookup causes a separate roundtrip delay
  const stats = await getUserStats(u.id); 
  data.push({ ...u, stats });
}
```

### Parallelized Pattern (Fast ✅)
```typescript
const users = await prisma.user.findMany();
const data = await Promise.all(
  users.map(async (u) => {
    const stats = await getUserStats(u.id);
    return { ...u, stats };
  })
);
```
*Note: The database connection pooler (e.g. Neon Pooler endpoints) handles concurrent queries efficiently. Parallelizing fetches allows database engines to process them concurrently.*

---

## 2. Database Indexing Guidelines

Always index foreign keys and columns that are frequently filtered, sorted, or grouped.

### Checkpoints for schema.prisma:
* **Foreign Keys**: Any column matching `[modelName]Id` (e.g., `userId`, `assigneeId`, `taskDefId`) must have a corresponding index:
  ```prisma
  model ModelName {
    userId String
    // ...
    @@index([userId])
  }
  ```
* **Date ranges**: Fields used in date boundaries (e.g., `timestamp`, `start`, `end`) must be indexed.
* **Compound Indexes**: If queries always filter by `userId` AND `timestamp` together, add a compound index:
  ```prisma
  @@index([userId, timestamp])
  ```

---

## 3. Deferring Heavy Background Tasks

Never block server-side rendering (SSR) of frontend pages with background tasks (e.g. calculating birthday bonuses, processing payrolls, system backups).

### Best Practices:
* **Use VPS Cron Jobs**: Create endpoints at `/api/cron/...` and protect them with a `CRON_SECRET` checked via the `Authorization` header.
* **Schedule on VPS crontab**: Trigger the endpoints using `docker exec` node fetch commands:
  ```bash
  /usr/bin/docker exec checkin-app node -e "fetch('https://domain.com/api/cron/...', { headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET } })"
  ```
* **Keep Renders Pure**: The frontend page should only read from the DB; it should not calculate global payouts or trigger bulk updates.

---

## 4. Service Worker Fetch Hijack Prevention

In PWA environments, service workers intercept all GET requests. If a Chrome extension or third-party tool issues a request using a custom scheme (e.g., `chrome-extension://`), the Cache API throws an uncaught exception when attempting to cache it.

### Fix Pattern:
Always filter by request protocol at the top of the `fetch` listener:
```javascript
self.addEventListener('fetch', (event) => {
  // Only process standard web requests
  if (
    event.request.method !== 'GET' ||
    (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://'))
  ) {
    return;
  }
  // ...
});
```

---

## 5. Next.js App Router Optimizations

* **Server Component Boundaries**: Keep server component rendering light. Move state-heavy widgets or animations to client components (`'use client'`).
* **Route Dynamic Force**: If using `export const dynamic = 'force-dynamic'`, optimize database queries so they do not block the page loader. Use parallel calls for multiple widgets.
* **Dynamic Imports**: Use `next/dynamic` to lazy-load large client packages (like calendars, rich charts, or masking libraries) until needed.
