# BANZA v1.0 — Clean-Room Implementation Package Manifest

> What we would hand today to an external team asked to implement BANZA v1.0 **without any access to the
> reference implementation**. This manifest does not run the test and does not build anything; it states
> exactly what exists, what is missing, and what must not be handed over.
>
> **Revision 2 — post-remediation** (see [`BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md`](BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md)).
>
> Verdict up front: **NOT READY FOR CLEAN-ROOM IMPLEMENTATION TEST** — but the blocking profile has changed
> materially. The audit's single P0 (X-01) is closed, and with it X-02, X-03, X-07 and X-08. What remains
> blocking is narrower, and is no longer cryptographic.

## 0. What changed since revision 1

| Blocker | Rev 1 | Rev 2 |
|---|---|---|
| X-01 Canonical byte form / signing envelope | **Missing (P0)** | **Supplied** — `spec/canonicalization.md` (`BCJ/1`) + 24 public vectors |
| X-02 Index of what constitutes BANZA v1.0 | Missing | **Supplied** — `contracts/production/normative-manifest.json`, 138 artifacts, 82 of them required |
| X-03 Normative keyword convention | Missing | **Supplied** — BCP 14 declared in `contracts/README.md` and the spec |
| X-07 Resolvable source of truth | 6 pointers to absent code paths | **Supplied** — all corrected; guarded so they cannot regress |
| X-08 Cryptographic (non-placeholder) vectors | Inside `engines/**`, undeliverable | **Supplied** — moved to `conformance/vectors/trust-signing.json` |
| X-04 Reason-code taxonomy | Missing | **Partially supplied, narrower than recorded** — five vocabularies are closed (certification 18, revocation-entry 7, root-revocation 4, BRL 2, and the 13 OTE check ids). Three open string arrays remain: `failed_checks` and `reason_codes` on both receipt types. Deferred (F-05) |
| X-05 Idempotency rule | Missing | **Partially supplied, narrower than recorded** — `INV-IDEM-001` (incl. the same-key-different-body conflict rule), `INV-FED-004`, `INV-FED-IDEM-001`, `INV-COLLECTION-008` and the `rr-<uuid>` format are published. Missing: retention, the key scope of `INV-IDEM-001`, and the body-comparison rule. Deferred (F-06) |
| X-06 Semantic-equivalence rule | Missing | **Partially supplied** — digest-level yes, field-level no (F-07) |
| X-09 L4 profile content | Missing | **Still missing** |
| X-10 Trust-material distribution | Single origin | **Unchanged** — deferred with rationale (F-08) |

## 1. Mandatory — the package a team would receive

| # | Artifact | Path | Covers |
|---|---|---|---|
| **M-00** | **Normative manifest** | `contracts/production/normative-manifest.json` | **What BANZA 1.0.0 *is*: 138 artifacts with SHA-256 and a two-axis classification. The 82 marked `tier: implementation` are this package's actual reading list; the rest are conformance, legal or informative. Also states precedence on conflict and what is *not* normative — no ADR and no Draft RFC is required reading.** This is the first document the team reads; every other line of this table is an entry in it |
| **M-01** | **Canonicalization specification** | `spec/canonicalization.md` | `BCJ/1` — the exact bytes that are signed and hashed. RFC 8785 restricted by profile rules P1–P7, with the signing procedure (§4), the digest procedure (§5) and the per-artifact excluded members (§6) |
| M-02 | Protocol version and compatibility policy | `contracts/production/protocol-version.json` | Version identity, `wire_compatible_with`, breaking-change policy, profile list, state model, **the canonicalization in force** |
| M-03 | Production contract baseline | `contracts/production/*.json` | Trust, discovery, registry, receipts, evidence, certification, regulatory state |
| M-04 | Federation contracts (7) | `contracts/federation/*.json` | Key Manifest, BRL, routing, obligation, event, manifest, trust |
| M-05 | Published invariants | `contracts/invariants.json` (68) | Ledger, wallet, settlement, idempotency, reconciliation, QR invariants |
| M-06 | Federation invariants | `spec/federation/FEDERATION_INVARIANTS.md` (63 refs) | INV-ROOT-*, INV-FEDEVAL-*, INV-FED-* |
| **M-06b** | **Federation behaviour specifications** | `spec/federation/{FEDERATION_CONTRACT_SURFACE,FEDERATION_PROTOCOL_FLOW,FEDERATION_TRUST_MODEL,FEDERATION_PROTOCOL_SURFACES}.md` | Requirements no JSON contract fully carries: transport, per-interaction re-evaluation, freshness windows, atomicity of the three-operation step, retry behaviour, the `rr-<uuid>` idempotency key. Added to the package in the final verification pass — they were self-declared Canonical and had been omitted |
| **M-06c** | **Validation journey and Collections** | `spec/validation-journey.md`, `spec/collections.md` | Self-declared Normative and Canonical respectively |
| M-07 | Validation journey state machine | `contracts/production/validation-journey-state-machine.production.json` | States, transitions, aggregation step |
| M-08 | Open Trust Evaluation contract | `contracts/production/federation-trust-evaluation.production.schema.json` | The 10 conjunctive checks; `ROUTING_ALLOWED` / `FAIL_CLOSED` |
| M-09 | Evidence bundle contract | `contracts/production/evidence-bundle.production.schema.json` | Bundle composition and digests |
| M-10 | OpenAPI surfaces (4) | `contracts/openapi/{activity,collections,transfers,wallet-onboarding}.yaml` | The operator-implemented public API surfaces. The other three files under `contracts/openapi/` are **not** part of this package's requirement set: `reference-operator.yaml` is the reference sandbox, `operator-validation.yaml` is documentary, and `interoperability-certification.yaml` is the certifying side's publication surface |
| M-11 | Domain schemas | `contracts/{qr,events,webhooks,payment-intents,payment-sessions,collections,fees,settlements,wallet-accounts,proofs}/**` | Payment/QR/event/webhook artifacts |
| M-12 | Webhook signature specification | `contracts/webhooks/signature.json` | HMAC envelope for webhook delivery |
| M-13 | Normative keyword convention | `contracts/README.md` | BCP 14, scoped to the manifest |
| M-14 | Licence, notice, trademark | `LICENSE`, `NOTICE`, `TRADEMARKS.md` | Legal basis to implement and to describe the implementation |

## 2. Test vectors

| # | Artifact | Path | Note |
|---|---|---|---|
| **T-00** | **Canonicalization vectors (24)** | `conformance/vectors/canonicalization.json` | 15 accept + 9 reject, each with canonical form, byte length and SHA-256. The team validates its `BCJ/1` implementation before anything else |
| **T-01** | **Cryptographic trust vectors (12)** | `conformance/vectors/trust-signing.json` | **Real Ed25519 signatures** over `BCJ/1` bytes — root threshold, delegated keys, signed protocol metadata, operator manifest, conformance evidence, registry entry, revocation — each with the expected trust status. Public key material only |
| T-02 | Domain conformance vectors (61) | `conformance/vectors/*.json` | Ledger, transfers, QR, settlement, events, manifests, wallets, collections |
| T-03 | Conformance suites (7) | `conformance/*/suite.json` | Case matrices with expected outcomes |
| T-04 | Federation fixtures (31) | `conformance/fixtures/federation/*.json` | **Carry placeholder signatures** — structural vectors, not cryptographic ones |
| T-05 | Report schema | `conformance/report-schema.json` | Result format |

**Caveat that must travel with T-04:** the federation fixtures use placeholder signatures (all-`A`
base64). They validate structure and semantics, not cryptography. The team validates its signature
implementation against **T-01**, which is what T-01 exists for.

## 3. Informative — helpful, explicitly non-normative

| # | Artifact | Path |
|---|---|---|
| I-01 | Protocol architecture narrative | `spec/README.md`, `spec/overview.md` |
| I-02 | Lifecycle narratives | `spec/payment-lifecycle.md`, `spec/qr-payment-lifecycle.md` — `spec/validation-journey.md` moved to M-06c |
| I-03 | Federation model set (9 remaining docs) | `spec/federation/**` minus those promoted to M-06/M-06b: conformance model, evidence model, fixture catalog, failure scenarios, runner design, sequence diagrams, test-suite spec, traceability, quickstart |
| I-04 | Accepted decisions (77) | `decisions/adr/**` — rationale, not requirements (ADR-081 and ADR-082 explain M-00 and M-01) |
| I-05 | Whitepaper (descriptive) | `docs/whitepaper/**` |
| I-06 | Governance and contribution | `GOVERNANCE.md`, `CONTRIBUTING.md`, `MAINTAINERS.md`, `SECURITY.md` |

## 4. Must NOT be handed over

- `engines/**` — the Rust reference implementation, including `banza-trust`
- `services/**`, `website/**` — reference services and public surface
- `evidence/**` — evidence produced *about* the reference implementation
- `tools/**` — build, guard and derivation tooling
- Any internal commentary, prior session context or informal team instruction

This list is the same as revision 1, and it is now enforceable rather than aspirational: the manifest's
`not_normative` block names exactly these trees, and `tools/check-normative-surface-integrity.sh` fails if
any of them is ever listed as normative.

## 5. Missing — what the package cannot supply today

| # | Missing | Consequence for a clean-room team | Audit | State |
|---|---|---|---|---|
| ~~X-01~~ | ~~Canonical byte form / signing envelope~~ | — | §14, F-01, **P0** | **CLOSED** — M-01 + T-00 |
| ~~X-02~~ | ~~Index of what constitutes BANZA v1.0~~ | — | §5.3, F-02 | **CLOSED** — M-00 |
| ~~X-03~~ | ~~Normative keyword convention~~ | — | §5.2, F-03 | **CLOSED** — M-13 |
| **X-04** | Closed reason-code taxonomy | Cannot produce comparable results; semantic equivalence untestable | §7.2, F-05 | **OPEN** — deferred, scope decision required first |
| **X-05** | Normative idempotency rule (key scope, conflict definition, retention) | Must infer replay/conflict behaviour from fixtures | §7.2, F-06 | **OPEN** — deferred, scope decision required first |
| X-06 | Semantic-equivalence rule (which fields must match) | Can now compare *digests*; cannot self-check *field-level* equivalence | §15, F-07 | **PARTIAL** — blocked on X-04 |
| ~~X-07~~ | ~~Resolvable source of truth for Key Manifest, BRL, events, QR~~ | — | §5.4, F-04 | **CLOSED** — all six corrected and guarded |
| ~~X-08~~ | ~~Cryptographic (non-placeholder) trust vectors~~ | — | rev-1 §2 | **CLOSED** — T-01, published out of `engines/**` |
| X-09 | L4 profile content | Cannot implement external interoperability | §6 item 15 | **OPEN** |
| X-10 | Trust-material distribution beyond a single origin | Must depend on one origin's availability, with no specified alternative | §18, F-08 | **OPEN** — deferred, architectural decision |

## 6. Readiness by capability

| Capability | Rev 1 | Rev 2 |
|---|---|---|
| Protocol version identification | Yes | **Yes** |
| Scope of the deliverable (what is BANZA 1.0) | No (X-02) | **Yes** (M-00) |
| Canonical bytes for signing and hashing | No (X-01) | **Yes** (M-01, T-00) |
| Discovery / canonical origin / implementation identity | Partially (X-02, X-07) | **Yes** |
| Manifests and key publication | Partially (X-01, X-07) | **Yes** |
| Signatures, delegation, revocation verification | **No** (X-01, X-08) | **Yes** (M-01, T-01) |
| Profiles L0–L3 | Yes | **Yes** |
| Profile L4 | No (X-09) | **No** (X-09) |
| Validation journey and trust evaluation | Partially (X-01, X-03) | **Yes** |
| Routing / interoperability | Partially (X-04, X-05) | **Partially** (X-04, X-05) |
| Evidence and receipts | Partially (X-01, X-04, X-06) | **Partially** (X-04, X-06) |
| Versioning and compatibility | Yes | **Yes** |

## 7. Conclusion

**NOT READY FOR CLEAN-ROOM IMPLEMENTATION TEST — for two remaining reasons, neither cryptographic.**

Revision 1 said one blocker dominated: X-01, because signatures and digests are the joint on which trust,
evidence and reproducibility all turn. That blocker is closed, and the auditor's stated criterion for
**READY** — "closing X-01 plus X-02, X-04 and X-08" — is now three-quarters met. X-04 is the one item of
that set still open.

What a clean-room team could do **today** that it could not before: implement `BCJ/1` from published text,
validate it against 24 public vectors, then verify real root, delegation, metadata, manifest, evidence,
registry and revocation signatures against 12 cryptographic vectors — without reading a line of Rust. That
is the whole trust plane.

What it still could not do: produce receipts whose `reason_codes` another implementation would recognise
(X-04), or know what makes two routing attempts the same attempt (X-05). Both sit on the **execution**
surface, not the evaluation surface — which is the audit's original observation, now isolated to its true
scope.

This conclusion concerns **readiness for the experimental test only**. It says nothing about whether BANZA
is an open protocol — that question is answered separately and affirmatively in audit §24 (Q4), and the
answer is stronger in revision 2 than in revision 1, because the protocol's most load-bearing rule no
longer lives in its reference implementation.
