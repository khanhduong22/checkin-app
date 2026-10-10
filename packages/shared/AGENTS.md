@../../AGENTS.md

# Shared DTOs, Types & Business Rules (packages/shared)

================================================================================
1. ROLE & DESIGN PHILOSOPHY
================================================================================
- **Role**: Single source of truth for business rules, DTO schemas, mathematical calculations, and domain types across the `checkin-app` monorepo.
- **Consumers**: `@checkin/api`, `@checkin/admin-spa`, `@checkin/staff-pwa`, and internal scripts.
- **Design Philosophy**:
  - **Pure TypeScript**: Ultra-fast execution, isomorphic across Node.js, Bun, and browser runtimes.
  - **Zero Heavy Dependencies**: Minimal dependency footprint (`zod` only). Never import UI libraries, ORM clients, or framework-specific packages.
  - **Determinism**: 100% pure functions for business calculations to ensure unit testability and mathematical correctness.

================================================================================
2. CORE DOMAIN MODULES & BUSINESS RULES
================================================================================
### A. Attendance & Validation Rules (`src/rules/`)
- **`geofence.ts`**: Calculates Haversine distance between employee coordinates and physical store coordinates; validates geofence radius.
- **`ip-matcher.ts`**: IP subnet/CIDR matching for verifying employee connections against trusted store Wi-Fi networks.
- **`late-penalty.ts`**: Shift check-in grace period logic, tiered late penalties, and deduction rates.
- **`streak.ts`**: Consecutive work day streak calculation, streak break conditions, and gamification tiers.
- **`bonuses.ts`**: Shift bonus calculations, weekend/holiday multipliers, and milestone allowances.

### B. Schemas & DTO Validation (`src/schemas/`)
- Zod schemas defining incoming payload boundaries for check-in requests, shift approvals, and settings.
- Enforces strict parsing and type coercion at API and client trust boundaries.

### C. Domain Types (`src/types/`)
- Universal TypeScript interfaces and type definitions for shifts, users, attendance statuses, payrolls, and audit events.

================================================================================
3. BUILD & PACKAGING
================================================================================
- **Bundler**: `tsup` dual CJS (`.js`) and ESM (`.mjs`) builds with TypeScript declaration generation (`.d.ts`).
- **Path Exports**: Configured with subpath exports allowing consumers to import `@checkin/shared` directly.

================================================================================
4. VERIFICATION & TEST COMMANDS
================================================================================
```bash
# Run full unit test suite (Vitest)
pnpm --filter @checkin/shared test

# Build package dist artifacts
pnpm --filter @checkin/shared build

# Typecheck source files
pnpm --filter @checkin/shared typecheck
```
