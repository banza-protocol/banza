# BANZA / BanzAI — Phase BX1.9: L3 Federation Readiness

**Date:** 2026-07-16
**Branch:** `feat/bx1-9-banzai-l3-federation-readiness-2026-07`
**Scope:** Prepare the BanzAI Workbench for **L3 technical validation in local/demo mode** — federation
between two simulated BANZA operators — without real operators, without external calls by default, without
production and without real funds. New Rust/WASM engine validating a federation pair, a federation intent,
a cross-operator trace linkage, trust & BRL material (fail-closed) and a federation settlement obligation,
aggregated over the Operator Manifest, SimB, Conformidade L0, L1 and L2 readiness reports.
**Central rule:** L3 Readiness é preparação técnica de federação. **Não é federação activa, não é
produção, não é certificação, não é aprovação, não cria operador e não move fundos.**

## Contract (Part 1 & 2)

Canonical federation shapes drive the fixtures (no invented fields):
- **BanzaRevocationList (BRL)** — `contracts/federation/revocation-list.json` (ADR-026/ADR-027):
  `issuer: "BANZA"`, `issuer_key_id`, `revoked[]` (`{operator_id, reason, permanent, since}`),
  `signature`. Fail-closed: a revoked operator blocks routing (INV-FEDEVAL-002).
- **Operator certificate** — `contracts/federation/operator-certificate.json`: `operator_id`,
  `certification_level`, `public_key`, `issuer`, `issuer_key_id`, `signature`.
- **Federation obligation / routing / event** — `contracts/federation/*`: `from_operator_id`/
  `to_operator_id`/`amount.minor` (obligation), `routing_request_id`/`trace_id`/`amount.minor` (routing),
  `trace_id`/`correlation_id` (event).

## Architecture decision (Part 3)

**New crate `engines/banza-l3-readiness`** (`rlib`+`cdylib`, `wasm` feature; deps serde/serde_json/sha2 —
NO engine deps). It reads the upstream reports' status fields AND validates the federation artifacts,
computing the L3 status/readiness, the federation / cross-operator-trace / trust / BRL / settlement checks
and SHA-256 hashes **entirely in Rust**. Local, no network. Kept a separate single-responsibility crate;
reused by `banza-evidence-bundle` (demo builds a real L3 report).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **`banza-l3-readiness`** — `validate_l3` (status + readiness + federation/cross-trace/trust/BRL/settlement checks + SHA-256 hashes, **all in Rust**), `demo_fixtures`, `schema`, `tool_version`. Local, no network; operator federation-URL validation `disabled`. BRL fail-closed. 11 tests. CI job added. |
| Engine (Rust) | `banza-evidence-bundle` accepts `l3_readiness` (recommended artifact) + `l3_readiness_summary`; demo includes a real L3 report. `banzai-evidence` gains the `l3_readiness` intent + `l3` citation. |
| WASM | `banza_l3_readiness*` (only `l3_readiness_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaL3Readiness.ts` — load+marshal only; `l3StatusTone` render-only. |
| UI | Conformidade → `Preparação L3 · federação` (11-item checklist, fixture selector, Validar/Usar-estado-actual, per-artifact summaries incl. BRL revoked operators, report); Programadores → `Federação L3` (operator A/B structure + disabled real-federation endpoint); Evidence Bundle → `L3 readiness report`. |
| Docs | `PHASE_BX1_9_…md` + `L3_READINESS.md`. |

### WASM exports

```
l3_readiness_validate_json, l3_readiness_demo_fixtures_json,
l3_readiness_schema_json, l3_readiness_tool_version_json
```

### Report envelope

`status`, `readiness`, `required_artifacts`, `recommended_artifacts`, `missing_artifacts`,
`invalid_artifacts`, `federation_summary`, `cross_operator_trace_summary`, `trust_summary`,
`brl_summary`, `settlement_summary`, `evidence_summary`, `warnings`, `next_steps`,
`operator_url_validation: "disabled"`, `report_id`, `l3_report_hash`, `boundary`, `tool`, `tool_version`,
`not_active_federation: true`, `not_a_payment: true`, `not_a_certificate: true`, `not_an_approval: true`,
`does_not_move_funds: true`, `does_not_create_operator: true`, `requires_banza_ca_review: true`,
`test_only: true`, `llm_calls: 0`, `external_model_called: false`.

### Status values (Rust, precedence order)

`L3_INVALID` (active/production claim) → `_BY_MANIFEST` → `_SIMB` → `_L0` → `_L1` → `_L2` → `_BY_TRUST` →
`_BY_BRL` → `_BY_FEDERATION_FLOW` → `_BY_TRACE` → `_BY_SETTLEMENT` → `L3_INCOMPLETE` → `L3_READY`.

### Fixtures (TEST ONLY — NOT PRODUCTION; no real federation, no real operator)

`l3_ready_federation_flow` → READY · `missing_l2` → INCOMPLETE · `federation_trace_fail` →
BLOCKED_BY_TRACE · `federation_settlement_fail` → BLOCKED_BY_SETTLEMENT · `brl_revoked_operator` →
BLOCKED_BY_BRL · `trust_fail` → BLOCKED_BY_TRUST · `production_claim` → INVALID.

## Verification (all green)

- Rust: fmt/clippy(-D warnings)/test — l3-readiness (11), evidence-bundle (10), banzai-evidence (incl.
  4 new L3 tests + kb regression). `rust-engine-check` (new crate), `rust-rule-check`,
  `rust-final-closure-check`, `conformance-rs-check`, `simb-rs-check`, `purity-check`, `identity-check`,
  `invariant-check`, `reference-svg-check` ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` (61) ✓.
- Sweeps: no "corpus", no public "KB", no forbidden active-federation/certification claims — zero.
- Adversarial review (boundary/no-active-federation · readiness-in-Rust · no-network): 0 confirmed.
- Live browser E2E: `l3_ready_federation_flow` → L3_READY; `brl_revoked_operator` → L3_BLOCKED_BY_BRL;
  `federation_trace_fail` → L3_BLOCKED_BY_TRACE; Programadores federation; Assistente "L3 readiness é
  federação activa?" → denial; `llm_calls=0`; zero external calls; no "corpus".

## Boundary / state preserved

Local validation, no network (operator federation-URL validation explicitly `disabled`). An
`L3_READY_FOR_TECHNICAL_REVIEW` result is technical preparation of federation — it is not active
federation, is not production, does not move funds, does not certify, does not approve, does not create an
operator, and does not run the BANZA CA review. The BRL is fail-closed. `/operators=[]`,
`production_certificates=false`, no M2/M3, provider mock, `llm_calls=0`. Status/readiness computed in
Rust, never in TypeScript. Evidence Bundle minimum readiness (SimB + L0) unchanged; L1/L2/L3 are
additional next-level readiness.
