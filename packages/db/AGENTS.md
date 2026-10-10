# Database & Prisma Singleton Standards (@checkin/db)

<!-- Inherits root project rules & system directives -->
@../../AGENTS.md

================================================================================
1. PACKAGE ROLE & SINGLE SOURCE OF TRUTH
================================================================================
- **Package**: `@checkin/db` (`packages/db`)
- **ORM**: Prisma Client (`@prisma/client`)
- **Database Engine**: PostgreSQL 17 (`limart-db`, port 5432, database `checkin_db`)
- **Single Source of Truth**:
  - `packages/db/prisma/schema.prisma` is the canonical schema definition.
  - Mirrored to root `prisma/schema.prisma`.
  - Exports a global PrismaClient singleton via `packages/db/src/index.ts` to prevent connection exhaustion in serverless, worker, or hot-reloading development environments.

================================================================================
2. STRICT ZERO DESTRUCTIVE DATABASE ACTIONS (NON-DEV PROTECTION)
================================================================================
> [!CAUTION]
> This repository is maintained by a non-developer maintainer. Destructive database actions cause irreversible business data loss!

1. 🚫 **CẤM TUYỆT ĐỐI**:
   - `prisma migrate reset`
   - `prisma db push --force-reset`
   - Bất kỳ lệnh nào drop table, truncate table hoặc reset database.
2. 🚫 **CẤM XÓA volume trên VPS**:
   - `docker volume rm checkin-app_checkin_pgdata`
   - `docker volume prune -a`
3. 🚫 **Dual-Run DB Safety on Staging**:
   - Staging canary kết nối trực tiếp với `checkin_db` ở chế độ dual-run.
   - Script deploy staging (`scripts/deploy-staging.sh`) **CẤM** chạy `prisma db push` đối với shared database.
4. 🚫 **Cấm xóa raw database records thủ công** khi chưa có sự xác nhận rõ ràng từ maintainer.

================================================================================
3. NON-DESTRUCTIVE SCHEMA UPDATES & MIGRATION WORKFLOW
================================================================================
- Schema updates must be strictly additive and backward-compatible.
- **Workflow**:
  ```bash
  # 1. Update schema in packages/db/prisma/schema.prisma and mirror to root prisma/schema.prisma

  # 2. Re-generate Prisma Client
  pnpm --filter @checkin/db generate

  # 3. Build & typecheck DB package
  pnpm --filter @checkin/db build
  pnpm --filter @checkin/db typecheck

  # 4. In CI/CD production deployment (non-destructive only):
  pnpm prisma db push --skip-generate
  ```

================================================================================
4. BACKUP, WAL ARCHIVING & DISASTER RECOVERY (pgBackRest)
================================================================================
- **Database**: PostgreSQL 17 (`limart-db`) with continuous WAL archiving.
- **Tool**: pgBackRest with dedicated stanza `checkin`.
- **Storage Volume**: `checkin_pgbackrest_data` (mounted in `limart-db`).
- **Backup Verification & Restore**:
  ```bash
  # Inspect backup stanza info on VPS
  ssh contabo "docker exec -u postgres limart-db pgBackRest --stanza=checkin info"

  # Trigger manual incremental backup
  ssh contabo "/opt/checkin-app/scripts/pgbackrest-backup.sh incr"

  # Point-in-Time Recovery (PITR) to restore state before an accident
  ssh contabo "cd /opt/checkin-app && ./scripts/pgbackrest-restore.sh --time 'YYYY-MM-DD HH:MM:SS'"
  ```

================================================================================
5. INDEXING & PERFORMANCE STANDARDS
================================================================================
- Every foreign key relation MUST have an explicit B-Tree index to prevent table scans on joins and cascading operations.
- Critical query path indexes:
  - `checkInTime` (Timesheet date-range lookups and payroll aggregations).
  - `status` (Active shifts, pending approvals, task states).
  - `userId` (Employee profile, shift assignment, and audit log lookups).
  - Multi-column composite indexes on high-throughput filter tuples (e.g. `[userId, checkInTime]`, `[userId, status]`).
