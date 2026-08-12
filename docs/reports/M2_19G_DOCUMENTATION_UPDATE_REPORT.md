# M2.19G.1 Documentation & Grounding Update — Endpoint-Originated Validation

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068
- **Date:** 2026-07-30

## 1. Scope

This report records the documentation, contract, website-mirror and BanzAI-grounding updates that landed
with M2.19G.1, so the endpoint-originated model exists **first** in the protocol repo (contracts + ADR),
then in docs, then in the interface, per the protocol-first rule (ADR-005).

## 2. ADR

- `decisions/adr/ADR-068-endpoint-originated-operator-validation-and-operator-implementation-model.md` —
  the governing ADR (Accepted). Defines the core rule, the operator–implementation model, §4.1–§4.10 and
  the Consequences.
- Website mirror: `website/content/decisions/…ADR-068…model.md` (the /decisoes surface).
- `engines/banza-repo-guards/src/lib.rs` ADR range bumped to `1..=68` (gaps at 004/022/026/027/032 remain
  intentional).

## 3. Contracts (protocol-first artifacts)

- `contracts/openapi/operator-validation.yaml` — the request/response surface for `/validate/step` and
  `/validate/journey`, the artifact/record schemas, the model narrative and the authority boundary
  ("Rust decides every verdict; Qwen only explains; TypeScript never decides"; `qwen_calls` /
  `external_model_calls` always 0).
- `contracts/production/` — six documentary production schemas: `operator-record`,
  `implementation-record`, `discovery-document`, `capabilities-document`, `operation-receipt`,
  `journey-receipt`.
- `contracts/README.md` — indexes the new operator-validation contract set.

These document shapes only; they add no new financial invariant.

## 4. Security & threat model

- `docs/security/THREAT_MODEL.md` — new section **"M2.19G.1 — Endpoint-originated validation threats
  (§36)"**: 20 threat/mitigation rows across four control surfaces (fetcher policy, closed registry,
  receipts, Rust authority) and four appended trust boundaries. The prior sections (actors, assets, BX2.x,
  M2.19C three-layer) are unchanged. See `BANZAI_SECURITY_REPORT.md` for the mapping.
- `docs/reports/SECURE_ARTIFACT_FETCHER_REPORT.md` — the fetcher component report (already present;
  referenced, not duplicated).
- `docs/reports/BANZAI_OPERATOR_VALIDATION_UX_AUDIT.md` — the read-only pre-rebuild UX audit
  (already present).

## 5. BanzAI operator-facing docs

- `docs/banzai/OPERATOR_JOURNEY.md` and `docs/banzai/README.md` — updated to the endpoint-originated,
  "Validar operador" journey (operator→implementation selection; fetch from public endpoints; receipts).
- `services/banzai-api/README.md` — documents the `/validate/step` + `/validate/journey` routes and the
  `FETCHER_URL` → `banza-fetcher` transport.
- Engine READMEs: `engines/banza-artifact-fetcher/README.md` (contract + SSRF policy + compose proposal),
  `engines/banza-target-registry/README.md` (resolution + eligibility contract).

## 6. Website reference & public pages

The M2.19G three-layer public surface was **preserved** while the touched pages absorbed the new model
(see `M2_19G_SEMANTIC_REGRESSION_REPORT.md`): `website/content/BANZA_REFERENCIA.md` and the reference
index (`website/lib/reference.ts`), plus `o-que-e`, `banzai`, `registo-tecnico`, `operadores`,
`certificacao`, `confianca`, `estado`, `glossario` pages absorbed endpoint-originated / operator–
implementation vocabulary without reintroducing any retired framing.

## 7. BanzAI grounding (corpus + vocabulary + WASM)

- Corpus reindexed to **669 chunks** including ADR-068 and the new docs
  (`engines/banzai-query-core/src/doc-index.json`); the `banzai-api` knowledge WASM
  (`services/banzai-api/src/rustkb/banzai_api_kb_bg.wasm`) rebuilt to embed the new index.
- Canonical protocol vocabulary regenerated (`artifacts/m2-18b7/canonical-protocol-vocabulary*.json`,
  terminology candidates, subject registry) to cover the operator–implementation and endpoint-originated
  terms.
- Validation-engine WASM vendored for the backend under
  `services/banzai-api/src/validatewasm/` (one CJS package per crate: `banza_target_registry`,
  `banza_operator_manifest`, `banza_trust`, `banza_conformance`, `banza_l2_readiness`,
  `banza_l3_readiness`, `banza_evidence_bundle`).

## 8. CI

- `.github/workflows/rust-engines.yml` — new jobs for `banza-artifact-fetcher` and
  `banza-target-registry` (`cargo fmt --check`, `clippy --all-targets -D warnings`, `cargo test`).
- `.github/workflows/identity-guard.yml` — updated to run the M2.19G.1 guard suite (28 new guards).
- `Makefile` — the 28 new guard targets + realigned targets wired into the guard battery (ADR-068 §37).

## 9. Report set (§42)

This documentation update is accompanied by the §42 report set under `docs/reports/`:
`OPERATOR_IMPLEMENTATION_DOMAIN_MODEL_REPORT`, `ENDPOINT_ORIGINATED_VALIDATION_ARCHITECTURE_REPORT`,
`DRAFT_VALIDATION_ISOLATION_REPORT`, `BANZAI_NAVIGATION_SIMPLIFICATION_REPORT`,
`BANZAI_RESULTS_CONSOLIDATION_REPORT`, `OPERATION_RECEIPT_ORIGIN_BINDING_REPORT`,
`TECHNICAL_REGISTRY_TARGET_RESOLUTION_REPORT`, `OPERATOR_ZERO_PARITY_REPORT`,
`M2_19G_SEMANTIC_REGRESSION_REPORT`, `BANZAI_SECURITY_REPORT`,
`BANZAI_ACCESSIBILITY_AND_MOBILE_REPORT`, `M2_19G1_PRODUCTION_VALIDATION_REPORT` (primary), plus the
pre-existing `SECURE_ARTIFACT_FETCHER_REPORT` and `BANZAI_OPERATOR_VALIDATION_UX_AUDIT`, and the
`OPERATOR_ZERO_PUBLIC_E2E_REPORT` placeholder.
