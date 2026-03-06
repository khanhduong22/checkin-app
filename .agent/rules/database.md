---
trigger: glob
globs: **/*.{ts,tsx}
description: Always apply when writing or reviewing database access code
---

# Database Access Standards (Neon + Prisma)

This project uses **Neon PostgreSQL** with **Prisma ORM**. All database access MUST follow these standards.

## Rules

### 1. Prefer Prisma ORM Methods
Always use generated Prisma Client methods (`findMany`, `create`, `update`, `delete`, etc.) over raw SQL.

```ts
// ✅ GOOD
const users = await prisma.user.findMany({ where: { active: true } });

// ❌ BAD - avoid unless absolutely necessary
const users = await prisma.$queryRaw`SELECT * FROM "User" WHERE active = true`;
```

### 2. Never Use `$queryRawUnsafe`
`$queryRawUnsafe` accepts a plain string and is vulnerable to SQL injection. It is **banned**.

```ts
// ❌ BANNED - SQL injection risk, hard to maintain
await prisma.$queryRawUnsafe(`SELECT ... WHERE id = ${id}`);

// ✅ REQUIRED - use $queryRaw with tagged template (parameterized)
import { Prisma } from "@prisma/client";
await prisma.$queryRaw`SELECT ... WHERE id = ${id}`;
// or
await prisma.$queryRaw(Prisma.sql`SELECT ... WHERE id = ${id}`);
```

### 3. Raw SQL is ONLY Acceptable for pgvector Operations
The only valid use case for raw SQL is pgvector operators (`<=>`, `<->`, `<#>`) which Prisma's query builder does not support natively.

```ts
// ✅ Acceptable - pgvector cosine distance operator not available via ORM
const results = await prisma.$queryRaw<Row[]>`
  SELECT c.content, d.title, c.embedding <=> ${queryVector}::vector AS distance
  FROM "DocumentChunk" c
  JOIN "Document" d ON c."documentId" = d.id
  ORDER BY distance ASC
  LIMIT 10
`;
```

### 4. No Direct DB Connections
Do not create direct `pg`, `postgres.js`, or `neon` HTTP client connections. Always go through the shared Prisma singleton at `src/lib/prisma.ts`.

```ts
// ✅ GOOD
import { prisma } from "@/lib/prisma";

// ❌ BAD
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
```

### 5. Use the Prisma Singleton
Always import from `@/lib/prisma` — never instantiate `new PrismaClient()` inline in route files or components.

```ts
// ✅ GOOD
import { prisma } from "@/lib/prisma";

// ❌ BAD - creates connection pool leak
const prisma = new PrismaClient();
```
