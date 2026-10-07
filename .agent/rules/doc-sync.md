---
trigger: model_decision
description: Always apply when finalizing a task, feature, or bug fix to ensure AGENTS.md, README.md, and DEPLOY.md stay synchronized.
---

# Documentation Sync Rule (Lean AGENTS.md Standard)

> [!IMPORTANT]
> When any architectural change, new environment variable, database schema alteration, or deployment workflow change is implemented, you MUST synchronize the core documentation files:
> - **`AGENTS.md`** (System topology, container inventory, safety invariants, diagnostic commands)
> - **`DEPLOY.md`** (Deployment instructions, CI/CD pipeline, secrets)
> - **`README.md`** (High-level project overview, local run instructions)

---

## Decision Flow

1. **Did I change a database table, field, or index?**
   - Verify `schema.prisma` is synced between root and `packages/db/prisma/schema.prisma`.
   - Update `AGENTS.md` entity notes if a new critical model or relation was introduced.
2. **Did I add or modify an environment variable / secret?**
   - Update `DEPLOY.md` table of GitHub Secrets and VPS `.env` generation.
   - Update `AGENTS.md` configuration section if applicable.
3. **Did I add a new app, package, or major service?**
   - Update `AGENTS.md` container inventory & monorepo structure.
   - Update `README.md` project tree.
4. **Did I modify CI/CD workflows or deploy scripts?**
   - Update `DEPLOY.md` and `AGENTS.md`.
