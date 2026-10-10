# Hono RESTful API & Backend Core Standards (@checkin/api)

<!-- Inherits root project rules & system directives -->
@../../AGENTS.md

================================================================================
1. SERVICE OVERVIEW & RUNTIME ENVIRONMENT
================================================================================
- **Package**: `@checkin/api` (`apps/api`)
- **Runtime**: Bun / Node.js 22 (ESM)
- **Framework**: Hono (`hono`, `@hono/node-server`, `@hono/zod-openapi`)
- **Port**: `4000` (Production container `limart-api`, staging canary domain `limart2.khanhdp.com`)
- **Health Endpoint**: `GET /health` (Probed by reverse proxy Caddy and Blue-Green zero-downtime deployment script)

================================================================================
2. ARCHITECTURAL STANDARDS & DESIGN PATTERNS
================================================================================

### 2.1 Enforce Repository Pattern
- **Route handlers MUST NOT execute ad-hoc raw Prisma queries directly in controllers.**
- All database queries and data mutations MUST be encapsulated in repositories under `src/repositories/` (or dedicated repository classes/functions).
- **Controller / Route Handler Boundary**:
  - Route handlers are strictly thin HTTP adapters.
  - Responsibilities of route handlers:
    1. Parse and validate incoming HTTP request parameters, body, and query schemas.
    2. Enforce authentication and role-based permissions (`c.get("user")`).
    3. Delegate business logic and database queries to service and repository modules.
    4. Format and return standard API envelope responses.

### 2.2 DTO & Schema Validation
- All public endpoint contracts MUST be typed and validated using `@hono/zod-openapi` and Zod schemas.
- Input validation failures MUST return structured 400 Bad Request with field-level error messages.

### 2.3 Standard Response Envelope
All API responses MUST strictly adhere to the unified response contract:
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  requestId?: string;
}
```
- Success response: `{ success: true, data: ... }`
- Error response: `{ success: false, error: { code: "ERR_CODE", message: "Human readable message" }, requestId: "..." }`

### 2.4 Caching Layer (Valkey 8 / Redis)
- **Service**: Valkey 8 (`limart-valkey` on port 6389:6379, connected via `ioredis`).
- **Pattern**: Cache-aside pattern via helper `src/lib/cache.ts` using `getOrSetCache(key, ttl, fetcher)`.
- **Anti-Stampede Protection**: Built-in SingleFlight deduplication (`inFlightPromises` map) ensures concurrent cache misses for identical keys trigger only one upstream database query.
- **Fail-Open Policy**: If Valkey/Redis is unreachable, the helper gracefully falls back to database execution without crashing the application.

### 2.5 Cryptographic Audit Trail
- Sensitive actions MUST emit SHA-256 chained audit entries via `@checkin/audit-trail` (or `src/lib/audit.ts` wrapper).
- **Mandatory Audit Actions**:
  - Staff check-in / check-out / face-scan verification (`CHECKIN`, `CHECKOUT`).
  - Timesheet approvals and manual shift adjustments (`TIMESHEET_APPROVE`, `SHIFT_OVERRIDE`).
  - Salary calculations, bonus distributions, and payroll closes (`PAYROLL_CLOSE`, `SALARY_UPDATE`).
  - System permission or role alterations (`ROLE_CHANGE`).
- Chain integrity is verified cryptographically via `hash = SHA256(previousHash + timestamp + action + actorId + payload)`.

### 2.6 Error Handling, Security & Telemetry
- **Correlation ID**: Global middleware generates or propagates `X-Request-Id` for every request.
- **Global Error Handler**: Catches uncaught exceptions, attaches `requestId`, logs errors to Sentry and console, and returns sanitized 500 responses without leaking internal stack traces.
- **Zero-Trust Auth & Privacy**: Google OAuth session verification. Public staff lists, passwordless impersonation, and exposed debug credentials are strictly prohibited.

================================================================================
3. VERIFICATION & TEST GATES
================================================================================
```bash
# Run Vitest unit & integration test suite
pnpm --filter @checkin/api test

# Typecheck TypeScript definitions
pnpm --filter @checkin/api typecheck

# Build ESM bundle via tsup
pnpm --filter @checkin/api build
```
