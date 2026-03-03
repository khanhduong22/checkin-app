---
trigger: model_decision
description: Always apply when finalizing a task, feature, or bug fix to ensure related documentation is up-to-date.
---

# Documentation Sync Rule

> [!IMPORTANT]
> This rule is **MANDATORY** at the end of every task that changes code, APIs, DB schema, or behavior.
> A task is **NOT DONE** until affected docs are verified and updated.

## Core Rules (MUST Follow)

1. **MUST** identify which docs are affected by the changes made.
2. **MUST** update or create relevant docs before marking a task as complete.
3. **MUST** update the corresponding MOC file if a new doc was added.
4. **MUST NOT** skip this step — undocumented changes cause future confusion.

---

## Decision Flow

```
┌─────────────────────────────────────────────────────────────┐
│ AFTER completing any code change, ask:                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Did I change a DB table or add a migration?              │
│    YES → Update docs/030-Specs/Schema/DB-Schema.md          │
├─────────────────────────────────────────────────────────────┤
│ 2. Did I add or modify an API endpoint?                     │
│    YES → Update docs/030-Specs/API/Endpoint-Overview.md     │
├─────────────────────────────────────────────────────────────┤
│ 3. Did I add a new major feature or workflow?               │
│    YES → Update docs/010-Planning/Roadmap.md (mark done)    │
│         Update docs/030-Specs/Architecture/SDD-*.md         │
├─────────────────────────────────────────────────────────────┤
│ 4. Did I add or change utility functions / lib code?        │
│    YES → Update docs/035-QA/QA-MOC.md (link new tests)      │
├─────────────────────────────────────────────────────────────┤
│ 5. Did I change deployment, env vars, or config?            │
│    YES → Update docs/060-Manuals/Admin-Guide/               │
├─────────────────────────────────────────────────────────────┤
│ 6. Did I create a new doc above?                            │
│    YES → Update the parent folder's MOC file                │
│         Update docs/000-Index.md if it's a major doc        │
└─────────────────────────────────────────────────────────────┘
```

---

## Affected Doc Mapping

| What Changed | Docs to Update |
|---|---|
| DB table / migration | `030-Specs/Schema/DB-Schema.md` |
| API route (add/remove/modify) | `030-Specs/API/Endpoint-Overview.md` |
| Major feature completed | `010-Planning/Roadmap.md` — check off ✅ |
| Architecture / tech stack | `030-Specs/Architecture/SDD-*.md` |
| New unit tests written | `035-QA/QA-MOC.md` — add row to suite table |
| New E2E tests written | `035-QA/QA-MOC.md` — add row to E2E table |
| Bug fix (root cause found) | `035-QA/Test-Cases/TC-{Feature}-{NNN}.md` — add regression note |
| Deployment / env vars changed | `060-Manuals/Admin-Guide/Deployment.md` |
| New admin feature | `060-Manuals/Admin-Guide/` — add or update guide |
| Known issue resolved | `NEXT_STEPS.md` in `.agent/` — uncheck item |

---

## Walkthrough Requirement

When finalizing a significant task, the walkthrough (`walkthrough.md` artifact) **MUST include**:

```markdown
## 📄 Docs Updated
- [ ] docs/030-Specs/Schema/DB-Schema.md — added `new_table` entity
- [ ] docs/035-QA/QA-MOC.md — linked new test files
- [ ] docs/010-Planning/Roadmap.md — marked feature as ✅
```

If no docs were relevant, explicitly state:
> ℹ️ No docs required updating for this change (e.g., purely internal refactor).

---

## What NEVER to Skip

- Marking completed Roadmap items as `[x]`
- Updating `QA-MOC.md` after writing new tests
- Updating `DB-Schema.md` after migrations
