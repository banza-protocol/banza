# BANZA v1.0 — Audit Remediation Backlog

> Backlog only. **Nothing in this file was implemented in the audit branch.** Each item states what was
> found, why it matters and what would close it — it does not prescribe the design of the fix, which
> belongs to the remediation milestone and to the ADR process.

Traceability: every item carries its finding ID (`F-nn`) and audit section.

---

## Disposition after the remediation milestone

The item text below is left **exactly as the audit wrote it**, so that this file remains readable as the
original backlog. This table is the only addition; it records what the remediation milestone did with each
item. Full reasoning: [`BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md`](BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md).

| Item | Finding | Disposition | Closed by |
|---|---|---|---|
| **P0-1** Canonical byte form and signing envelope | F-01 | **DONE** | `spec/canonicalization.md` (`BCJ/1`, a profile of RFC 8785 — ADR-082), 20 public vectors, engine reimplemented against them |
| P1-1 Index of the normative surface | F-02 | **DONE** | `contracts/production/normative-manifest.json` — 130 artifacts, digest-verified |
| P1-2 Normative keyword convention | F-03 | **DONE** | BCP 14 declared in `contracts/README.md` and in the canonicalization spec |
| P1-3 Dangling `_source_of_truth` pointers | F-04 | **DONE** | All six rewritten to normative artifacts; guard prevents regression |
| P1-4 Closed reason-code taxonomy | F-05 | **DEFERRED** | Needs a scope decision (closed vs namespaced-extensible registry, and its versioning rules) before specification |
| P1-5 Idempotency rule | F-06 | **DEFERRED** | Needs the protocol / Layer-3 scope classification first |
| P1-6 Semantic equivalence testable | F-07 | **PARTIAL** | Digest-level equivalence is now specified and vector-backed; the field-level rule depends on P1-4 |
| P1-7 Trust-plane single-origin dependency | F-08 | **DEFERRED** | Architectural decision, recorded rather than silently accepted; milestone §36 permits deferral |
| **P1-8** Cryptographic trust test vectors | — | **DONE** | 12 real-signature vectors published as `conformance/vectors/trust-signing.json`, moved out of `engines/`. The audit's sequencing was right: this only became useful once P0-1 specified the bytes they sign |
| P2-1 Active maintainers / admission criteria | F-09 | **DEFERRED** | Governance, untouched by design (milestone §55) |
| P2-2 Contribution provenance (DCO/CLA) | F-10 | **DEFERRED** | Same |
| P2-3 Whitepaper points at the normative surface | F-11 | **DEFERRED BY DESIGN** | Milestone §46 forbids touching the Whitepaper; now actionable, because the manifest it would cite exists |
| P2-4 L4 profile content | — | **DEFERRED** | Unchanged |
| P2-5 Secure-fetch requirements into a contract | — | **DEFERRED** | Unchanged |
| P2-6 Reduce documentary-mirror framing | — | **PARTIAL** | The six `_source_of_truth` inversions are gone; the broader framing review is not done |
| R-01 … R-04 Research | — | **REMAIN RESEARCH** | The milestone forbids auto-adoption; no finding forced a decision on any of them |

**Score after the remediation milestone:** P0 1/1 · P1 4/8 done, 1 partial, 3 deferred · P2 0/6, 1 partial.

---

## Final disposition — after the execution-semantics milestone

Every finding now has a terminal disposition. **No P0 or P1 blocks a clean-room implementation.**

| Item | Finding | Final disposition | Blocks clean-room? |
|---|---|---|---|
| P0-1 Canonical byte form | F-01 | **RESOLVED** — `spec/canonicalization.md` (`BCJ/1`), 24 vectors | No |
| P1-1 Index of the normative surface | F-02 | **RESOLVED** — 143-artifact classified manifest | No |
| P1-2 Normative keyword convention | F-03 | **RESOLVED** — BCP 14 declared | No |
| P1-3 Dangling `_source_of_truth` | F-04 | **RESOLVED** — corrected in `_source_of_truth` *and* `_authority`; guarded | No |
| **P1-4 Reason-code taxonomy** | F-05 | **RESOLVED** — `spec/reason-codes.md` + `banza-reason-codes/1` + 21 vectors. Also closed the three vocabularies that lived only in the Rust | No |
| **P1-5 Idempotency rule** | F-06 | **RESOLVED** — `spec/idempotency.md` + 15 vectors: scope tuple, `BCJ/1` request identity, retention floor + declaration, retry, conflict, concurrency | No |
| **P1-6 Semantic equivalence testable** | F-07 | **RESOLVED** — `spec/reason-codes.md` §8 defines equivalence and what MAY differ; 4 vectors | No |
| P1-7 Trust-plane single origin | F-08 | **DEFERRED NON-BLOCKING** — an availability and architecture question. The rules for fetching, verifying and refusing trust material are fully published; only an alternative distribution channel is unspecified. An implementation can be written and be correct without it | No |
| P1-8 Cryptographic trust vectors | — | **RESOLVED** — `conformance/vectors/trust-signing.json`, published out of `engines/` | No |
| P2-1 Active maintainers | F-09 | **DEFERRED NON-BLOCKING** — governance, untouched by design | No |
| P2-2 Contribution provenance | F-10 | **DEFERRED NON-BLOCKING** — same | No |
| P2-3 Whitepaper cites the surface | F-11 | **DEFERRED BY DESIGN** — the Whitepaper is out of scope for both milestones; now actionable | No |
| P2-4 L4 profile content | — | **DEFERRED NON-BLOCKING** — L4 is external interoperability, outside a v1.0.0 clean-room test. L0–L3 are fully specified | No |
| P2-5 Secure-fetch into a contract | — | **DEFERRED NON-BLOCKING** — the rules are published in ADR-068 and the fetch reason codes are now a normative vocabulary; promoting them to a schema is an improvement, not a gap | No |
| P2-6 Documentary-mirror framing | — | **PARTIALLY RESOLVED** — the `_source_of_truth` and `_authority` inversions are gone; seven schemas still declare `_status: reference` while being implementation-tier, recorded per artifact and frozen by the guard at seven | No |
| R-01…R-04 Research | — | **REJECTED WITH RATIONALE for v1.0.0** — DID/VC, transparency logs, Mojaloop/PAPSS/KWiK and governance evolution remain research. No finding required a decision on any of them, and the milestones forbid auto-adoption | No |

**Resolved: 8 · Partially resolved: 1 · Deferred non-blocking: 6 · Rejected with rationale: 4.**

Two defects found while auditing the remediation are also recorded here so nothing is lost: four
federation contracts cite a Draft RFC in `_authority` (a naming defect — the rules live in the contracts),
and `verdict.rs` maps `TRUST_INCOMPLETE`, a value that is not in `STATUS_VALUES` and therefore cannot
occur. Neither blocks anything.

The audit's suggested sequencing was followed: P0-1 first, then P1-1 and P1-2, then P1-3; P1-4 and P1-5
were reached and deliberately not specified without their scope decision.

---

## P0 — Protocol blockers

### P0-1 · Specify the canonical byte form and the signing envelope
**Finding F-01 · audit §14 · claims 11, 12, 18, 20, 22, 23**

Every signature and digest in the protocol is computed over "canonical bytes", and the production schemas
promise these are *"recalculável por qualquer verificador independente"*. The rule exists only as
`serde_json::to_string()` in `engines/banza-trust/src/lib.rs:59`. Executed evidence shows the resulting
form is **not** RFC 8785 (JCS): `1e2` serialises as `100.0`, large integers as `1e+22`, and no Unicode
normalisation is applied. An independent implementation using a standard canonicalisation produces
different bytes and its signatures will not verify.

Closing this requires a normative statement of: key ordering; number representation; string escaping and
Unicode normalisation; the per-artifact field-exclusion sets; and the exact bytes signed for each signed
artifact type. Whether BANZA adopts RFC 8785 or specifies its current behaviour is an open architectural
decision for the remediation milestone — the audit takes no position, but notes that adopting an existing
standard would also supply third-party test vectors.

**Blocks:** clean-room readiness (X-01), independent signature verification, evidence replay by a second
implementation, semantic equivalence testing.

---

## P1 — Normative / documentation weaknesses

### P1-1 · Publish an index of the BANZA v1.0 normative surface
**F-02 · §5.3 · claim 2** — Nothing states which artifacts constitute BANZA v1.0. A reader must infer the
surface from directory names. Also the primary remedy for H2.

### P1-2 · Declare the normative keyword convention
**F-03 · §5.2** — `MUST`/`SHALL`/`REQUIRED` are used 597 times with no artifact establishing RFC 2119 /
BCP 14. The force of the specification's most load-bearing words is currently assumed.

### P1-3 · Resolve the dangling `_source_of_truth` pointers
**F-04 · §5.4 · claims 5, 9** — Five contracts name code as their source of truth and **all five paths are
absent from the repository**, including `key-manifest.json` and `revocation-list.json`. Two problems to
separate: the missing paths, and the inverted model in which the schema mirrors code rather than the code
implementing the schema.

### P1-4 · Define a closed reason-code taxonomy
**F-05 · §7.2 · claims 17, 21, 22** — A closed 18-value enum exists only in `certification-record`. In
`journey-receipt` and `operation-receipt`, `reason_codes` is an open `array<string>`. Two implementations
cannot agree on why something failed.

### P1-5 · State the idempotency rule normatively
**F-06 · §7.2 · claim 17** — Replay and conflict behaviour is demonstrated by fixtures and engine
behaviour (`INV-IDEM-*`, 409 on same key with different content) but the rule itself — key scope, conflict
definition, retention window — is not stated normatively.

### P1-6 · Make semantic equivalence testable
**F-07 · §15 · claims 22, 23** — The Whitepaper's equivalence requirement names only execution timestamps
as excluded. Which fields must match exactly, and which may diverge, is undefined.

### P1-7 · Address the trust-plane single-origin dependency
**F-08 · §18 · claim 26** — The Key Manifest and BRL are normatively required, fail-closed, and specified
at one canonical `banza.network` location, with no mirroring, alternative origin or offline distribution
specified. Funds and messages never traverse BANZA infrastructure — this is a **liveness** coupling in the
control plane, not the operational-intermediary problem the external critique alleges, and it should be
either mitigated or explicitly acknowledged.

### P1-8 · Publish cryptographic trust test vectors
**§T-03 / X-08** — The 31 federation fixtures carry placeholder signatures. There is no known-good
signed artifact against which an external implementation could validate its signature code. Depends on
P0-1.

---

## P2 — Improvements

### P2-1 · Record active maintainers and admission criteria
**F-09 · §11** — `MAINTAINERS.md` §3 lists no active maintainer and defers to "repository ownership".
Governance is transparent and formally participative; the record does not yet evidence that.

### P2-2 · Adopt a contribution provenance mechanism (DCO or CLA)
**F-10 · §12** — Contributions rely on Apache-2.0 §5 by default. Adequate legally; weak on provenance.

### P2-3 · Point the Whitepaper at the normative surface
**F-11 · §19** — The Whitepaper correctly defers to "os artefactos normativos versionados aplicáveis" and
names none. Depends on P1-1. **Note:** the Whitepaper is frozen and canonical; any change follows the
canonical-source governance in `docs/whitepaper/BUILD.md` and is a separate decision.

### P2-4 · Publish L4 profile content
**§6 item 15 / X-09** — L4 is defined as profile-scoped; the profile content is not published.

### P2-5 · Promote secure-fetch requirements into a contract
**claim 24 · §19** — The SSRF/TLS/redirect rules are strongly implemented and tested but live in prose and
ADR-068 rather than in a fetch contract schema.

### P2-6 · Reduce documentary-mirror framing in production contracts
**§5.4** — Six production contracts self-describe as "Documentary/reference contract — mirrors the Rust…".
For an open protocol the intended direction is the reverse.

---

## Research

### R-01 · DID Core / Verifiable Credentials
**H8 · §20** — Genuine conceptual overlap with key publication, delegation and revocation. Question for
research: would adoption or profiling reduce BANZA-specific surface, or add complexity without closing a
real gap? Options: `ADOPT` · `PROFILE` · `REJECT WITH RATIONALE` · `FURTHER RESEARCH`. **No decision taken
in this audit.**

### R-02 · Transparency-log properties for trust-material distribution
**H9 · §18, §20** — The Technical Registry is a discovery aid, not a trust root, so registry equivocation
is a lower-severity threat than the critique assumes. The stronger question is whether inclusion proofs or
multi-origin publication would address **P1-7** for the Key Manifest and BRL.

### R-03 · Mojaloop, PAPSS, KWiK
**H10 · §21, §29** — Mojaloop's unit of adoption is a deployed hub; BANZA's is a published specification.
Research: which Mojaloop interoperability lessons transfer to a hub-less model, and whether Layer-3
integration profiles for PAPSS/KWiK are worth specifying at L4.

### R-04 · Governance evolution
**§11** — What would move BANZA from transparent-and-formally-participative to demonstrably multi-party,
and at what point in the protocol's life that becomes necessary.

---

## Summary

| Severity | Count |
|---|---|
| P0 | 1 |
| P1 | 8 |
| P2 | 6 |
| Research | 4 |

**Suggested sequencing (not a decision):** P0-1 first, since P1-8, X-01 and the reproducibility claims all
depend on it; then P1-1 and P1-2, which are cheap and change how everything else is read; then P1-4 and
P1-5, which unblock execution-surface interoperability. P1-7 deserves an explicit decision rather than a
silent status quo.

**Not in this backlog:** any change to architecture, profiles, trust model, governance model or the
Whitepaper's claims. The audit found no evidence that any of those is wrong.
