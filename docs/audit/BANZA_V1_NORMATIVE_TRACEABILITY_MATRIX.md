# BANZA v1.0 — Normative Traceability Matrix

> Companion to [`BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md`](BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md)
> and to [`BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md`](BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md).
> Traces each material Whitepaper claim to the normative artifact that carries it, the implementation,
> the test and the evidence.
>
> **Revision 2 — post-remediation.** The claim column is unchanged: **no Whitepaper text was modified by
> either milestone**, and none was read as needing modification. What changed is the *artifact* and *status*
> columns, where a normative artifact now exists that did not before. Rows whose status did not change are
> stated as they were, so that this file remains readable as a delta.

Status values: `ALINHADO` · `IMPLEMENTADO MAS MAL ESPECIFICADO` (IMES) · `GAP REAL`.
`OUT OF SCOPE BY DESIGN` appears as an explanation, never as a status.
`Δ` marks a row whose status changed under remediation.

| # | Whitepaper claim | Normative artifact | Implementation | Test | Evidence | Status | Gap | Sev |
|---|---|---|---|---|---|---|---|---|
| 1 | Open, versioned public rules | `contracts/production/protocol-version.json`; `LICENSE`; `NOTICE` | — | — | Public repo; Apache-2.0 §3 | **ALINHADO** | — | — |
| 2 Δ | Requirements live in versioned normative artifacts | **`contracts/production/normative-manifest.json`** — 138 artifacts (82 required), SHA-256, `class`+`tier`, precedence, exclusions | — | `check-normative-surface-integrity.sh` | Guard in CI (`banza-trust`) | **ALINHADO** *(was GAP REAL)* | Whitepaper still does not cite the manifest — F-11, deferred by milestone §46 | P2 |
| 3 | Explicit versioning; major/minor/patch policy | `protocol-version.json` (`breaking_change_policy`, `wire_compatible_with`) | — | — | ADR-081 | **ALINHADO** | — | — |
| 4 Δ | No particular implementation constitutes the protocol | `spec/README.md`; `GOVERNANCE.md`; ADR-001/003; manifest `not_normative` lists `engines/**` | `engines/**` separated | integrity guard | 0 contracts point at code | **ALINHADO** | — | — |
| 5 Δ | Reference implementation realises but does not define | Same as 4; `spec/canonicalization.md` header states the engine implements it | `engines/banza-*` | `canonicalization_vectors.rs` | Two independent implementations agree on 24 vectors | **ALINHADO** *(was IMES)* | — | — |
| 6 | Discovery from a canonical origin at a fixed path | `discovery-document.production.schema.json`; ADR-068; ADR-080 | `banza-artifact-fetcher` | SSRF/fetch suite | Negative rosters | **IMES** | Schema self-declared documentary; RFC-0005 Draft | P1 |
| 7 | Canonical origin controlled by the operator; host pinning | `implementation-record.production.schema.json` (ADR-068 §4.7) | `banza-artifact-fetcher` | host-mismatch, userinfo, redirect tests | Executed E4 | **ALINHADO** | — | — |
| 8 Δ | Operator ≠ implementation; result bound to implementation | `operator-record`, `implementation-record` (both now in the manifest, self-sourced) | `banza-target-registry` | engine tests | — | **ALINHADO** | — | — |
| 9 Δ | Trust Root signs only the Key Manifest | `contracts/federation/key-manifest.json` (`_source_of_truth` corrected); ADR-079; INV-ROOT-004 | `banza-trust` | `signing_chain.rs` negatives | Model-A negatives | **ALINHADO** | — | — |
| 10 | Domain-separated delegated keys | `delegated-signing-key`, `root-delegation`; ADR-038 | `banza-trust` | cross-domain rejection test | Executed | **ALINHADO** | — | — |
| **11 Δ** | **Signatures verifiable by third parties** | **`spec/canonicalization.md` (`BCJ/1`) §4 signed bytes; ADR-082** | `banza-trust::canonical` | `canonicalization_vectors.rs` (24 vectors), `canonical_profile_closure.rs`, `canonical_migration.rs`, trust vectors | Independent implementation reproduces every vector byte-for-byte; prior signatures verify unchanged | **ALINHADO** *(was **GAP REAL / P0**)* | — | — |
| 12 Δ | Revocation; fail-closed; BRL freshness | `contracts/federation/revocation-list.json` (6 h rule, INV-FEDEVAL-002; `_source_of_truth` corrected) | `banza-trust::verify_revocation_list` | authenticated-BRL negatives | Executed | **ALINHADO** | Availability of the single origin remains F-08 (claim 26) | — |
| 13 | Key rotation | INV-ROOT-010 (`FEDERATION_INVARIANTS.md`) | — | — | — | **IMES** | Process explicitly out-of-band; no wire procedure | P1 |
| 14 | L0–L4 cumulative profiles | `protocol-version.json`; `conformance-report`; `certification-record` | readiness engines L1–L4 | engine tests | Executed | **ALINHADO** | L4 profile content not published | P2 |
| 15 | L3 requires multi-operator evidence | `federation-*` contracts; `conformance/federation/suite.json` | `banza-l3-readiness`, `banza-conformance` | 37 fixture cases | A→B executed | **ALINHADO** | — | — |
| 16 | Federation is bounded, local, per-interaction | `federation-trust.json`; `federation-trust-evaluation.production.schema.json` | `evaluate_federation_ote` | 14 OTE tests | Executed | **ALINHADO** | — | — |
| 17 Δ | Technical routing between operators | `contracts/federation/federation-routing.json` + **`spec/federation/FEDERATION_CONTRACT_SURFACE.md`** (now in the manifest) | `banza-simb` (simulator) | routing fixtures | Executed | **IMES** | Error taxonomy open; idempotency published but incomplete (retention, key scope); RFC-0001 Draft cited in `_authority` but not depended on | P1 (F-05, F-06) |
| 18 Δ | Deterministic validation | `validation-journey-state-machine.production.json` + **`spec/canonicalization.md`** for the byte-level mechanism | Rust engines | journey tests + vectors | Executed | **ALINHADO** *(was ALINHADO on states / P0 on mechanism)* | Determinism of *ordering* within a journey remains engine-defined | P2 |
| 19 | Fail-closed evaluation | Journey state machine; INV-FEDEVAL-005 | `evaluate_federation_ote` | negatives | Executed | **ALINHADO** | — | — |
| 20 Δ | Evidence bundle; verifiable material | `evidence-bundle.production.schema.json`; digest rule now in `spec/canonicalization.md` §5 | `banza-evidence-bundle` | bundle tests | Byte-identical replay | **IMES** | A second implementation can now recompute the *digests*; whether two bundles are *semantically* equal still has no rule | P1 (F-07, partially resolved) |
| 21 | Receipts bind result to inputs, digests, reason codes | `journey-receipt`, `operation-receipt` | receipts engine | receipt tests | Executed | **IMES** | `reason_codes` is an open string array | P1 (F-05) |
| 22 | Semantically equivalent verdicts and reason codes | *concept only* | — | — | — | **IMES** | No rule for which fields must match; blocked on F-05 | P1 (F-07) |
| 23 Δ | Reproducibility by third parties | `spec/canonicalization.md`; `evidence-bundle` | replay tooling | determinism tests; cross-implementation vectors | Byte-identical ×2; independent implementation agrees | **IMES** | Bytes and digests are now reproducible without the Rust; full bundle replay by a second implementation is untested because no second implementation exists | P1 (F-07) |
| 24 | Secure fetch: HTTPS only, no private/metadata addresses, no redirects, TLS validated, bounded responses | Whitepaper §8; ADR-068 §4.7 | `banza-artifact-fetcher` | full SSRF negative roster | Executed E4 | **ALINHADO** | Rules stated in prose/ADR rather than a fetch contract schema | P2 |
| 25 | Operational independence — no BANZA infra in message/funds path | `GOVERNANCE.md`; contracts contain no runtime BANZA endpoint in the transaction path | A→B direct | A→B executed | Executed | **ALINHADO** | — | — |
| 26 | Trust material availability | `key-manifest.json`, `revocation-list.json` (single canonical origin) | — | — | — | **GAP REAL** | No mirroring/offline distribution specified; fail-closed ⇒ liveness coupling | P1 (F-08, deferred with rationale) |
| 27 | Protocol ≠ certification ≠ scheme ≠ authorisation | ADR-061/062/063/064-066; `certification-record`; `regulatory-state` | certification engines | boundary guards | CI guards | **ALINHADO** | — | — |
| 28 | Governance evolves rules, does not operate transactions | `GOVERNANCE.md` §9 | — | — | — | **ALINHADO** | — | — |
| 29 | Governance is public and participative | `GOVERNANCE.md`; `decisions/**` | — | — | 77 ADRs public | **IMES** | Active-maintainer record empty; no admission criteria | P2 (F-09) |
| 30 | Implementing does not require prior authorisation | `TRADEMARKS.md` §5; Apache-2.0 | — | — | — | **ALINHADO** | — | — |
| 31 | Independent implementation not yet demonstrated | Whitepaper §11 states this explicitly | — | — | Absence of external impl | **ALINHADO** (claim is correctly hedged) | — | — |
| 32 | BanzAI is transversal and non-authoritative | `GOVERNANCE.md` §10 | `services/banzai-api` | guards | CI guards | **ALINHADO** | — | — |

## Summary

| Status | Audit (rev 1) | Post-remediation (rev 2) | Δ |
|---|---|---|---|
| ALINHADO | 17 | **23** | +6 |
| IMPLEMENTADO MAS MAL ESPECIFICADO | 12 | **8** | −4 |
| GAP REAL | 3 | **1** | −2 |

No material claim is left unclassified.

**The single `GAP REAL` remaining is claim 26** — availability of trust material from a single canonical
origin (F-08). It is an architectural decision, deferred with rationale, not a documentation gap.

**Claim 11 — the audit's only P0 — is closed.** It moved from `GAP REAL` to `ALINHADO` because the byte
form a third party must reproduce is now published text with public vectors, and because an implementation
written from that text, sharing no code with the engine, reproduces every vector exactly.

The remaining `IMES` rows cluster on two subjects: the **reason-code vocabulary** (rows 17, 21, 22, and by
dependency 20 and 23) and **rotation/discovery drafts** (rows 6, 13). The first is F-05/F-07 and is the
substance of the next milestone; the second predates this milestone and is unchanged by it.

## What this matrix does not assert

- It does not assert that a second full implementation of BANZA exists. It asserts that a second
  implementation of **`BCJ/1`** exists and agrees, which is the narrower claim the evidence supports.
- It does not assert that any status improved for a reason other than a published artifact. Rows 6, 13, 17,
  21, 22, 24, 26 and 29 are unchanged, because nothing in this milestone changed them.
