---
name: production-readiness-review
description: Standardized Production Readiness Review (PRR) and Tier-1 Production Audit workflow based on Google SRE, AWS Well-Architected, and Stripe Engineering practices. Covers Concurrency & Race Conditions, AppSec & Rate Limiting, Chaos & Resilience, Data Durability & DR, Observability & APM, and Performance Under Load.
---

# Production Readiness Review (PRR) & Tier-1 System Audit

## Overview & Philosophy
The Production Readiness Review (PRR) is a formal, evidence-backed evaluation before deploying any mission-critical service, major architectural shift, or Tier-1 workload to production. Synthesizing practices from Google Site Reliability Engineering (SRE), the AWS Well-Architected Framework, and Stripe's distributed financial infrastructure, this review guarantees that software does not merely function in isolation, but remains correct, resilient, observable, secure, and recoverable under hostile conditions.

## When to Conduct a PRR
- Launching any new Tier-1 or Tier-2 service or microservice.
- Introducing distributed data mutation (e.g., payments, inventory decrement, wallet balance, token transfers).
- Performing database migrations, sharding, or schema redesigns touching high-throughput tables.
- Major dependency or infrastructure transitions (e.g., migrating ORM, database engine, messaging queues).
- Before high-traffic commercial events, sales campaigns, or enterprise onboarding.

---

## The 6 Production Readiness Audit Pillars

### Pillar 1: Concurrency, Race Conditions & Distributed Idempotency
Ensures state transitions remain deterministic and consistent despite concurrent requests, duplicate webhook deliveries, and network retries.

- [ ] **Distributed Idempotency Keys (Stripe Standard)**:
  - Every mutating endpoint (POST/PUT/PATCH, payments, check-outs, balance updates) accepts a unique client-generated `Idempotency-Key` (UUIDv4/ULID).
  - Idempotency middleware checks Redis/DB atomically (`SET key val NX EX 86400` or database unique constraint on `idempotency_key`).
  - Concurrent requests with identical idempotency keys are locked/queued; replay requests receive cached responses without re-executing side-effects.
- [ ] **Atomic Database Operations & Row-Level Locking**:
  - Critical counters and balances use atomic SQL updates (`UPDATE accounts SET balance = balance - :amount WHERE id = :id AND balance >= :amount`) rather than in-memory read-modify-write.
  - Where multi-row transaction isolation is required, enforce explicit pessimistic locking (`SELECT ... FOR UPDATE` with `NOWAIT` or `SKIP LOCKED`) or optimistic concurrency control via version columns (`WHERE id = :id AND version = :version`).
- [ ] **Transaction Isolation & Deadlock Avoidance**:
  - Consistent lock acquisition order across all services and transactions to eliminate circular wait conditions.
  - Transaction durations minimized (<50ms): avoid external network calls, file I/O, or email dispatch inside open DB transaction blocks.
  - Isolation level verified (`READ COMMITTED` default, `SERIALIZABLE` or strict snapshot isolation for double-entry financial ledgers).
- [ ] **Outbox Pattern for Distributed State & Events**:
  - State mutations and event bus publishing (Kafka, RabbitMQ, Redis Streams) are committed atomically in the same database transaction via an Outbox table.
  - Background relay worker ensures at-least-once message delivery, with consumer idempotency guards at destination.

---

### Pillar 2: Application Security, AuthZ & DoS Protection
Guarantees defensive posture against malicious adversaries, data exfiltration, unauthorized privilege escalation, and volumetric abuse.

- [ ] **OWASP API Security Top 10 & Broken Object-Level Authorization (BOLA/IDOR)**:
  - Strict tenant and ownership validation on every data access query (e.g., `WHERE id = :id AND tenant_id = :tenant_id AND user_id = :user_id`), never trusting raw client-supplied IDs.
  - Zero mass-assignment vulnerabilities: incoming DTOs strictly whitelist allowable fields; entity models are never populated directly from request payloads.
- [ ] **Multi-Tier Rate Limiting & Resource Quotas**:
  - Edge/Proxy rate limiting (Cloudflare / Nginx / Caddy token bucket) prevents volumetric DDoS and brute-force attempts.
  - Application-level rate limiting by authenticated user ID, API key, and client IP on auth, payment, search, and compute-heavy endpoints.
  - Rejection with standard RFC-compliant HTTP `429 Too Many Requests` containing `Retry-After` headers.
- [ ] **Secret Management & Zero Hardcoded Credentials**:
  - Zero credentials, API keys, database passwords, or private certificates committed in code or git history (verified via `gitleaks detect`).
  - Secrets injected via environment variables, container secrets, or centralized key vaults (HashiCorp Vault, AWS Secrets Manager, Doppler).
  - Token expiration and automatic key rotation mechanisms documented and verified.
- [ ] **Authentication, Token Hygiene & Session Boundaries**:
  - JWTs enforce cryptographic signature verification (`RS256` or `Ed25519`), narrow expiration windows (e.g., <= 15 minutes access tokens), and secure HTTP-only, SameSite, Secure cookies for browser refresh tokens.
  - Comprehensive revocation/blacklist mechanism (Redis bloom filter or token version epoch) for compromised credentials.
- [ ] **Input Sanitization, Encoding & Injection Defense**:
  - All SQL queries parameterized (zero string concatenation or raw template literals).
  - Strict Content-Security-Policy (CSP), CORS whitelists (no wildcard `*` with credentials), and safe HTML sanitization preventing XSS.

---

### Pillar 3: Resilience, Graceful Degradation & Chaos Engineering
Ensures the service withstands downstream component failure, network partition, and traffic surges without cascading collapse.

- [ ] **Circuit Breakers, Timeouts & Bulkheads**:
  - Explicit timeouts configured on ALL outbound network calls (HTTP client, gRPC, database, cache, third-party APIs). Default connect timeout <= 2s, read timeout <= 5s.
  - Circuit breakers (Hystrix/Resilience4j/cockatiel) trip after consecutive downstream failures, shedding load to preserve system responsiveness.
  - Bulkhead pattern isolates resources (separate connection pools for critical DB reads vs background reporting; worker thread separation).
- [ ] **Graceful Degradation & Fallback Strategy**:
  - Non-critical third-party dependency outages (e.g., recommendation engine, analytics, email notifications, avatar CDN) do not block core transaction pathways.
  - Read fallbacks return stale cache, fallback defaults, or degraded views instead of HTTP 500 crashes.
- [ ] **Backpressure, Jittered Exponential Backoff & Retry Budgets**:
  - Retries on transient errors enforce exponential backoff with full jitter to eliminate the thundering herd problem.
  - Bounded retry counts (max 3 attempts) and global retry budgets preventing retry storms from exhausting downstream capacity.
- [ ] **Graceful Shutdown & Signal Trapping**:
  - Service traps `SIGTERM` / `SIGINT`: stops accepting new inbound traffic, drains active inflight requests within grace window (e.g., 15-30s), closes database connection pools, flushes logs/metrics, and exits cleanly.
  - Container readiness probe immediately drops out of load balancer rotation upon receiving termination signal.
- [ ] **Chaos Injection Verification**:
  - Validated behavior under simulated downstream failures: database latency spike, Redis cache eviction, third-party webhook drop, and network packet loss.

---

### Pillar 4: Data Durability, Backup & Disaster Recovery (DR)
Guarantees business continuity, zero unrecoverable data loss, and verifiable recovery timelines.

- [ ] **Defined Recovery Objectives (RPO & RTO)**:
  - **Recovery Point Objective (RPO)** formally agreed upon (e.g., RPO < 5 minutes for financial data, < 1 hour for standard metadata).
  - **Recovery Time Objective (RTO)** formally agreed upon (e.g., RTO < 30 minutes to spin up replica in secondary zone or restore from backup).
- [ ] **Automated Snapshots & Point-In-Time Recovery (PITR)**:
  - Continuous WAL (Write-Ahead Logging) archiving / transaction log streaming enabling Point-In-Time Recovery (PITR) down to the second.
  - Daily automated full backups stored in geographically separate, immutable, encrypted object storage (e.g., AWS S3 with Object Lock or Cloudflare R2).
- [ ] **Backup Restoration Drill (The Backup Illusion Law)**:
  - *An untested backup is not a backup.* Automated or scheduled restore drills prove backup archives can be successfully decrypted, provisioned into a clean database instance, and pass integrity assertions.
- [ ] **Retention Policies & Compliance**:
  - Data lifecycle rules configured: automatic pruning or cold tiering of audit logs, event archives, and soft-deleted records in accordance with GDPR/regulations.
- [ ] **Safe Schema Migration & Rollback Strategy**:
  - Database schema alterations follow the Expand-and-Contract (Blue/Green) pattern: new columns added as nullable/with defaults; old code compatible with new schema; zero blocking table locks on high-write tables.
  - Down-migration / rollback scripts tested and verified before executing up-migration.

---

### Pillar 5: Observability, Telemetry & APM
Ensures real-time visibility into internal system state, actionable alerting, and high-cardinality distributed tracing.

- [ ] **The Four Golden Signals (Google SRE Standard)**:
  - **Latency**: P50, P90, P95, and P99 latency tracked separately for successful (2xx) and failed (5xx) requests.
  - **Traffic**: Request rate (QPS / RPS), inbound payload volume, active concurrent connections.
  - **Errors**: HTTP 5xx error rate, uncaught exception rate, background job DLQ (Dead Letter Queue) rate.
  - **Saturation**: CPU utilization, RAM usage, database connection pool exhaustion, file descriptor counts, event loop lag.
- [ ] **Distributed Tracing & Context Propagation**:
  - OpenTelemetry (OTel) or W3C Trace Context (`traceparent`) propagated across all HTTP, gRPC, and message queue hops.
  - Unique request ID (`X-Request-ID`) attached to incoming requests and linked to all downstream database queries, logs, and outbound calls.
- [ ] **Structured Logging & Redaction**:
  - All logs emitted in machine-readable JSON format (`timestamp`, `level`, `service`, `trace_id`, `span_id`, `message`, `context`).
  - Strict PII/PCI redaction filter: credit card numbers, passwords, Bearer tokens, social security numbers, and sensitive health info never touch log sinks.
- [ ] **Actionable Alerting & Runbook Links**:
  - Alert rules configured for symptoms affecting user experience (e.g., SLO breach, 5xx rate > 1%, P99 > 2000ms), avoiding noisy threshold spam.
  - Every high-severity alert pager (PagerDuty / Opsgenie / Telegram) includes a direct link to an actionable triage runbook.
- [ ] **Comprehensive Healthchecks (Liveness vs Readiness)**:
  - `/healthz` (Liveness): Quick internal process check (<10ms, no heavy DB queries) to detect process deadlocks or event loop freezes.
  - `/ready` (Readiness): Verifies critical dependency reachability (DB connection, cache) before traffic routing.

---

### Pillar 6: Performance Under Load & Resource Efficiency
Ensures sub-second responsiveness, predictable throughput scaling, and elimination of computational or memory bottlenecks.

- [ ] **N+1 Query Elimination & Query Execution Plans**:
  - Zero N+1 query patterns on critical user flows; relational eager-loading (`JOIN FETCH`, batch loaders, DataLoader) audited.
  - Slow query logs enabled (`log_min_duration_statement = 200ms`).
  - Critical queries audited with `EXPLAIN (ANALYZE, BUFFERS)` showing optimal index usage (Index Scan / Index Only Scan) and zero full-table Sequential Scans on tables > 10,000 rows.
- [ ] **Memory Leaks, V8 GC Pressure & Thread Starvation**:
  - Profiling under sustained load confirms stable heap memory (no unbounded caches, event listener leaks, or uncleaned timers).
  - Node.js/Bun event loop lag monitored and kept under 20ms during peak load.
- [ ] **Frontend Performance & Core Web Vitals (UI Workloads)**:
  - Bundle size budgets enforced; dynamic code-splitting (`import()`) for non-critical routes and heavy client libraries.
  - Core Web Vitals meet Google targets under throttled 4G:
    - Largest Contentful Paint (LCP) <= 2.5s.
    - Interaction to Next Paint (INP) <= 200ms.
    - Cumulative Layout Shift (CLS) <= 0.1.
- [ ] **Load & Stress Testing Benchmarks**:
  - Load testing performed (k6, Locust, or Artillery) at 2x-5x anticipated peak production traffic.
  - P95 and P99 latency percentiles documented; breaking point and degradation curve identified.
- [ ] **Connection Pooling & Ephemeral Port Limits**:
  - Database pool size tuned to match hardware constraints: `pool_size = ((core_count * 2) + effective_spindle_count)`.
  - HTTP keep-alive and connection reuse enabled for upstream services to prevent ephemeral port exhaustion.

---

## Production Readiness Audit Runbook & Workflow

### Phase 1: Pre-Audit Static & Architecture Inspection
1. **Repository & Architecture Scan**: Inspect data flow, dependency graph, database schema migrations, and external APIs.
2. **Automated Static Security & Leak Audit**:
   - `gitleaks detect --verbose`
   - `semgrep scan --config "p/owasp-top-ten"`
   - Dependency vulnerability scan (`npm audit` / `trivy fs`).
3. **Database & Index Audit**:
   - Verify index coverage on foreign keys, tenant IDs, sorting fields, and unique constraints.
   - Confirm schema migration safety (no non-concurrent index creation on PostgreSQL, no dropping columns in active use).

### Phase 2: Runtime Verification & Stress Emulation
1. **Concurrency Stress Run**:
   - Execute parallel identical requests using tools like `wrk`, `k6`, or concurrent curl loops with identical idempotency keys and concurrent balance mutation to verify lock correctness.
2. **Failure Injection & Degradation Test**:
   - Simulate downstream service downtime (mock timeout / 503) and verify system returns graceful fallback without hanging.
3. **Traffic Load Benchmark**:
   - Run sustained load test for >= 10 minutes at target QPS. Capture P50/P95/P99 latency, CPU/RAM saturation, and error rates.

### Phase 3: Telemetry & Runbook Verification
1. **Trace & Log Audit**: Trigger test requests; verify `trace_id` is present across all log entries and external calls.
2. **Alert Trigger Test**: Fire synthetic error spike; verify monitoring system alerts and runbook links route to on-call engineer.
3. **Restoration Verification**: Confirm automated backup snapshot exists and latest backup date is within agreed RPO.

---

## Scoring Rubric & Sign-Off Gate

Every audit item must receive one of three ratings:

| Status | Definition | Action Required |
| :--- | :--- | :--- |
| 🟢 **READY** | Meets or exceeds production standards with empirical evidence. | Approved for production rollout. |
| 🟡 **NEEDS REMEDIATION** | Non-critical risk; system operates but degrades under edge conditions. | Must have a tracked GitHub issue and remediation plan before general availability. |
| 🔴 **BLOCKER** | Critical risk (e.g. race condition on financial ledger, unindexed table, missing auth check, hardcoded secret, zero backups). | **HALT LAUNCH IMMEDIATELY.** Deployment strictly prohibited until resolved and re-audited. |

### PRR Decision Gate
- **Launch Approved (Tier-1)**: Zero BLOCKERS, 100% READY across Security, Concurrency, and Data Durability. Maximum 2 NEEDS REMEDIATION in secondary observability/efficiency areas with assigned owners.
- **Launch Rejected**: Any BLOCKER present, or unmitigated risk in state consistency or disaster recovery.

---

## Executive PRR Audit Report Template

When completing a Production Readiness Review, output the following structured audit report:

```markdown
# Production Readiness Review (PRR) Report: <Service / Feature Name>
**Date**: YYYY-MM-DD
**Reviewer**: <Agent / Engineer>
**Target Launch Date**: YYYY-MM-DD
**Target Tier**: Tier-1 (Mission Critical) / Tier-2 / Tier-3

### Executive Summary & Verdict
- **Verdict**: [🟢 APPROVED FOR PROD | 🟡 CONDITIONALLY APPROVED | 🔴 BLOCKED]
- **Key Strengths**: <Highlights>
- **Critical Remediation Items**: <List of blockers or priority action items>

### Pillar Audit Scorecard

| Pillar | Score | Blocker Count | Remediation Count | Summary Finding |
| :--- | :---: | :---: | :---: | :--- |
| 1. Concurrency & Idempotency | [Ready / Needs Rem / Blocker] | 0 | 0 | ... |
| 2. AppSec & Rate Limiting | [Ready / Needs Rem / Blocker] | 0 | 0 | ... |
| 3. Resilience & Chaos | [Ready / Needs Rem / Blocker] | 0 | 0 | ... |
| 4. Data Durability & DR | [Ready / Needs Rem / Blocker] | 0 | 0 | ... |
| 5. Observability & APM | [Ready / Needs Rem / Blocker] | 0 | 0 | ... |
| 6. Performance Under Load | [Ready / Needs Rem / Blocker] | 0 | 0 | ... |

### Empirical Benchmarks & Evidence
- **Peak Sustained Throughput**: XXX QPS
- **Latency Distribution**: P50: XXms | P95: XXms | P99: XXms
- **Database Query Performance**: Slowest query XXms (Index Scan verified)
- **Backup Verification**: Snapshot `<snapshot-id>` verified on YYYY-MM-DD (RPO: Xm, RTO: Xm)

### Sign-Off & Approvals
- [ ] Lead Architect / PRR Reviewer
- [ ] System Operator / SRE
- [ ] Security Sign-off
```
