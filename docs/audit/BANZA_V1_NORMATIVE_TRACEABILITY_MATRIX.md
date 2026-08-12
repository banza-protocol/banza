# BANZA v1.0 — Normative Traceability Matrix

> Companion to [`BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md`](BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md).
> Traces each material Whitepaper claim to the normative artifact that would carry it, the implementation,
> the test and the evidence. **No claim is modified and no Whitepaper text is changed by this milestone.**

Status values: `ALINHADO` · `IMPLEMENTADO MAS MAL ESPECIFICADO` (IMES) · `GAP REAL`.
`OUT OF SCOPE BY DESIGN` appears as an explanation, never as a status.

| # | Whitepaper claim | Normative artifact | Implementation | Test | Evidence | Status | Gap | Sev |
|---|---|---|---|---|---|---|---|---|
| 1 | Open, versioned public rules | `contracts/production/protocol-version.json`; `LICENSE`; `NOTICE` | — | — | Public repo; Apache-2.0 §3 | **ALINHADO** | — | — |
| 2 | Requirements live in versioned normative artifacts | *none identified* | — | — | — | **GAP REAL** | Whitepaper names no artifact; no normative index exists | P1 (F-02, F-11) |
| 3 | Explicit versioning; major/minor/patch policy | `protocol-version.json` (`breaking_change_policy`, `wire_compatible_with`) | — | — | — | **ALINHADO** | — | — |
| 4 | No particular implementation constitutes the protocol | `spec/README.md`; `GOVERNANCE.md`; ADR-001/003 | `engines/**` separated | — | — | **ALINHADO** conceptually | 6 contracts self-declare as mirrors of code | P1 (F-04) |
| 5 | Reference implementation realises but does not define | Same as 4 | `engines/banza-*` | — | — | **IMES** | `_source_of_truth` inversion on 5 contracts, all paths absent | P1 (F-04) |
| 6 | Discovery from a canonical origin at a fixed path | `contracts/production/discovery-document.production.schema.json`; ADR-068; ADR-080 | `banza-artifact-fetcher` | SSRF/fetch suite | Negative rosters | **IMES** | Schema self-declared documentary; RFC-0005 Draft | P1 |
| 7 | Canonical origin controlled by the operator; host pinning | `implementation-record.production.schema.json` (ADR-068 §4.7) | `banza-artifact-fetcher` | host-mismatch, userinfo, redirect tests | Executed E4 | **ALINHADO** | — | — |
| 8 | Operator ≠ implementation; result bound to implementation | `operator-record`, `implementation-record` | `banza-target-registry` | engine tests | — | **ALINHADO** | Self-declared documentary mirrors | P2 |
| 9 | Trust Root signs only the Key Manifest | `contracts/federation/key-manifest.json`; ADR-079; INV-ROOT-004 | `banza-trust` | `signing_chain.rs` negatives | Model-A negatives | **ALINHADO** | `_source_of_truth` path absent | P1 (F-04) |
| 10 | Domain-separated delegated keys | `delegated-signing-key`, `root-delegation`; ADR-038 | `banza-trust` | cross-domain rejection test | Executed | **ALINHADO** | — | — |
| 11 | Signatures verifiable by third parties | `signed-protocol-metadata` ("Recalculável por qualquer verificador independente") | `banza-trust::verify_ed25519` | golden vectors | Executed | **GAP REAL** | **Canonical byte form unspecified** | **P0 (F-01)** |
| 12 | Revocation; fail-closed; BRL freshness | `contracts/federation/revocation-list.json` (6 h rule, INV-FEDEVAL-002) | `banza-trust::verify_revocation_list` | authenticated-BRL negatives | Executed | **ALINHADO** on rules | Verification depends on F-01; `_source_of_truth` absent | P0/P1 |
| 13 | Key rotation | INV-ROOT-010 (`FEDERATION_INVARIANTS.md`) | — | — | — | **IMES** | Process explicitly out-of-band; no wire procedure | P1 |
| 14 | L0–L4 cumulative profiles | `protocol-version.json`; `conformance-report`; `certification-record` | readiness engines L1–L4 | engine tests | Executed | **ALINHADO** | L4 profile content not published | P2 |
| 15 | L3 requires multi-operator evidence | `federation-*` contracts; `conformance/federation/suite.json` | `banza-l3-readiness`, `banza-conformance` | 37 fixture cases | A→B executed | **ALINHADO** | — | — |
| 16 | Federation is bounded, local, per-interaction | `federation-trust.json`; `federation-trust-evaluation.production.schema.json` | `evaluate_federation_ote` | 14 OTE tests | Executed | **ALINHADO** | — | — |
| 17 | Technical routing between operators | `contracts/federation/federation-routing.json` | `banza-simb` (simulator) | routing fixtures | Executed | **IMES** | Error taxonomy open; idempotency rule not normative; RFC-0001 Draft | P1 (F-05, F-06) |
| 18 | Deterministic validation | `validation-journey-state-machine.production.json` | Rust engines | journey tests | Executed | **ALINHADO** on states | Determinism *mechanism* unspecified | P0 (F-01) |
| 19 | Fail-closed evaluation | Journey state machine; INV-FEDEVAL-005 | `evaluate_federation_ote` | negatives | Executed | **ALINHADO** | — | — |
| 20 | Evidence bundle; verifiable material | `evidence-bundle.production.schema.json` | `banza-evidence-bundle` | bundle tests | Byte-identical replay | **IMES** | Replay by a *second* implementation blocked by F-01 | P1 (F-07) |
| 21 | Receipts bind result to inputs, digests, reason codes | `journey-receipt`, `operation-receipt` | receipts engine | receipt tests | Executed | **IMES** | `reason_codes` is an open string array | P1 (F-05) |
| 22 | Semantically equivalent verdicts and reason codes | *concept only* | — | — | — | **IMES** | No rule for which fields must match | P1 (F-07) |
| 23 | Reproducibility by third parties | `evidence-bundle`; Whitepaper §2 | replay tooling | determinism tests | Byte-identical ×2 | **IMES** | Reproducible only by the same engine | P1 (F-07) |
| 24 | Secure fetch: HTTPS only, no private/metadata addresses, no redirects, TLS validated, bounded responses | Whitepaper §8; ADR-068 §4.7 | `banza-artifact-fetcher` | full SSRF negative roster | Executed E4 | **ALINHADO** | Rules stated in prose/ADR rather than a fetch contract schema | P2 |
| 25 | Operational independence — no BANZA infra in message/funds path | `GOVERNANCE.md`; contracts contain no runtime BANZA endpoint in the transaction path | A→B direct | A→B executed | Executed | **ALINHADO** | — | — |
| 26 | Trust material availability | `key-manifest.json`, `revocation-list.json` (single canonical origin) | — | — | — | **GAP REAL** | No mirroring/offline distribution specified; fail-closed ⇒ liveness coupling | P1 (F-08) |
| 27 | Protocol ≠ certification ≠ scheme ≠ authorisation | ADR-061/062/063/064-066; `certification-record`; `regulatory-state` | certification engines | boundary guards | CI guards | **ALINHADO** | — | — |
| 28 | Governance evolves rules, does not operate transactions | `GOVERNANCE.md` §9 | — | — | — | **ALINHADO** | — | — |
| 29 | Governance is public and participative | `GOVERNANCE.md`; `decisions/**` | — | — | 76 ADRs public | **IMES** | Active-maintainer record empty; no admission criteria | P2 (F-09) |
| 30 | Implementing does not require prior authorisation | `TRADEMARKS.md` §5; Apache-2.0 | — | — | — | **ALINHADO** | — | — |
| 31 | Independent implementation not yet demonstrated | Whitepaper §11 states this explicitly | — | — | Absence of external impl | **ALINHADO** (claim is correctly hedged) | — | — |
| 32 | BanzAI is transversal and non-authoritative | `GOVERNANCE.md` §10 | `services/banzai-api` | guards | CI guards | **ALINHADO** | — | — |

## Summary

| Status | Count |
|---|---|
| ALINHADO | 17 |
| IMPLEMENTADO MAS MAL ESPECIFICADO | 12 |
| GAP REAL | 3 |

No material claim is left unclassified. The three `GAP REAL` entries are claims 2 (no pointer to the
normative surface), 11 (independent signature verification) and 26 (trust-material availability); claim 11
is the audit's single **P0**.
