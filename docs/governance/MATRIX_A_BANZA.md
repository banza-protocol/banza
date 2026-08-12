# Matrix A — BANZA Validation Matrix

**Document ID:** BANZA-VALIDATION-MATRIX-A-001  

> **Boundary note (2026-07).** BANZA does not certify operators and there is no BANZA CA: trust is evaluated from signed protocol metadata and verifiable conformance evidence, under open governance (ADR-038/039/040/054). A conformance PASS is technical evidence, not a certificate; there is currently **no certified operator** and **no active production certificate**.
**Date:** 2026-06-01  
**Authority:** ADR-002, ADR-026, ADR-022, ADR-027  
**Layer:** BANZA Protocol (authoritative)  
**Status:** CANONICAL

---

## Purpose

Matrix A defines the canonical validation scope of the BANZA Protocol layer. Every item in this matrix is owned, maintained, and enforced by BANZA. No operator and no other system may override, weaken, or substitute for any item classified COMPLETE in this matrix.

This matrix is the ground truth for the BANZA conformance requirements. BanzAI guides operators against it; the verifiable engines evaluate against it. Operators (Matrix C) implement against it.

---

## Status Model

| Status | Definition |
|--------|-----------|
| `COMPLETE` | Exists, tested, and enforced (CI gate or automated test) |
| `IN-PROGRESS` | Exists but not all tests pass, or not yet deployed |
| `DEFERRED` | Planned for v1.1 or later; not required for v1.0 |
| `MISSING` | Required for v1.0 production but does not yet exist |

## Confidence Model

| Confidence | Definition |
|-----------|-----------|
| `HIGH` | Enforced by automated tests, CI, or cryptographic verification |
| `MEDIUM` | Documented, reviewed, and manually verified |
| `LOW` | Specified in ADR/RFC but not yet tested or enforced |

## Audit Model

Every COMPLETE item must satisfy at least one of:
- Referenced by an accepted ADR
- Covered by a conformance test vector
- Enforced by a CI gate (`make identity-check`, `conformance.yml`, etc.)

## Dependency Model

```
Contracts → Invariants → Conformance → Certification
```

No conformance vector may test something not specified in a contract. No certification level may require something not covered by a conformance vector.

---

## Category 1: Governance

| Item | Location | Status | Confidence | ADR / Authority |
|------|----------|--------|-----------|----------------|
| Active protocol ADRs (001–036) | `decisions/adr/` | COMPLETE | HIGH | Self-referential canonical decision records |
| ADR-026 — Federation Trust Model | `decisions/adr/ADR-026` | COMPLETE | HIGH | ADR-026 |
| ADR-022 — Certification Level Architecture | `decisions/adr/ADR-022` | COMPLETE | HIGH | ADR-022 |
| ADR-027 — Production Root Architecture | `decisions/adr/ADR-027` | COMPLETE | HIGH | ADR-027 |
| RFC-0001 — Multi-Operator Routing | `decisions/rfc/RFC-0001` | IN-PROGRESS | MEDIUM | Status: Draft → must become Implemented (GOV-001) |
| RFC-0002 — Cross-Operator Settlement | `decisions/rfc/RFC-0002` | IN-PROGRESS | MEDIUM | Status: Draft → must become Implemented (GOV-002) |
| RFC-0003 — Wallet Capabilities | `decisions/rfc/RFC-0003` | IN-PROGRESS | MEDIUM | Status: under GOV-004 review |
| RFC-0004 — Provider Capability Negotiation | `decisions/rfc/RFC-0004` | IN-PROGRESS | MEDIUM | Status: under GOV-004 review |
| RFC-0005 — Operator Discovery | `decisions/rfc/RFC-0005` | IN-PROGRESS | MEDIUM | Status: Draft → must become Implemented (GOV-003) |
| RFC-0006 — Offline Payment Support | `decisions/rfc/RFC-0006` | DEFERRED | LOW | v1.2 scope (FUTURE-006) |
| Key Manifest Contract | (pending) | DEFERRED | LOW | v1.1 scope (FUTURE-002) |
| Multi-Signature Root Authority | (pending) | DEFERRED | LOW | v1.2 scope (FUTURE-003) |
| Protocol Version Negotiation | (pending) | DEFERRED | LOW | v1.1 scope (FUTURE-007) |
| GOV-005 Protocol Development Closure | (pending) | IN-PROGRESS | LOW | Blocked on GOV-001/002/003/004 |

---

## Category 2: Contracts

| Item | Location | Status | Confidence | Authority |
|------|----------|--------|-----------|----------|
| OpenAPI — Reference Operator | `contracts/openapi/reference-operator.yaml` | COMPLETE | HIGH | CI: openapi-compat |
| OpenAPI — Transfers | `contracts/openapi/transfers.yaml` | COMPLETE | HIGH | CI: openapi-compat |
| OpenAPI — Wallets | `contracts/openapi/wallet-onboarding.yaml` | COMPLETE | HIGH | CI: openapi-compat |
| OpenAPI — Activity | `contracts/openapi/activity.yaml` | COMPLETE | HIGH | CI: openapi-compat |
| Event envelope schema | `contracts/events/envelope.schema.json` | COMPLETE | HIGH | CI: schema-compat |
| Webhook event types | `contracts/events/types.json` | COMPLETE | HIGH | CI: schema-compat |
| Webhook envelope schema | `contracts/webhooks/envelope.schema.json` | COMPLETE | HIGH | CI: schema-compat |
| Webhook signature spec | `contracts/webhooks/signature.json` | COMPLETE | HIGH | CI: schema-compat |
| QR payload format | `contracts/qr/payload-format.json` | COMPLETE | HIGH | CI: qr-compat |
| QR lifecycle | `contracts/qr/lifecycle.json` | COMPLETE | HIGH | CI: qr-compat |
| Federation trust (signed protocol metadata) | `contracts/federation/federation-trust.json` | COMPLETE | HIGH | ADR-038, ADR-040 |
| Federation manifest | `contracts/federation/federation-manifest.json` | COMPLETE | HIGH | ADR-026, 79 tests |
| Federation routing | `contracts/federation/federation-routing.json` | COMPLETE | HIGH | ADR-026 |
| Federation obligation | `contracts/federation/federation-obligation.json` | COMPLETE | HIGH | ADR-026 |
| Federation event | `contracts/federation/federation-event.json` | COMPLETE | HIGH | ADR-026 |
| Key Manifest contract | `contracts/federation/key-manifest.json` | MISSING | — | PROTO-003; required before SDK v1.0 |
| Conformance vectors | `conformance/` | COMPLETE | HIGH | docs/guides/conformance.md |

---

## Category 3: Invariants

### Financial Invariants

| Invariant | Definition | Status | Confidence | Enforced by |
|-----------|-----------|--------|-----------|------------|
| INV-LEDGER-001 | Double-entry: every debit has a credit | COMPLETE | HIGH | 28 L1–L2 tests |
| INV-LEDGER-002 | Immutability: no ledger entry modified after creation | COMPLETE | HIGH | LED-* vectors |
| INV-LEDGER-003 | No floating-point monetary values | COMPLETE | HIGH | MON-001, CI |
| INV-LEDGER-004 | Atomic posting: all postings in one transaction | COMPLETE | HIGH | Operator implementation |
| INV-WALLET-001 | Balance consistency: ledger-derived, never negative | COMPLETE | HIGH | WLT-* vectors |
| INV-STL-001 | No money creation: `net_minor + fee_minor = gross_minor` | COMPLETE | HIGH | STL-* vectors |
| INV-STL-002 | Settlement idempotency | COMPLETE | HIGH | STL-* vectors |
| INV-QR-001 | Single-use dynamic QR enforcement | COMPLETE | HIGH | QR-* vectors |
| INV-QR-002 | Dynamic QR amount immutability | COMPLETE | HIGH | QR-* vectors |
| INV-IDEM-001 | Idempotency key scope | COMPLETE | HIGH | TRF-* vectors |
| INV-TRACE-001 | trace_id propagates to all flow entities | COMPLETE | HIGH | EVT-* vectors |
| MON-001 | All monetary values as integer minor units | COMPLETE | HIGH | Universal, CI |

### Trust and Federation Invariants

| Invariant | Definition | Status | Confidence | Enforced by |
|-----------|-----------|--------|-----------|------------|
| INV-FEDEVAL-004 | Signed protocol metadata must verify to the trust root through in-scope, unexpired, unrevoked delegated keys | COMPLETE | HIGH | FED-SPM suite |
| INV-FEDEVAL-006 | Trust material outside its freshness window is rejected — no grace period; effective lifetime ≤ 90 days for L3+ | COMPLETE | HIGH | FED-SPM suite |
| INV-FEDEVAL-002 | Missing, invalid, expired or revoked trust material fails closed (rejected from routing) | COMPLETE | HIGH | FED-TRUST suite |
| INV-FEDEVAL-007 | Manifest must declare `supports_federation: true`, backed by published, valid, fresh, non-revoked L3+ conformance evidence | COMPLETE | HIGH | FED-DISC suite |
| INV-FEDEVAL-005 | Revocation List must be signed and within its freshness window; an unsigned, unverifiable or stale list is treated as untrusted (absent) — fail-closed | COMPLETE | HIGH | FED-SPM suite |
| INV-ROOT-010 | Key rotation must be authenticated by signing the rotation request with the currently-bound private key | COMPLETE | HIGH | FED-TRUST suite |
| INV-FED-001 through INV-FED-007 | Federation routing, settlement, reconciliation invariants | COMPLETE | HIGH | FED-* suites (79 tests) |

### Root Key Invariants

| Invariant | Definition | Status | Confidence | Enforced by |
|-----------|-----------|--------|-----------|------------|
| INV-ROOT-001 | Production key IDs must not start with `test-` | COMPLETE | HIGH | run_fed.py `--production-mode`, ceremony_script.py |
| INV-ROOT-002 | Key Manifest must be root-signed; unsigned manifest rejected | COMPLETE | HIGH | trust_root.py `verify_key_manifest_signature()` |
| INV-ROOT-003 | Stale Key Manifest rejected (SDK must detect expiry) | COMPLETE | MEDIUM | Specified in ADR-027 |
| INV-ROOT-004 | Root key signs Key Manifests only — not certificates, BRLs, or evidence | COMPLETE | HIGH | ceremony_script.py architecture |
| INV-ROOT-005 | BRL must be signed by the designated BRL-issuing key | COMPLETE | HIGH | ceremony_script.py `--generate-initial-brl` |
| INV-ROOT-006 | Issuing key max validity: 184 days. Root key max validity: 24 months | COMPLETE | HIGH | ceremony_script.py `--verify-artifacts` step 6.4 |

---

## Category 4: Conformance

### L0–L2 Conformance (Operator Suite)

| Suite | File | Vectors | Status | Confidence |
|-------|------|---------|--------|-----------|
| Wallets | `conformance/vectors/wallet-balances.json` | WLT-001–WLT-005 | COMPLETE | HIGH |
| Transfers | `conformance/vectors/transfers.json` | TRF-001–TRF-009 | COMPLETE | HIGH |
| QR payloads | `conformance/vectors/qr-payloads.json` | QR-001–QR-007 | COMPLETE | HIGH |
| Payment requests | `conformance/vectors/payment-requests.json` | PR-001–PR-006 | COMPLETE | HIGH |
| Settlement batches | `conformance/vectors/settlement-batches.json` | STL-001–STL-006 | COMPLETE | HIGH |
| Event envelopes | `conformance/vectors/event-envelopes.json` | EVT-001–EVT-008 | COMPLETE | HIGH |
| Ledger postings | `conformance/vectors/ledger-postings.json` | LED-001–LED-006 | COMPLETE | HIGH |
| Operator manifests | `conformance/vectors/operator-manifests.json` | MAN-001–MAN-004 | COMPLETE | HIGH |

### L3 Federation Conformance (79 tests)

| Suite | Tests | Status | Confidence |
|-------|-------|--------|-----------|
| FED-CERT — Certificate validation | 11 | COMPLETE | HIGH |
| FED-DISC — Operator discovery | 8 | COMPLETE | HIGH |
| FED-TRUST — Trust infrastructure | 9 | COMPLETE | HIGH |
| FED-ROUTE — Cross-operator routing | 12 | COMPLETE | HIGH |
| FED-EXEC — Payment execution | 8 | COMPLETE | HIGH |
| FED-OBL — Obligation lifecycle | 7 | COMPLETE | HIGH |
| FED-EVT — Federation events | 6 | COMPLETE | HIGH |
| FED-SETTLE — Settlement and reconciliation | 10 | COMPLETE | HIGH |
| FED-FAIL — Failure and recovery | 8 | COMPLETE | HIGH |

### L4 Conformance

| Suite | Status | Confidence | Note |
|-------|--------|-----------|------|
| Infrastructure suite (12 files, 88 tests) | DEFERRED | — | v1.1 scope (FUTURE-001); L4 is defined but not certifiable in v1.0 |

### Conformance Infrastructure

| Item | Location | Status | Confidence |
|------|----------|--------|-----------|
| Conformance runner (L0–L2) | `tools/banza-conformance/run.py` | COMPLETE | HIGH |
| Federation conformance runner | `tools/banza-conformance/run_fed.py` | COMPLETE | HIGH |
| Interoperability runner | `tools/banza-conformance/run_interop.py` | COMPLETE | HIGH |
| Conformance report schema | `conformance/report-schema.json` | COMPLETE | HIGH |
| Operator manifest schema | `conformance/manifests/schema.json` | COMPLETE | HIGH |
| Federation fixtures (39 files) | `conformance/fixtures/federation/` | COMPLETE | HIGH |

---

## Category 5: Certification

| Item | Location | Status | Confidence |
|------|----------|--------|-----------|
| L0 — Sandbox Operator definition | `docs/governance/certification-boundary.md` | COMPLETE | HIGH |
| L1 — Payment Operator definition | `docs/governance/certification-boundary.md` | COMPLETE | HIGH |
| L2 — Settlement Operator definition | `docs/governance/certification-boundary.md` | COMPLETE | HIGH |
| L3 — Federation Operator definition | `docs/governance/certification-boundary.md` | COMPLETE | HIGH |
| L4 — Infrastructure Operator definition | `docs/governance/certification-boundary.md` | COMPLETE / DEFERRED | MEDIUM | Defined; conformance suite v1.1 |
| Certification process documentation | `docs/governance/certification-boundary.md` | COMPLETE | MEDIUM |
| Conformance report format | `conformance/report-schema.json` | COMPLETE | HIGH |
| Signed protocol metadata signing runbook | (pending) | MISSING | — | DOC-004 |
| Signed protocol metadata refresh runbook | (pending) | MISSING | — | DOC-006 |
| BRL operations runbook | (pending) | MISSING | — | DOC-005 |

---

## Category 6: Federation

| Item | Location | Status | Confidence |
|------|----------|--------|-----------|
| ADR-026 Federation Trust Model | `decisions/adr/ADR-026` | COMPLETE | HIGH |
| Federation contract surface | `contracts/federation/` | COMPLETE | HIGH |
| Federation conformance suite | `tools/banza-conformance/run_fed.py` | COMPLETE | HIGH |
| L3 federation eligibility threshold | `docs/governance/certification-boundary.md` | COMPLETE | HIGH |
| BRL live endpoint | `banza.network/federation/revocation-list.json` | MISSING | — | OPS-004; pending ceremony |
| Key Manifest live endpoint | `banza.network/.well-known/banza/key-manifest.json` | MISSING | — | OPS-003; pending ceremony |
| Operator registry endpoint | (pending) | MISSING | — | INFRA-005; after M3 |

---

## Category 7: Trust (Production Root Architecture)

| Item | Location | Status | Confidence |
|------|----------|--------|-----------|
| ADR-027 Production Root Architecture | `decisions/adr/ADR-027` | COMPLETE | HIGH |
| Root key ceremony procedure | `docs/security/ROOT_KEY_CEREMONY_PROCEDURE.md` | COMPLETE | MEDIUM |
| Root key ceremony checklist | `docs/security/ROOT_KEY_CEREMONY_CHECKLIST.md` | COMPLETE | MEDIUM |
| Root key ceremony record template | `docs/security/ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md` | COMPLETE | MEDIUM |
| Ceremony automation script | `tools/root-ceremony/ceremony_script.py` | COMPLETE | HIGH | Dry-run 10/10 PASS |
| Root key (offline, ed25519) | (pending — air-gapped) | MISSING | — | OPS-001; ceremony scheduled |
| Three issuing keys | (pending) | MISSING | — | OPS-002; after ceremony |
| Key Manifest signed + published | (pending) | MISSING | — | OPS-003; after OPS-002 |
| BRL signed + published | (pending) | MISSING | — | OPS-004; after OPS-002 |
| SDK v1.0 Key Manifest pin | (pending) | MISSING | — | OPS-005; after OPS-002 |

---

## Category 8: Documentation

| Item | Location | Status | Confidence |
|------|----------|--------|-----------|
| docs/governance/certification-boundary.md | root | COMPLETE | HIGH |
| docs/guides/conformance.md | root | COMPLETE | HIGH |
| docs/governance/README.md | root | COMPLETE | MEDIUM |
| docs/reference/en/complete.md | root | COMPLETE | MEDIUM |
| docs/governance/roadmap.md | root | IN-PROGRESS | LOW | Federation section stale (PROTO-004/DOC-001) |
| spec/federation/ (20 files) | `spec/federation/` | COMPLETE | MEDIUM |
| Operator quickstart | `spec/federation/FEDERATION_OPERATOR_QUICKSTART.md` | IN-PROGRESS | LOW | Production endpoints missing (DOC-002) |
| L4 conformance caveat in docs/governance/certification-boundary.md | — | MISSING | — | DOC-003; mark L4 as v1.1 |

---

## Summary

| Category | COMPLETE | IN-PROGRESS | DEFERRED | MISSING |
|----------|:--------:|:-----------:|:--------:|:-------:|
| Governance | 29 ADRs | 5 RFCs, GOV-005 | 3 ADRs, RFC-0006 | — |
| Contracts | 16 | — | — | 1 (key-manifest.json) |
| Invariants | 23 | — | — | — |
| Conformance | L0–L3 (130 tests) | — | L4 | — |
| Certification | L0–L3 fully | — | L4 suite | 3 runbooks |
| Federation | Trust model + suite | — | — | BRL endpoint, Key Manifest endpoint, registry |
| Trust | Procedure + script | — | — | Root key, issuing keys, live endpoints, SDK pin |
| Documentation | Core docs | Roadmap, quickstart | — | L4 caveat |

**Protocol design: FROZEN (M1 achieved 2026-06-01)**  
**Operational gaps: 9 items MISSING — all in Programs A and B**
