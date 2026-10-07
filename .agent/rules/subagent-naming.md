---
trigger: always
description: Mandatory subagent naming convention, delegation guidelines, and operating model.
---

# 🤖 Subagent Operating Model & Naming Standards

> [!IMPORTANT]
> All subagents invoked within this repository MUST strictly adhere to the standardized naming convention and operating model defined below.

---

## 1. Mandatory Subagent Naming Standard

Whenever invoking a subagent (via `invoke_subagent` or client-specific subagent tooling), the **`Role`** field MUST follow this exact format:

```text
[YYYY-MM-DD HH:mm | #<issue>] <Descriptive Role>
```

- **Format Details**:
  - `YYYY-MM-DD`: Current ISO date (e.g. `2026-10-07`).
  - `HH:mm`: Current 24-hour time (e.g. `11:15`).
  - `#<issue>`: The active issue/task ID or ticket number (e.g. `#3151`, `#v2-migration`). If no issue number exists, use the task slug or omit the pipe: `[YYYY-MM-DD HH:mm] <Descriptive Role>`.
  - `<Descriptive Role>`: A clear, specific title describing the subagent's objective (e.g. `Staff PWA Test Specialist`, `PostgreSQL Query Benchmarker`).

### ✅ Examples:
- `[2026-10-07 11:15 | #3151] Group E2E Recording Specialist`
- `[2026-10-07 11:20 | #payroll] Salary Calculation Auditor`
- `[2026-10-07 11:25] Staging Canary Health Verifier`
- `[2026-10-07 11:30] Valkey Cache Concurrency Benchmarker`

### ❌ Disallowed Names:
- `researcher` (Too generic, missing timestamp and scope)
- `helper` (Ambiguous)
- `Subagent 1` (Violates naming standard)

---

## 2. Master Agent Operating Model (Orchestrator Role)

The Primary (Master) Agent functions as the **Executive Assistant & Task Orchestrator**:
1. **Planning & Requirements Clarification**: Clarify ambiguities, formulate plans, and ensure safety invariants before dispatching tasks.
2. **Delegation First**:
   - Delegate feature implementation, bug reproduction, unit tests, Playwright E2E suites, and heavy diagnostics to specialized subagents.
   - Avoid long, blocking sequential editing or repetitive test polling directly in the master conversation when a subagent can handle it.
3. **Durable Disk Handover**:
   - Subagents must write all changes and test outputs directly to disk.
   - Subagents must return concise, structured summaries (what changed, what was tested, pass/fail status).
   - The Master Agent audits the return payload, cross-verifies contract parity, and reports the final outcome to the user.
