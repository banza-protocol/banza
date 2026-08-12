# Canonical ADR/RFC Review Matrix (2026-07)

**Base:** `main` `e41be0c` · **Phase:** 7M · One row per canonical decision document
(ADR-001…036, RFC-0001…0006). Reviewed document-by-document against the current BANZA
protocol boundary. **Classifications:** PASS · PASS_WITH_MINOR_FIX · PASS_WITH_ERRATUM ·
HISTORICAL_NOTED · MANUAL_REVIEW_REQUIRED · BLOCKED.

**Result:** 42 reviewed — **35 PASS**, **3 PASS_WITH_MINOR_FIX** (ADR-002/004/008),
**4 PASS_WITH_ERRATUM** (ADR-006/010/017, RFC-0006 — errata from 7J/7K/7K1, confirmed here).
**0 MANUAL_REVIEW_REQUIRED · 0 BLOCKED.** No document contradicts `/operators=[]`,
`production_certificates=false`, or BanzAI-mock/non-normative.

| ID | Title | Status | Classification | Finding | Action applied | Erratum? | Snapshot updated | Remaining risk | M2-ready |
|---|---|---|---|---|---|---|---|---|---|
| ADR-001 | BANZA as Open Financial Protocol | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-002 | Ecosystem Naming Inversion | Accepted | PASS_WITH_MINOR_FIX | Author placeholder + "BanzAI replaces BanzAI" tautology; historical docs/migration prose refs (removed docs) | Fixed author→BANZA Protocol; fixed tautology; migration refs noted | - | Y | none | Y |
| ADR-003 | Protocol/Operator Separation | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-004 | Reference Operator | Accepted | PASS_WITH_MINOR_FIX | Duplicate article "the the reference operator" | Fixed duplicate article | - | Y | none | Y |
| ADR-005 | Protocol-first product development | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-006 | Double-Entry Ledger and Monetary Precision | Accepted | PASS_WITH_ERRATUM | Erratum (2026-07) present — BANZA does not move/hold/settle funds | — | Y | - | none | Y |
| ADR-007 | Double-Entry Invariant: Enforcement Strategy | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-008 | Markdown-First Content Architecture — docs/reference | Accepted | PASS_WITH_MINOR_FIX | Doubled `docs/docs/reference` path (text) + historical docs/migration prose refs | Fixed doubled path (docs/docs→docs); migration refs noted | - | Y | none | Y |
| ADR-009 | Provider Abstraction Model | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-010 | Account/Participant Identity Model (Account-Based, N | Accepted | PASS_WITH_ERRATUM | Erratum (2026-07) present — BANZA is not a wallet / account model (7K1) | — | Y | - | none | Y |
| ADR-011 | Idempotency and Rate Limiting with Redis | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-012 | QR Code Payment System | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-013 | Payment Links: Shareable URL Commerce Primitive | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-014 | Payment Intent: the canonical payment-initiation pri | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-015 | Payment Session: the unified payment interface | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-016 | Payment Collections (split / shared / group payments | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-017 | Wallet/account merchant payments and refund source m | Accepted | PASS_WITH_ERRATUM | Erratum (2026-07) present — wallet/account, not BANZA wallet | — | Y | - | none | Y |
| ADR-018 | Merchant-facing refundable-source reference on paid  | DRAFT / PROPOSED | PASS | DRAFT, explicitly disclaimed (not normative, not submitted) | — | - | - | none | Y |
| ADR-019 | Generic Fee & Application-Settlement Architecture | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-020 | Wallet Accounts (Segregated Accounts within a Wallet | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-021 | BANZA v1.0 conformance level capability alignment | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-022 | BANZA Certification Level Architecture | Accepted (level  | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-023 | Transaction Proof Standard | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-024 | Public Verification Pages | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-025 | Interactive Financial Documents | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-026 | Federation Trust Model | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-027 | BANZA Production Root Architecture | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-028 | Private keys never reside on serving infrastructure | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-029 | KYC stays operator policy; only Trust Assertions may | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-030 | Environment Isolation: Sandbox vs Production | Accepted | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-031 | Canonical verification routes and pre-production beh | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-032 | BanzAI as a subordinate, non-authoritative knowledge | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-033 | Dedicated infrastructure, independent of any operato | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-034 | Dedicated PostgreSQL and encrypted off-VM backups | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-035 | Deploy model: Docker Compose, pinned images, secrets | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| ADR-036 | DNS and TLS: Cloudflare proxied, Full (strict), Orig | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| — RFCs — |
| RFC-0001 | — | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| RFC-0002 | — | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| RFC-0003 | — | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| RFC-0004 | — | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| RFC-0005 | — | — | PASS | Boundary-clean; protocol defines, operators implement | — | - | - | none | Y |
| RFC-0006 | — | — | PASS_WITH_ERRATUM | Erratum (2026-07) present — BANZA is not a wallet | — | Y | - | none | Y |
