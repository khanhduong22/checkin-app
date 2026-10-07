---
trigger: model_decision
description: Enforce lean, high-density documentation in AGENTS.md, README.md, and DEPLOY.md instead of bloated ceremonial documentation folders.
---

# Lean Documentation & Single Source of Truth Rule

> [!IMPORTANT]
> The single source of truth for architecture, system topology, operational directives, and safety rules in this repository is **`AGENTS.md`**, supported by **`README.md`** and **`DEPLOY.md`**.
> Do NOT create bloated, ceremonial multi-folder documentation structures (e.g. Dewey decimal `docs/010`, `020`, `030`).

---

## Core Rules

1. **High-Density, Lean Context**:
   - Keep system knowledge consolidated in `AGENTS.md`.
   - Update `AGENTS.md` when services, ports, environment variables, or critical operational commands change.
   - Update `DEPLOY.md` when CI/CD workflows, Docker configurations, or deploy scripts change.
   - Update `README.md` for onboarding and local development instructions.
2. **Zero Ceremonial Waste**:
   - Do NOT generate speculative PRDs, multi-file specs, or unnecessary markdown trees.
   - Prioritize clean code, self-documenting tests, and concise comments.
3. **Accuracy Over Quantity**:
   - Never document hypothetical setups (e.g. Vercel or Neon) when the reality is Contabo VPS + PostgreSQL 17 + Docker.
