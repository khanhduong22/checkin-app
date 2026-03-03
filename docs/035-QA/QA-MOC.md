---
id: QA-MOC-001
type: index
status: active
project: Checkin App
created: 2026-03-03
updated: 2026-03-03
---

# QA Map of Content

## 🧪 Test Suites

### Unit Tests (Vitest)
| File | Module | Coverage |
|------|--------|----------|
| [utils.test.ts](../../tests/unit/utils.test.ts) | `isLate`, `isEarlyLeave`, `checkTimeStatus` | 100% |
| [stats.test.ts](../../tests/unit/stats.test.ts) | `calculateLatePenalty` | 100% |
| [streak.test.ts](../../tests/unit/streak.test.ts) | `calculateStreak` | 100% |
| [birthday-bonus.test.ts](../../tests/unit/birthday-bonus.test.ts) | `runBirthdayBonus` | 100% |
| [ip-utils.test.ts](../../tests/unit/ip-utils.test.ts) | `normalizeIP`, `isIPMatch` | 100% |

### E2E Tests (Playwright)
| File | Flow |
|------|------|
| [auth.spec.ts](../../tests/e2e/auth.spec.ts) | Auth redirect, login page |
| [checkin.spec.ts](../../tests/e2e/checkin.spec.ts) | Protected route redirects |
| [admin.spec.ts](../../tests/e2e/admin.spec.ts) | Admin access control |

## 📋 Test Cases

- [TC-UTILS-001](./Test-Cases/TC-UTILS-001.md) — Time utility functions
- [TC-STATS-001](./Test-Cases/TC-STATS-001.md) — Late penalty calculation
- [TC-STREAK-001](./Test-Cases/TC-STREAK-001.md) — Streak calculation
- [TC-AUTH-E2E-001](./Test-Cases/TC-AUTH-E2E-001.md) — Authentication E2E
- [TC-ADMIN-E2E-001](./Test-Cases/TC-ADMIN-E2E-001.md) — Admin access control E2E

## 🚦 Commands

```bash
npm run test              # Unit tests
npm run test:coverage     # Unit tests + 100% coverage check
npm run test:e2e          # E2E tests (auto-starts dev server)
npm run test:e2e:ui       # E2E with interactive UI
```

## 📜 Pre-Deploy Gate

> Follow the rule in `.agent/rules/tests.md` before every production deploy.

1. `npm run test` ✅
2. `npm run build` ✅
3. **User confirm #1** ✅
4. `npm run test:e2e` ✅
5. **User confirm #2** ✅
6. `vercel deploy --prod`
