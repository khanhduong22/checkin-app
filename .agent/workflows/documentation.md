---
description: Lean documentation workflow - keeps AGENTS.md, README.md, and DEPLOY.md updated
---

# Lean Documentation Workflow

> [!IMPORTANT]
> The single source of truth in this repository is **`AGENTS.md`**, supported by **`README.md`** and **`DEPLOY.md`**.
> Do NOT create bloated, multi-folder `docs/` hierarchies.

---

## Workflow Steps

1. **Identify Changes**:
   - Was a new container, route, or backing service introduced?
   - Was a database model or relation altered?
   - Was a deployment script or CI/CD workflow updated?

2. **Update Core Files**:
   - **`AGENTS.md`**: Update service inventory, ports, database topology, or safety invariants.
   - **`DEPLOY.md`**: Update deployment procedures, GitHub Secrets, or rollback commands.
   - **`README.md`**: Update project architecture tree or local dev instructions if applicable.

3. **Verify Integrity**:
   - Ensure all links and code symbol references are valid.
   - Run `pnpm test` to ensure zero regressions.
