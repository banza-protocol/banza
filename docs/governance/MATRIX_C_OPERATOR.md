# Matrix C — Operator Implementation Matrix

**Document ID:** BANZA-VALIDATION-MATRIX-C-001  
**Date:** 2026-06-01  
**Authority:** ADR-002, ADR-022, docs/governance/certification-boundary.md  
**Layer:** Conformant Operators (implementation)  
**Status:** CANONICAL

---

## Purpose

Matrix C defines the generic operator implementation model. Any BANZA operator — regardless of brand, geography, or product — must satisfy the requirements in this matrix for its declared conformance level.

This matrix contains no operator names. No operator brand appears here. Any conformant operator must fit this model.

---

## Operator Independence Principle

Each operator is an independent commercial entity. Operators:
- Implement the BANZA protocol against this matrix
- Seek certification from BANZA
- Use BanzAI (optionally) to assess readiness
- Never modify protocol invariants
- Never modify contract schemas
- Never modify conformance vectors

No one certifies an operator — not the operator itself, and not BANZA. An operator demonstrates compatibility by publishing verifiable conformance evidence, evaluated by Open Trust Evaluation.

---

## Status Model

| Status | Definition |
|--------|-----------|
| `REQUIRED` | Mandatory for the declared certification level |
| `CONDITIONAL` | Required only when the associated capability is declared |
| `OPTIONAL` | Not required but compatible with the protocol |
| `PROHIBITED` | Explicitly forbidden by protocol invariant |
| `OPERATOR-SPECIFIC` | Outside the protocol scope — operator's own responsibility |

---

## Certification Level Requirements Summary

| Level | Name | Required categories |
|-------|------|---------------------|
| L0 | Sandbox Operator | Wallet (basic), Health, Manifest (L0) |
| L1 | Payment Operator | Wallet, QR (static), Transfer, Ledger, Settlement (basic) |
| L2 | Settlement Operator | All L1 + QR (dynamic), Payment Links, Tracing |
| L3 | Federation Operator | All L2 + Federation APIs, Certificate, BRL compliance |
| L4 | Infrastructure Operator | All L3 + Card Acquiring (v1.1 scope) |

---

## Category 1: Wallet

| Capability | Certification Level | Status | Invariants |
|-----------|:------------------:|--------|-----------|
| Consumer wallet creation (`POST /wallets`) | L1+ | REQUIRED | INV-LEDGER-001, INV-WALLET-001 |
| Consumer wallet funding (`POST /v1/sandbox/fund`) | L0+ | REQUIRED | INV-LEDGER-001 |
| Wallet balance query (`GET /wallets/:id`) | L1+ | REQUIRED | INV-WALLET-001 |
| Ledger-derived balances (never directly updated) | L1+ | REQUIRED | INV-LEDGER-004 |
| No negative balance enforcement | L1+ | REQUIRED | INV-WALLET-001 |
| @handle identity uniqueness | L1+ | REQUIRED | INV-IDENT-001 |
| Merchant wallet management | L1+ | REQUIRED | INV-WALLET-001 |
| Direct wallet balance manipulation | All levels | PROHIBITED | INV-LEDGER-004 |
| Floating-point monetary values | All levels | PROHIBITED | MON-001, INV-LEDGER-003 |

---

## Category 2: QR Payments

| Capability | Certification Level | Status | Invariants / Contracts |
|-----------|:------------------:|--------|----------------------|
| Static QR generation | L1+ | REQUIRED | INV-QR-001, `contracts/qr/payload-format.json` |
| Static QR payment processing | L1+ | REQUIRED | INV-QR-001 |
| QR prefix format: `BANZA:` (production) | L1+ | REQUIRED | `contracts/qr/payload-format.json` |
| QR prefix format: `BANZA-SBX:` (sandbox) | L0–L1 | REQUIRED | `contracts/qr/payload-format.json` |
| Legacy QR prefix alternatives | All levels | PROHIBITED | CI: qr-compat gate |
| Dynamic QR with encoded amount | L2+ | REQUIRED | INV-QR-002 |
| Dynamic QR amount immutability | L2+ | REQUIRED | INV-QR-002 |
| Single-use dynamic QR enforcement | L2+ | REQUIRED | INV-QR-001 |
| QR expiry enforcement | L1+ | REQUIRED | `contracts/qr/lifecycle.json` |
| QR trace propagation | L1+ | REQUIRED | INV-TRACE-001 |

---

## Category 3: Payments and Transfers

| Capability | Certification Level | Status | Invariants |
|-----------|:------------------:|--------|-----------|
| P2P transfer (`POST /transfers`) | L1+ | REQUIRED | INV-LEDGER-001, INV-IDEM-001 |
| Transfer idempotency | L1+ | REQUIRED | INV-IDEM-001 |
| Double-entry enforcement (1 DEBIT + 1 CREDIT) | L1+ | REQUIRED | INV-LEDGER-001, INV-LEDGER-004 |
| Payment requests (`POST /payment-requests`) | L1+ | REQUIRED | `contracts/openapi/` |
| Payment request expiry enforcement | L1+ | REQUIRED | `contracts/qr/lifecycle.json` |
| Single-use payment request enforcement | L1+ | REQUIRED | INV-QR-001 |
| Payment links | L2+ | REQUIRED | `contracts/openapi/` |
| Trace ID propagation on all flow entities | L1+ | REQUIRED | INV-TRACE-001 |
| GET /traces/:trace_id endpoint | L1+ | REQUIRED | INV-TRACE-001 |
| causation_id on derived transfers | L1+ | REQUIRED | INV-TRACE-001 |

---

## Category 4: Ledger

| Capability | Certification Level | Status | Invariants |
|-----------|:------------------:|--------|-----------|
| Double-entry ledger | L1+ | REQUIRED | INV-LEDGER-001, INV-LEDGER-002 |
| Ledger entry immutability | L1+ | REQUIRED | INV-LEDGER-002 |
| Atomic posting | L1+ | REQUIRED | INV-LEDGER-004 |
| Integer minor unit storage | L1+ | REQUIRED | INV-LEDGER-003, MON-001 |
| Ledger trace propagation | L1+ | REQUIRED | INV-TRACE-001 |
| Synchronous ledger writes | L1+ | REQUIRED | INV-LEDGER-004 |
| Asynchronous ledger writes for primary confirmation | All levels | PROHIBITED | INV-LEDGER-004 |

---

## Category 5: Events and Webhooks

| Capability | Certification Level | Status | Contracts |
|-----------|:------------------:|--------|----------|
| Event emission (wallet, transfer, payment) | L1+ | REQUIRED | `contracts/events/envelope.schema.json` |
| Event envelope schema compliance | L1+ | REQUIRED | `contracts/events/envelope.schema.json` |
| trace_id on all event envelopes | L1+ | REQUIRED | INV-TRACE-001 |
| correlation_id on all events | L1+ | REQUIRED | INV-TRACE-001 |
| Webhook delivery with signature | L2+ | REQUIRED | `contracts/webhooks/signature.json` |
| Webhook retry with exponential backoff | L2+ | CONDITIONAL | OPTIONAL for L2 |
| Federation events | L3+ | REQUIRED | `contracts/federation/federation-event.json` |

---

## Category 6: Settlement

| Capability | Certification Level | Status | Invariants |
|-----------|:------------------:|--------|-----------|
| T+0 (instant) settlement | L2+ | REQUIRED | INV-STL-001 |
| Settlement batch management | L2+ | REQUIRED | INV-STL-002 |
| `net_minor + fee_minor = gross_minor` | L2+ | REQUIRED | INV-STL-001 |
| Settlement idempotency | L2+ | REQUIRED | INV-STL-002, INV-IDEM-001 |
| Bank rail settlement (EMIS/Multicaixa) | L3+ | REQUIRED | INV-STL-001 |
| Inter-operator net settlement | L3+ | REQUIRED | ADR-026 |
| Settlement trace propagation | L1+ | REQUIRED | INV-TRACE-001 |

---

## Category 7: APIs (Well-Known and Federation)

| Endpoint | Certification Level | Status | Authority |
|----------|:------------------:|--------|----------|
| `GET /health` | L0+ | REQUIRED | — |
| `POST /wallets` | L0+ | REQUIRED | — |
| `/.well-known/banza/operator.json` (manifest) | L3+ | REQUIRED | ADR-026 |
| `/.well-known/banza/certificate.json` | L3+ | REQUIRED | ADR-022, ADR-027 |
| `POST /federation/route` | L3+ | REQUIRED | ADR-026 |
| `GET /federation/obligations` | L3+ | REQUIRED | ADR-026 |
| `supports_federation: true` in manifest | L3+ | REQUIRED | INV-FEDEVAL-007 |
| `cross_operator_routing: true` in manifest | L3+ | REQUIRED | INV-FEDEVAL-007 |

---

## Category 8: Trust and Federation Compliance

| Requirement | Certification Level | Status | Invariants |
|------------|:------------------:|--------|-----------|
| Published signed protocol metadata + reproducible conformance evidence, verifiable to the trust root | L3+ | REQUIRED | INV-FEDEVAL-004, INV-FEDEVAL-003 |
| Trust material within its freshness window (≤ 90 days for L3+; no grace period) | L3+ | REQUIRED | INV-FEDEVAL-006 |
| Operator not revoked — missing, invalid, expired or revoked trust material fails closed | L3+ | REQUIRED | INV-FEDEVAL-002 |
| Revocation List signed and within its freshness window; an unsigned, unverifiable or stale list is treated as untrusted (absent) — fail-closed | L3+ | REQUIRED | INV-FEDEVAL-005 |
| Key Manifest signature verification before trusting any key | L3+ | REQUIRED | INV-ROOT-002, INV-ROOT-010 |
| Reject stale Key Manifest (past `expires_at`) | L3+ | REQUIRED | INV-ROOT-003 |
| Reject `test-` prefixed `issuer_key_id` in production | L3+ | REQUIRED | INV-ROOT-001 |

---

## Category 9: Operator-Specific (Outside Protocol Scope)

These items are the operator's own responsibility. They are not specified by the BANZA protocol, not tested by the conformance suite, and not certified by BANZA.

| Item | Classification | Note |
|------|---------------|------|
| KYC / AML / identity verification | OPERATOR-SPECIFIC | Regulatory requirement; operator's legal obligation |
| Consumer mobile app | OPERATOR-SPECIFIC | Not a protocol surface |
| Merchant dashboard | OPERATOR-SPECIFIC | Not a protocol surface |
| Fee structures | OPERATOR-SPECIFIC | Operator commercial decision |
| Consumer credit products | OPERATOR-SPECIFIC | Operator product |
| Fraud detection and risk scoring | OPERATOR-SPECIFIC | Operator responsibility |
| Production infrastructure | OPERATOR-SPECIFIC | Operator responsibility |
| CI/CD and deployment | OPERATOR-SPECIFIC | Operator responsibility |
| Regulatory licensing | OPERATOR-SPECIFIC | Operator legal obligation |
| Operator-specific extensions to the protocol | PROHIBITED | Extensions must go through the ADR/RFC process |

---

## Conformance Vector Map

Any operator targeting a given level must pass all vectors for that level and all levels below it.

| Level | Required vectors | Runner |
|-------|----------------|--------|
| L0 | Sandbox health + valid `simulated=true` manifest | `tools/banza-conformance/run.py --level 0` |
| L1 | L0 + wallets, transfers, double-entry ledger, traceability | `run.py --level 1` |
| L2 | L1 + payment requests, dynamic QR, instant execution | `run.py --level 2` |
| L3 | L2 + all FED-* suites | `run.py --federation` (`run_fed.py`) |
| L4 | L3 + infrastructure suite | Not yet available (v1.1) |

---

## Summary

This matrix is operator-neutral. No operator brand names appear. No operator is privileged. Every BANZA operator is subject to the same requirements at each level.

The conformance suite is the authority. BanzAI guidance helps reach it. Verifiable conformance evidence confirms it — there is no central BANZA certification (ADR-038/054).
