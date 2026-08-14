# BANZA — Public Technical Claims: Evidence Map

> **This is an evidence map, not marketing.** For each material public technical claim of BANZA it
> records the chain **CLAIM → NORMATIVE BASIS → IMPLEMENTATION → TEST → EVIDENCE → RESULT** and a
> status. The machine-readable matrix is [`evidence/claims/claims-matrix.json`](../../evidence/claims/claims-matrix.json);
> the executed-evidence bundle is under [`evidence/`](../../evidence/) with a hashed
> [`manifest.json`](../../evidence/manifest.json) pinned to a git commit.

## Principle

**No public technical claim may be stronger than the implementation and the evidence that sustain it.**
A claim is PROVEN only when the exact wording is carried by a normative basis, a concrete implementation,
an executed test (positive **and**, for security/trust/fail-closed claims, negative), and evidence a
skeptical third party could reproduce.

Status vocabulary: `PROVEN` · `PARTIALLY_PROVEN` · `IMPLEMENTED_BUT_UNTESTED` · `TESTED_BUT_NOT_LIVE` ·
`DOCUMENTED_ONLY` · `NOT_IMPLEMENTED` · `CONTRADICTED` · `NOT_APPLICABLE`.
Evidence strength: `E0` documented · `E1` static contract · `E2` unit · `E3` integration · `E4` e2e ·
`E5` live-verified · `E6` independently reproducible.

## Scope

The evidence demonstrates only the technical scope actually tested, in the **reference implementation /
pre-production** state. It is **not** generalised to production, performance, scale, regulation or
adoption. This matches the whitepaper's own Limitations and State chapters.

## How to regenerate

```bash
make public-claims-evidence     # runs the executable evidence battery + rebuilds the bundle manifest
```

The bundle is only valid from a **clean working tree** at the pinned commit. The manifest records the
commit, engine versions, protocol version, the executed commands, and a SHA-256 of every evidence file.

## Executed evidence (this commit)

| Surface | Result | File |
|---|---|---|
| Rust engine tests (evidence-relevant engines) | 480 passed · 0 failed | `evidence/test-results/rust-engine-tests.txt` |
| Conformance vectors (offline) | 61 vectors · 5 invariant checks · ok | `evidence/test-results/conformance-vectors.json` |
| Federation runner (banza-trust, in-process) | 7/7 pass · INV-FEDEVAL-005 fail-closed | `evidence/federation/federation-run.json` |
| Committed federation fixtures executed as vectors (Track C) | 37/37 fixture-backed cases · 0 mismatch · 0 drift | `evidence/federation/federation-fixtures-run.json` |
| Federation OTE — ROUTING_ALLOWED path (Track A+B) | 10/10 conjunctive checks pass · authenticated BRL | `evidence/federation/federation-ote-routing-allowed.json` |
| A→B multi-operator scenario, end-to-end (Track D) | mutual ROUTING_ALLOWED · negatives fail-closed · byte-identical replay | `evidence/federation/federation-ab-scenario.json` |
| Secure-fetch / SSRF negative e2e | full negative roster (DNS-rebind, cloud-metadata, redirect, TLS, size, host-mismatch, HTTPS-only, loopback) | `evidence/security/negative-test-rosters.md` |
| Trust Model-A negatives | non-root-signs-manifest REJECT · root-signed-BRL REJECT · cross-domain REJECT | `evidence/security/negative-test-rosters.md` |
| Operator Zero e2e | tamper→fail · revocation→fail-closed · demo-root≠trust-root · zero private keys | `evidence/security/negative-test-rosters.md` |
| Determinism replay | OZ evidence bundle byte-identical across two independent generator runs | `evidence/determinism/oz-evidence-replay.txt` |
| Live current state | `/operators []` · `production_certificates false` · revocation `count 0` | `evidence/test-results/live-current-state.txt` |
| banzai-api / website tests | 483/483 · 507/507 | (test-results) |

A/B multi-operator scenario coverage (Figure 7, AB-01..AB-10) is mapped in
[`evidence/federation/ab-scenario-coverage.md`](../../evidence/federation/ab-scenario-coverage.md).

## Claim summary (this commit)

- **111 claims** classified (100 %; no unreviewed claim). **103 load-bearing.**
- Prior gate: 75 PROVEN. **After closing the four federation/evidence gaps this milestone: 80 PROVEN**, 25 PARTIALLY_PROVEN, 4 IMPLEMENTED_BUT_UNTESTED, 1 DOCUMENTED_ONLY, 1 TESTED_BUT_NOT_LIVE.
- Upgraded this milestone: CLAIM-H-002 (OTE 10/10 + ROUTING_ALLOWED), CLAIM-H-008 (federation fixtures executed), CLAIM-D-013 (executable negative vectors), CLAIM-H-007 (A→B executed end-to-end), CLAIM-H-006 (two distinct operators executed) — each from PARTIALLY_PROVEN/DOCUMENTED_ONLY to PROVEN with new executed evidence.
- 0 NOT_IMPLEMENTED · 0 unresolved CONTRADICTED.

The PARTIALLY_PROVEN / UNTESTED load-bearing claims are **implemented and tested at the engine level
(E2/E3)**; their residual gap is coverage (a live-E5 confirmation, an in-engine repeated-evaluation test,
or the committed-fixture executor), never a missing implementation. Precise per-claim detail is in the
machine matrix.

## Known coverage gaps (tracked, not hidden)

1. ~~Federation committed fixtures not executed as vectors.~~ **CLOSED this milestone (Track C):**
   `engines/banza-conformance/src/federation_fixtures.rs` executes all 37 fixture-backed cases of
   `conformance/federation/suite.json` against the committed fixtures (0 mismatch, 0 drift), CI-gated via
   `make conformance-fed-fixtures-check`.
2. **A few load-bearing claims lack live-E5 confirmation** of the deployed endpoints beyond the current
   pre-production live state already captured. (Unchanged — deployment-time, not an implementation gap.)
3. ~~Determinism/reproducibility only via evidence-bundle replay.~~ **STRENGTHENED (Track D):** the A→B
   scenario runs twice from scratch and asserts a byte-identical result with a stable SHA-256 (E6-grade
   in-engine reproducibility), in addition to the evidence-bundle replay.
4. **Production trust root not yet instantiated** (M2 ceremony). The authenticated-revocation path (GAP-1)
   and the full OTE are proven on deterministic TEST material; production-root instantiation is a separate,
   deliberately-scoped milestone item and is NOT a claim of this gate.

## Whitepaper wording notes (proposals only — never silent edits)

Per the canonical-source governance ([`docs/whitepaper/BUILD.md`](../whitepaper/BUILD.md)), any whitepaper
change must start in the Overleaf PT edition. Two optional precision refinements were identified (neither
is a false or load-bearing overclaim; both are defensible as written):

- §6 «cada passo … recebe um de quatro estados» — all four states are real; `BLOCKED` is an orchestration
  state (fetch-failure/aggregation) rather than an engine verdict. Optional clarification.
- §6 «todos os passos técnicos estão verificados» — readiness is correctly **profile-scoped** in the
  engine (ADR-030 applicability); the prose could add «aplicáveis ao perfil declarado». Optional precision.

No website copy required a change (no website surface presents an unsupported technical claim).


## Decision matrix (§195)

| Decision | Count |
|---|---|
| KEEP (impl+tested; coverage gap) | 24 |
| KEEP AS FACT | 80 |
| MARK AS SPEC/DESIGN (not yet executed) | 0 |
| QUALIFY (precision/optional) | 5 |

- Load-bearing claims: 103 · PROVEN 75 · remainder implemented+tested at engine level (E2/E3/E4) with documented, deployment-time coverage gaps.
- The four gaps behind the prior CONDITIONAL GO are closed with executed evidence (federation OTE 10/10 + authenticated BRL, 37 fixtures as vectors, A→B end-to-end + byte-identical replay). No public wording was strengthened; the classification of already-PROVEN claims is unchanged. **Zero claims are "not implemented".**
- No public wording is overstated beyond its stated pre-production scope: the whitepaper is appropriately hedged (§10/§12 scope+defer reproducibility and performance); the Reference §8/§10 faithfully describes the ADR-025 OTE **specification** (pre-production-scoped). Two OPTIONAL Overleaf precision proposals recorded (readiness profile-scoping); no website copy required change.

## Remediations — all four closed this milestone

1. **Authenticated BRL in the OTE (GAP-1) — RESOLVED.** `evaluate_federation_ote`'s `not_revoked` check now
   verifies a revocation-domain-signed BANZA Revocation List (`verify_revocation_list`) and checks
   membership, fail-closed on missing/invalid BRL; it never trusts a self-published `revoked` flag. Tests:
   `federation_ote.rs` wrong-key / expired / listed-operator negatives.
2. **The two missing OTE checks + the outcome enum (GAP-2) — RESOLVED.** `capabilities_compatible` +
   `endpoint_contract_compatible` implemented; the OTE now does 10 of 10 checks and emits
   `ROUTING_ALLOWED` / `FAIL_CLOSED`. 14 positive+negative tests.
3. **Execute the committed federation fixtures (GAP-3) — RESOLVED.** `run_fed_fixtures` executes 37
   fixture-backed cases (incl. the negative vectors) against the committed fixtures; 0 drift; CI-gated. One
   fixture inconsistency found and corrected (FED-SPM-009).
4. **A→B multi-operator scenario + independent replay (GAP-4) — RESOLVED.** `run_ab_scenario` executes two
   cryptographically distinct operators through mutual OTE (ROUTING_ALLOWED), a routed payment (atomic +
   idempotent), negatives fail-closed, and byte-identical independent replay (stable SHA-256).

## Release recommendation

**GO — scope: pre-production reference implementation.**

Every material public technical claim is classified (100 %); no load-bearing claim is unsupported or
NOT_IMPLEMENTED. The four completeness gaps that produced the prior CONDITIONAL GO are **closed and
executed**: the federation OTE now performs all ten ADR-025 checks and emits `ROUTING_ALLOWED` /
`FAIL_CLOSED` with an **authenticated** BANZA Revocation List (never a self-published flag); the 37
committed federation fixtures run as vectors under CI with zero drift; and a consolidated A→B scenario
between two cryptographically distinct operators executes end-to-end — mutual `ROUTING_ALLOWED`, an atomic
idempotent routed payment, every negative fail-closed, and **byte-identical independent replay** (stable
SHA-256, E6 reproducibility). The load-bearing security/trust/validation/evidence claims are implemented
and tested (SSRF E4, Trust Model-A E3, Operator Zero tamper/revocation E4, federation OTE E3, A→B E4/E6),
and the public copy states nothing beyond its pre-production scope.

The GO is bounded to the **pre-production reference implementation**. It is explicitly **not** a claim of a
production-complete, live multi-origin federation network, and it does **not** depend on the production
trust root (M2 root-key ceremony), which remains a separate, deliberately-scoped milestone. "Distinct
operators" here means distinct identity/keys/material/ledger under one shared open-protocol verification
engine — operators do not reimplement verification.
