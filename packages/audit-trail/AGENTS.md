# Cryptographic Chained Audit Logger Standards (@checkin/audit-trail)

<!-- Inherits root project rules & system directives -->
@../../AGENTS.md

================================================================================
1. PACKAGE ROLE & SPECIFICATION
================================================================================
- **Package**: `@checkin/audit-trail` (`packages/audit-trail`)
- **Engine Purpose**: Cryptographic audit logging, tamper detection, Merkle tree batch shift anchoring, and real-time fraud/anomaly detection for LimArt retail operations.
- **Runtime**: Node.js / Bun / TypeScript (Pure cryptographic and computational library with zero DB coupling).

================================================================================
2. CRYPTOGRAPHIC INTEGRITY & HASH-CHAINING INVARIANTS
================================================================================

### 2.1 SHA-256 Hash Chaining
- Each audit log entry is linked to its immediate predecessor, forming a tamper-evident blockchain-like chain.
- Hash Formula:
  ```text
  hash = SHA256(previousHash + timestamp + action + actorId + canonicalJson(payload))
  ```
- **Deterministic Serialization**: JSON payload attributes must be serialized deterministically using canonical JSON stringification (`canonicalJsonStringify`) regardless of object key insertion order.

### 2.2 Genesis Block Verification
- The genesis entry of the chain is anchored to a predefined constant:
  ```typescript
  export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
  ```
- Any chain missing a valid genesis hash or containing an altered historical record fails integrity checks (`verifyChainIntegrity`).

### 2.3 Tamper Detection & Merkle Shift Anchoring
- **Tamper Evidence**: Any modification, insertion, deletion, or reordering of records immediately breaks downstream hashes.
- **Merkle Tree Anchoring**:
  - End-of-shift batches and financial closures are aggregated into a cryptographic Merkle root.
  - Generates and verifies cryptographic inclusion proofs (`verifyMerkleProof`) for financial audit compliance.

### 2.4 Real-time Anomaly & Fraud Detection
- Rules engine monitors audit events for operational anomalies:
  - Unauthorized price overrides or abnormal cash register adjustments.
  - Large order cancellations or cancellations outside business hours (e.g. post 22:00).
  - Cash discrepancies exceeding defined thresholds.
  - Suspicious cash drawer openings (`NO_SALE`).

================================================================================
3. VERIFICATION COMMANDS
================================================================================
```bash
# Run cryptographic immutability and anomaly detection test suite
pnpm --filter @checkin/audit-trail test

# Typecheck TypeScript definitions
pnpm --filter @checkin/audit-trail typecheck

# Build bundle via tsup
pnpm --filter @checkin/audit-trail build
```
