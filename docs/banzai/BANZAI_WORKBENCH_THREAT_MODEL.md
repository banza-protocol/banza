# BanzAI Validation Journey — Threat Model

> **Scope:** the endpoint-originated validation journey and its durable receipt store (ADR-038, ADR-042, ADR-026). Complements [docs/governance/THREAT_MODEL.md](../governance/THREAT_MODEL.md). **Assets protected:** the integrity of a recorded validation result, its inputs' provenance, and the honesty of what the interface claims.

## Trust boundaries

1. **Browser ↔ banzai-api** — the browser is untrusted. The workspace it supplies is never trusted for cross-workspace reads.
2. **banzai-api ↔ implementation origin** — the fetched artefacts are untrusted input, retrieved only through the SSRF-hardened protocol fetcher.
3. **banzai-api ↔ PostgreSQL** — the store holds protocol state, never financial value (ADR-026); the `banzai_rw` role has `SELECT/INSERT` only on sealed tables.
4. **Rust engines** — the only components that decide a verdict; deterministic, no network, no model.

## Threats and mitigations

| # | Threat | Mitigation |
|---|---|---|
| T1 | **SSRF** via a crafted registry target / manifest URL (reach metadata, RFC1918, loopback, link-local, translated addresses) | `banza-artifact-fetcher` policy: block private/loopback/link-local/metadata; classify and block NAT64 (`64:ff9b::/96`), RFC8215 local-NAT64 (`64:ff9b:1::/48`), 6to4 (`2002::/16`) embedded-IPv4, and the 6to4 relay `192.88.99.0/24`; 21 policy tests. |
| T2 | **Forged / upgraded verdict** written to the store | Only the Rust engines decide; the store persists, never recomputes. Non-positive states (`FAILED`/`BLOCKED`) persist faithfully and are never upgraded. |
| T3 | **Tampering with a stored receipt** (out-of-band DB write) | Canonical-JSON SHA-256 digest recomputed and verified on every read (`digest_ok`); a mismatch is surfaced, not hidden. |
| T4 | **Mutating / deleting a sealed result** | DB triggers reject `UPDATE`/`DELETE` on `operation_receipts`, `journey_receipts`, `evidence_bundles`, `validation_artifact_observations`; completed executions and sealed steps are frozen; identity columns immutable; ids never reused; role grant is INSERT-only on sealed tables. |
| T5 | **Fabricated durability** (claiming a run is consultable/reproducible when it is not) | Explicit persistence-status vocabulary; no `receipt_reference` and no history/compare/reproduce offered unless `PERSISTED`; a DB outage yields `PERSISTENCE_PENDING`/`PERSISTENCE_FAILED`, never a fake reference. |
| T6 | **Reproduction spoofing** (replaying a cached body to fake equivalence) | Reproduction re-runs the full secure pipeline against the live origin and re-hashes; it never replays a stored URL/body; typed outcomes distinguish equivalent / not-equivalent / inputs-changed / unavailable / blocked. |
| T7 | **Cross-tenant data access** | Reads are workspace-scoped in SQL; the browser-supplied workspace cannot widen access. |
| T8 | **Duplicate / replayed submissions; crash mid-run** | Idempotency key (unique) collapses double-submits; heartbeat + deterministic stale-recovery mark abandoned `RUNNING` runs `INTERRUPTED` without rewriting any result. |
| T9 | **Operator Zero privilege escalation** | Operator Zero uses the same engines/endpoints/tables/authorization as any external operator; no privileged path exists to grant it a positive outcome. |
| T10 | **Secret leakage** | Secrets (`DATABASE_URL`, outbox path) are env-only, never committed; the store persists digests and protocol state, never keys or financial data. |

## Residual risks / assumptions

- The fetcher's allow/deny policy is only as good as its address classification; new address-translation ranges MUST be added to `policy.rs` with tests.
- A compromised database superuser can bypass triggers; the append-only guarantee is against the application role and accidental mutation, defended in depth by digest-verify-on-read.
- Availability of a validation result depends on the implementation origin being reachable at run and reproduction time; unavailability is reported as `BLOCKED` / `ORIGINAL_INPUTS_UNAVAILABLE`, never as a false positive.
