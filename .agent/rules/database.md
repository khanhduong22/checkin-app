---
trigger: glob
globs: **/*.{ts,tsx,prisma}
description: Always apply when writing or reviewing database access code or schema definitions
---

# Database Access Standards (PostgreSQL 17 + Prisma ORM)

This project uses **PostgreSQL 17** (hosted in dedicated container `checkin-db` on Contabo VPS with **pgBackRest** continuous WAL archiving) and **Prisma ORM**. All database access and schema modifications MUST adhere to these standards.

---

## 1. Single Shared Prisma Instance (Singleton Pattern)

- **In Monorepo Packages / Apps (`apps/api`, `apps/admin-spa`)**:
  Always import the shared Prisma client from `@checkin/db`:
  ```ts
  // ✅ REQUIRED
  import { prisma } from "@checkin/db";
  ```
- **In Next.js Monolith v1 (`src/`)**:
  Always import from `@/lib/prisma`:
  ```ts
  // ✅ REQUIRED
  import { prisma } from "@/lib/prisma";
  ```
- ❌ **BANNED**: Never call `new PrismaClient()` inline in route files, Server Actions, or components. Inline instantiations cause connection pool exhaustion.

---

## 2. Query Safety & Injection Prevention

### A. Prefer Type-Safe Prisma ORM Methods
Always use standard Prisma methods (`findUnique`, `findMany`, `create`, `update`, `delete`, `upsert`):
```ts
// ✅ GOOD
const shifts = await prisma.workShift.findMany({
  where: { userId, start: { gte: startDate } },
  include: { user: true },
});
```

### B. `$queryRawUnsafe` is STRICTLY BANNED
`$queryRawUnsafe` accepts unescaped string concatenations and exposes the system to SQL injection vulnerabilities.
```ts
// ❌ STRICTLY BANNED - SQL injection vulnerability
await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE id = '${id}'`);

// ✅ REQUIRED - Parameterized tagged template
import { Prisma } from "@prisma/client";
await prisma.$queryRaw`SELECT * FROM "User" WHERE id = ${id}`;
```

### C. Raw SQL Restrictions
Raw SQL is ONLY permissible for operations not supported natively by Prisma's query builder (e.g. pgvector cosine similarity `<=>` distance operators).

---

## 3. Query Concurrency & Indexing Standards

1. **Avoid Sequential Queries in Loops**:
   - ❌ **BAD**: Calling `await prisma...` inside a `for` loop or `array.map(async ...)` sequentially.
   - ✅ **GOOD**: Batch queries using `in` filters (e.g. `where: { id: { in: ids } }`) or execute concurrently with `Promise.all()`.
2. **Mandatory Indexing**:
   - Every foreign key relation (`userId`, `shiftId`, `taskId`) must have a corresponding `@@index` in `prisma/schema.prisma`.
   - Every column used for frequent filtering or range queries (`createdAt`, `date`, `status`, `month`) must be indexed.

---

## 4. Production Schema Migration & Database Protection

> [!CAUTION]
> **Zero Destructive Reset Policy**:
> - 🚫 **CẤM** chạy `prisma migrate reset` trên bất kỳ môi trường nào kết nối tới database `checkin-db`.
> - 🚫 **CẤM** chạy `prisma db push --force-reset`.
> - 🚫 **CẤM** chạy lệnh xóa volume `checkin_pgdata`.
> - Khi deploy Production, schema được cập nhật an toàn bằng `prisma db push --skip-generate`.
> - Khi deploy Staging, **tuyệt đối không chạy auto-push** để tránh làm biến dạng schema Production.
