---
trigger: always
description: Security, authentication, authorization, and secret hygiene rules for checkin-app.
---

# Security & Safety Standards

> [!IMPORTANT]
> The Checkin App manages sensitive employee personal records, attendance timestamps, and financial payroll data.
> Security and data privacy standards must be enforced across all layers.

---

## 1. Authentication & Role-Based Access Control (RBAC)

1. **Strict Role Separation**:
   - Two distinct roles: `USER` (Staff) and `ADMIN` (Manager).
   - Every API endpoint under `/api/admin/*` and every administrative Server Action MUST assert `session.user.role === 'ADMIN'`. Never trust client-provided role claims.
2. **Session Verification**:
   - Verify active session on every protected request.
   - For Hono API routes (`apps/api`), validate the JWT bearer token against `NEXTAUTH_SECRET`.
3. **Deactivated User Guard**:
   - If `user.isActive === false`, immediately terminate active sessions and reject all check-in or request actions.

---

## 2. IP Whitelisting & Geofencing Integrity

1. **IPv4 & IPv6 Dual-Stack Support**:
   - IP validation logic (`src/lib/ip-utils.ts` and `apps/api/src/lib/ip-utils.ts`) must support both exact IP matches, IPv4 CIDR blocks (e.g. `192.168.1.0/24`), and IPv6 `/64` subnets (the first 4 groups of 16-bit blocks).
2. **Header Forwarding Trust Boundary**:
   - Extract client IP only from trusted reverse proxy headers (`cf-connecting-ip`, `x-real-ip`, or `x-forwarded-for`).
   - Do NOT allow spoofable client headers to override server-determined proxy IPs.

---

## 3. Cryptographic Audit Trail

1. **Immutable Action Records**:
   - Use `@checkin/audit-trail` to create SHA-256 chained hash records for high-impact actions:
     - Shift edits, swaps, or retroactive reassignments.
     - Manual payroll adjustments, bonuses, or penalties.
     - Adding or removing office Allowed IPs.
2. **Audit Verification**:
   - Every record contains timestamp, actorId, action, targetId, payload hash, and previous hash to detect tampering.

---

## 4. Input Validation & Secret Hygiene

1. **Zod Validation on All Entrypoints**:
   - Every incoming request body and query param MUST be parsed with strict Zod schemas before reaching business logic.
   - Reject unexpected properties.
2. **Zero Hardcoded Secrets**:
   - Never commit API keys, database passwords, or JWT secrets in code files.
   - Reference only `process.env.*`.
   - Never log sensitive tokens or full session objects in stdout or Dozzle logs.
