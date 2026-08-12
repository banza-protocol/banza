# BANZA v1.0 — Clean-Room Implementation Package Manifest

> What we would hand today to an external team asked to implement BANZA v1.0 **without any access to the
> reference implementation**. This manifest does not run the test and does not build anything; it states
> exactly what exists, what is missing, and what must not be handed over.
>
> Verdict up front: **NOT READY FOR CLEAN-ROOM IMPLEMENTATION TEST** (audit §17).

## 1. Mandatory — the package a team would receive

| # | Artifact | Path | Covers |
|---|---|---|---|
| M-01 | Protocol version and compatibility policy | `contracts/production/protocol-version.json` | Version identity, `wire_compatible_with`, breaking-change policy, profile list, state model |
| M-02 | Production contract baseline (37 schemas) | `contracts/production/*.json` | Trust, discovery, registry, receipts, evidence, certification, regulatory state |
| M-03 | Federation contracts (7) | `contracts/federation/*.json` | Key Manifest, BRL, routing, obligation, event, manifest, trust |
| M-04 | Published invariants | `contracts/invariants.json` (68) | Ledger, wallet, settlement, idempotency, reconciliation, QR invariants |
| M-05 | Federation invariants | `spec/federation/FEDERATION_INVARIANTS.md` (63 refs) | INV-ROOT-*, INV-FEDEVAL-* |
| M-06 | Validation journey state machine | `contracts/production/validation-journey-state-machine.production.json` | States, transitions, aggregation step |
| M-07 | Open Trust Evaluation contract | `contracts/production/federation-trust-evaluation.production.schema.json` | The 10 conjunctive checks; `ROUTING_ALLOWED` / `FAIL_CLOSED` |
| M-08 | Evidence bundle contract | `contracts/production/evidence-bundle.production.schema.json` | Bundle composition and digests |
| M-09 | OpenAPI surfaces (7) | `contracts/openapi/*.yaml` | REST surfaces incl. operator validation and interoperability certification |
| M-10 | Domain schemas | `contracts/{qr,events,webhooks,payment-intents,payment-sessions,collections,fees,settlements,wallet-accounts,proofs}/**` | Payment/QR/event/webhook artifacts |
| M-11 | Webhook signature specification | `contracts/webhooks/signature.json` | The one fully specified signing envelope in the surface |
| M-12 | Licence, notice, trademark | `LICENSE`, `NOTICE`, `TRADEMARKS.md` | Legal basis to implement and to describe the implementation |

## 2. Test vectors

| # | Artifact | Path | Note |
|---|---|---|---|
| T-01 | Conformance vectors (61) | `conformance/vectors/*.json` | Ledger, transfers, QR, settlement, events, manifests, wallets, collections |
| T-02 | Conformance suites (7) | `conformance/*/suite.json` | Case matrices with expected outcomes |
| T-03 | Federation fixtures (31) | `conformance/fixtures/federation/*.json` | **Carry placeholder signatures** — structural vectors, not cryptographic ones |
| T-04 | Report schema | `conformance/report-schema.json` | Result format |

**Caveat that must travel with T-03:** the federation fixtures use placeholder signatures (all-`A`
base64). They validate structure and semantics, not cryptography. A clean-room team cannot use them to
verify its signature implementation.

## 3. Informative — helpful, explicitly non-normative

| # | Artifact | Path |
|---|---|---|
| I-01 | Protocol architecture narrative | `spec/README.md`, `spec/overview.md` |
| I-02 | Lifecycle narratives | `spec/payment-lifecycle.md`, `spec/qr-payment-lifecycle.md`, `spec/validation-journey.md` |
| I-03 | Federation model set (14 docs) | `spec/federation/**` |
| I-04 | Accepted decisions (73) | `decisions/adr/**` |
| I-05 | Whitepaper (descriptive) | `docs/whitepaper/**` |
| I-06 | Governance and contribution | `GOVERNANCE.md`, `CONTRIBUTING.md`, `MAINTAINERS.md`, `SECURITY.md` |

## 4. Must NOT be handed over

- `engines/**` — the Rust reference implementation, including `banza-trust`
- `services/**`, `website/**` — reference services and public surface
- `evidence/**` — evidence produced *about* the reference implementation
- `tools/**` — build, guard and derivation tooling
- Any internal commentary, prior session context or informal team instruction

## 5. Missing — what the package cannot supply today

These are the blockers. Each is a finding in the audit, not a new claim here.

| # | Missing | Consequence for a clean-room team | Audit |
|---|---|---|---|
| **X-01** | **Canonical byte form / signing envelope specification** | Cannot produce or verify any signature or digest that the reference implementation would accept. Blocks M-02, M-03, M-07, M-08 in practice | **§14, F-01, P0** |
| X-02 | Index of what constitutes BANZA v1.0 | Cannot determine the boundary of the deliverable it is implementing | §5.3, F-02 |
| X-03 | Declaration of normative keyword convention (RFC 2119 / BCP 14) | Cannot distinguish requirement from recommendation across 597 keyword uses | §5.2, F-03 |
| X-04 | Closed reason-code taxonomy | Cannot produce comparable results; semantic equivalence untestable | §7.2, F-05 |
| X-05 | Normative idempotency rule (key scope, conflict definition, retention) | Must infer replay/conflict behaviour from fixtures | §7.2, F-06 |
| X-06 | Semantic-equivalence rule (which fields must match) | Cannot self-check equivalence against a reference result | §15, F-07 |
| X-07 | Resolvable source of truth for Key Manifest, BRL, events, QR | Five declared pointers lead to absent paths | §5.4, F-04 |
| X-08 | Cryptographic (non-placeholder) trust test vectors | Cannot validate its signature implementation against a known-good vector | §T-03 above |
| X-09 | L4 profile content | Cannot implement external interoperability | §6 item 15 |
| X-10 | Trust-material distribution beyond a single origin | Must depend on one origin's availability, with no specified alternative | §18, F-08 |

## 6. Readiness by capability

| Capability | Package sufficient? |
|---|---|
| Protocol version identification | **Yes** |
| Discovery / canonical origin / implementation identity | **Partially** (X-02, X-07) |
| Manifests and key publication | **Partially** (X-01, X-07) |
| Signatures, delegation, revocation verification | **No** (X-01, X-08) |
| Profiles L0–L3 | **Yes** |
| Profile L4 | **No** (X-09) |
| Validation journey and trust evaluation | **Partially** (X-01 for the digests, X-03) |
| Routing / interoperability | **Partially** (X-04, X-05) |
| Evidence and receipts | **Partially** (X-01, X-04, X-06) |
| Versioning and compatibility | **Yes** |

## 7. Conclusion

**NOT READY FOR CLEAN-ROOM IMPLEMENTATION TEST.**

The manifest is otherwise substantial: 12 mandatory artifact groups, 61 vectors, 7 suites and a complete
legal basis. One blocker dominates — **X-01** — because signatures and digests are the joint on which
trust, evidence and reproducibility all turn. Closing X-01 plus X-02, X-04 and X-08 would in the auditor's
judgement move this manifest to **READY**; the remaining items would then shape the *quality* of the test
rather than its feasibility.

This conclusion concerns **readiness for the experimental test only**. It says nothing about whether BANZA
is an open protocol — that question is answered separately and affirmatively in audit §24 (Q4).
