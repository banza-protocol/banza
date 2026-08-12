# Operador Zero Parity — M2.19G.1 (ADR-068 §4.9)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 §4.9 · **Related:** ADR-067 (Operador Zero)
- **Date:** 2026-07-30

## 1. Decision

Operador Zero is the initial canonical example, but it receives **no shortcut, official fixture,
pre-computed result or bypass** (ADR-068 §4.9). It exists in the Technical Registry with an operator
record and an implementation record, publishes its endpoints at its canonical origin
(`zero.banza.network`), and is validated through the **same** secure fetch + Rust engines as any future
implementation, producing real receipts bound to its endpoints.

## 2. What was bypassed before (audit)

`registry-operator-zero-inputs-audit.json` documented three Operador Zero bypasses in the old flow:

1. `artifacts_base` (`https://zero.banza.network`) was **declared but never fetched** — the journey read
   bundled `readArtifact()` constants instead.
2. `runKeys`/`runTrust` substituted Rust trust **fixtures** for the operator's published key material
   (LI-03, LI-06).
3. `runCertification` **hardcoded** `NOT_CERTIFIED`/`demo_only` regardless of step verdicts (LI-09).

The audit also found four endpoints the endpoint-originated journey needs were **missing (404)**:
`/discovery.json`, `/capabilities.json`, `/signed-metadata.json`, `/federation-manifest.json`.

## 3. Parity established — same path, no bypass

Operador Zero is now a registry entry and is validated through the identical pipeline:

- **Same registry.** `production_registry()` holds `operator-zero` + `operator-zero-ref-impl`
  (`engines/banza-target-registry/src/registry.rs`); resolution applies the same 15 eligibility rules.
- **Same secure fetch.** Its artifacts are fetched from `zero.banza.network` by the same
  `banza-artifact-fetcher` under the same SSRF policy — no shortcut path, no local read
  (`SECURE_ARTIFACT_FETCHER_REPORT.md` §9: "Operador Zero is validated through the same secure fetch as
  any implementation, with no shortcut or fixture").
- **Same engines.** The fetched content feeds the same no-network Rust decision engines; the trust/L2/L3
  steps use fetched content, not fixtures.
- **Same verdict authority.** Step statuses come from `verdict.rs`; certification readiness is the Rust
  aggregate, not a hardcoded literal.
- **Same receipts.** Real origin-bound `OperationReceipt`s + a `JourneyReceipt`, with
  `certification_status = NOT_CERTIFIED` (honest for a demo, but now **derived**, not asserted).

## 4. The 14 published endpoints

Operador Zero now publishes the **14** canonical endpoints of the reference implementation. The served
surface (`website/lib/operadorZero.ts :: ARTIFACT_ROUTES`, 14 routes) matches the registry's
`Endpoints::reference()` set:

| # | Endpoint | Status pre-M2.19G.1 |
|---|----------|---------------------|
| 1 | `/discovery.json` | **NEW** (was 404) |
| 2 | `/manifest.json` | served |
| 3 | `/key-manifest.json` | served |
| 4 | `/signed-metadata.json` | **NEW** (was 404) |
| 5 | `/capabilities.json` | **NEW** (was 404) |
| 6 | `/conformance/evidence.json` | served |
| 7 | `/revocation-list.json` | served |
| 8 | `/federation/metadata.json` | served |
| 9 | `/federation-manifest.json` | **NEW** (was 404) |
| 10 | `/evidence-bundle.json` | served |
| 11 | `/traces/full-e2e.json` | served |
| 12 | `/ledger/demo.json` | served |
| 13 | `/payments/demo-qr.json` | served |
| 14 | `/payments/demo-refund.json` | served |

The **four new** canonical example artifacts were added under `examples/operators/zero/`:
`discovery/discovery.json`, `capabilities/capabilities.json`, `metadata/signed-metadata.json`,
`federation/federation-metadata.json`.

- `discovery.json` declares the operator/implementation identity, `canonical_origin`, protocol version,
  environment/profile, and the endpoint map — the entry document verified at step 1.
- `signed-metadata.json` is signed by the demo E2E root (`demo_operator_root`, explicitly
  `not_protocol_trust_root: true`) — Ed25519 signature over the canonical payload; it backs the
  keys/trust steps in place of the retired fixture.

Every artifact is marked `demo_only: true`, `monetary_value: false`, `production_allowed: false` and
carries the "não certifica, não aprova e não movimenta dinheiro real" note.

## 5. Wiring kept in sync

- `website/lib/operadorZero.ts :: ARTIFACT_ROUTES` — the 4 new route entries.
- `website/lib/zeroSubdomain.ts :: ZERO_ENDPOINTS` — synced with the routes (kept in sync by
  `check-zero-subdomain-routing.sh`).
- `tools/gen-operador-zero-artifacts.mjs` — the 4 new route→file mappings; the generated
  `operadorZeroArtifacts.generated.ts` was regenerated (`make operator-zero-check` fails on drift).
- `examples/operators/zero/manifest/…` and the discovery document declare the new endpoint URLs.

## 6. Operador Zero stays a demonstration reference

Parity does **not** promote Operador Zero to a real or published operator. It remains a passive,
machine-verifiable **reference implementation** (ADR-052/053/067), demo-only, never a scheme participant
and never a real-money path, not counted in metrics. It is simply validated **honestly** — through the
same endpoint-originated path as anyone else.

## 7. Guard & evidence coverage

- `banzai-operator-zero-parity-check` — OZ uses the same registry/endpoint/engine path as any
  implementation (§4.9).
- `banzai-operator-zero-no-bypass-check` — no OZ shortcut/fixture/precomputed verdict/bypass in the served
  validate path (§4.9).
- `banzai-operator-zero-public-e2e-check` — soft-pends if the live E2E evidence artifact is absent,
  hard-checks it if present (9 receipts + 1 journey, real endpoints/hashes, NOT_CERTIFIED).
- Realigned: `check-operator-zero-full-e2e.sh`, `check-operator-zero-realistic-journey.sh`,
  `check-banzai-operator-zero-only-ui.sh`, `check-zero-subdomain-routing.sh`.
- Live evidence is captured post-deploy in `docs/reports/OPERATOR_ZERO_PUBLIC_E2E_REPORT.md` (pending the
  live run — see that report).
