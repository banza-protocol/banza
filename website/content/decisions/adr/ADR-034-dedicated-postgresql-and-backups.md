# ADR-034 — Dedicated PostgreSQL and encrypted off-VM backups

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-042 (canonical, enforced protocol-state data boundary)

## Context
The protocol must serve public, signed artifacts (key manifest, root manifest, operator registry,
revocation list, conformance evidence hashes) and index its own documentation for
BanzAI. This requires durable storage that is **not** a managed external backend (no Supabase /
Firebase / external managed DB as an operational dependency), to keep the protocol self-contained
and operator-neutral.

## Decision
BANZA runs its **own dedicated PostgreSQL** (with `pgvector` for BanzAI) inside the protocol VM's
Docker-internal network. The database:
- is **never** published to the host or the internet (internal Docker network only);
- uses **segregated roles**: `banza_ro` (serve public routes), `banza_gov` (governed writes to
  trust/registry, audited), `banzai_rw` (BanzAI doc index only — never trust/registry);
- stores **only** public protocol artifacts, the BanzAI document index, and a protocol audit log —
  **no** wallet/ledger/balance/account/KYC data, and **no private keys**. The normative
  data boundary — what the protocol database may and may not represent — is defined and enforced
  by ADR-042.

Backups are **encrypted with `age`**, **off-VM** (object storage), daily (`pg_dump`) and weekly
(public artifacts). Backups are a **recovery mechanism only**, never an operational runtime
dependency; the private decryption key stays off the VM.

## Consequences
- Self-hosted, no external managed backend dependency.
- Least-privilege DB access enforces "BanzAI explains, does not define".
- Recovery is possible without the backups being in the serving path.
