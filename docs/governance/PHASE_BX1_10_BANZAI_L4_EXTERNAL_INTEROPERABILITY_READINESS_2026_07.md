# BANZA / BanzAI — Phase BX1.10: L4 External Interoperability Readiness

**Date:** 2026-07-16
**Branch:** `feat/bx1-10-banzai-l4-external-interoperability-readiness-2026-07`
**Scope:** Prepare the BanzAI Workbench for **L4 validation in local/demo/test-only mode** — external
interoperability between operators that implement the BANZA protocol — without external calls by default,
without real integration, without a real operator, without production and without real funds. New
Rust/WASM engine validating an external interoperability profile, protocol version negotiation, an
endpoint contract map, a capability matrix, a request/response envelope, an error mapping, trust & BRL
material and an interop evidence reference, aggregated over Manifest/SimB/L0/L1/L2/L3.
**Central rule:** L4 Readiness é preparação de interoperabilidade externa. **Não é integração externa
activa, não é produção, não é certificação, não é aprovação, não é licença, não cria operador, não move
fundos e não transforma BANZA em prestador de serviços de pagamento.** BANZA é um protocolo aberto; os
operadores autorizados prestam os serviços financeiros.

## Architecture decision (Part 3)

**New crate `engines/banza-l4-readiness`** (`rlib`+`cdylib`, `wasm` feature; deps serde/serde_json/sha2 —
NO engine deps). It reads the upstream reports' status fields AND validates the external-interoperability
artifacts, computing the L4 status/readiness, the profile / version-negotiation / endpoint-contract /
capability / envelope / error-mapping / trust / BRL checks and SHA-256 hashes **entirely in Rust**. Local,
no network, no external integration. Kept a separate single-responsibility crate; reused by
`banza-evidence-bundle` (demo builds a real L4 report).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **`banza-l4-readiness`** — `validate_l4` (status + readiness + interop checks + SHA-256 hashes, **all in Rust**), `demo_fixtures`, `schema`, `tool_version`. Local, no network; `operator_url_validation` and `external_integration` both `disabled`. BRL fail-closed. 12 tests. CI job added. |
| Engine (Rust) | `banza-evidence-bundle` accepts `l4_readiness` (recommended artifact) + `l4_readiness_summary`; demo includes a real L4 report. `banzai-evidence` gains the `l4_readiness` intent + `l4` citation. |
| WASM | `banza_l4_readiness*` (only `l4_readiness_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaL4Readiness.ts` — load+marshal only; `l4StatusTone` render-only. |
| UI | Conformidade → `Preparação L4 · interoperabilidade externa` (14-item checklist, fixture selector, per-artifact summaries, report); Programadores → `Interoperabilidade L4` (profile/version/endpoint/capability/envelope/error/trust/evidence + the "authorised operators provide the services; BANZA stays an open protocol, not a PSP" note + disabled real-integration endpoint); Evidence Bundle → `L4 readiness report`. |
| Docs | `PHASE_BX1_10_…md` + `L4_READINESS.md`. |

### WASM exports

```
l4_readiness_validate_json, l4_readiness_demo_fixtures_json,
l4_readiness_schema_json, l4_readiness_tool_version_json
```

### Report envelope

`status`, `readiness`, `required_artifacts`, `recommended_artifacts`, `missing_artifacts`,
`invalid_artifacts`, `interoperability_summary`, `version_negotiation_summary`,
`endpoint_contract_summary`, `capability_summary`, `envelope_summary`, `error_mapping_summary`,
`trust_summary`, `brl_summary`, `evidence_summary`, `warnings`, `next_steps`, `boundary`,
`protocol_stance`, `operator_url_validation: "disabled"`, `external_integration: "disabled"`, `report_id`,
`l4_report_hash`, and the boundary flags: `not_external_integration`, `not_active_federation`,
`not_a_payment`, `not_a_certificate`, `not_an_approval`, `not_a_licence`, `not_a_psp`,
`does_not_move_funds`, `does_not_create_operator`, `does_not_make_banza_a_payment_service_provider`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`, `requires_banza_ca_review`,
`test_only` (all true), `llm_calls: 0`, `external_model_called: false`.

### Status values (Rust, precedence order)

`L4_INVALID` → `_BY_MANIFEST` → `_SIMB` → `_L0` → `_L1` → `_L2` → `_L3` → `_BY_PROFILE` →
`_BY_VERSION_NEGOTIATION` → `_BY_ENDPOINT_CONTRACT` → `_BY_CAPABILITIES` → `_BY_ENVELOPE` →
`_BY_ERROR_MAPPING` → `_BY_TRUST` → `_BY_BRL` → `L4_INCOMPLETE` → `L4_READY`.

### Fixtures (TEST ONLY — NOT PRODUCTION; no real integration/operator/payment/federation/licence)

`l4_ready_external_interop` → READY · `missing_l3` → INCOMPLETE · `version_negotiation_fail` →
BLOCKED_BY_VERSION_NEGOTIATION · `endpoint_contract_fail` → BLOCKED_BY_ENDPOINT_CONTRACT · `envelope_fail`
→ BLOCKED_BY_ENVELOPE · `error_mapping_fail` → BLOCKED_BY_ERROR_MAPPING · `brl_revoked` → BLOCKED_BY_BRL ·
`production_claim` → INVALID.

## Verification (all green)

- Rust: fmt/clippy(-D warnings)/test — l4-readiness (12), evidence-bundle (10), banzai-evidence (incl.
  5 new L4 tests + kb regression). `rust-engine-check` (new crate), `rust-rule-check`,
  `rust-final-closure-check`, `conformance-rs-check`, `simb-rs-check`, `purity-check`, `identity-check`,
  `invariant-check`, `reference-svg-check`, `regulatory-check` ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` (78) ✓.
- Sweeps: no "corpus", no public "KB", no "protocolo técnico" as main phrasing, no forbidden
  active-integration/licence/PSP/certification claims — zero.
- Adversarial review (boundary/no-active-integration-licence-PSP · readiness-in-Rust · no-network): 0
  confirmed.
- Live browser E2E: `l4_ready_external_interop` → L4_READY; `version_negotiation_fail` →
  BLOCKED_BY_VERSION_NEGOTIATION; `endpoint_contract_fail` → BLOCKED_BY_ENDPOINT_CONTRACT; Programadores
  interoperability; Assistente "L4 transforma BANZA em PSP?" → denial (open protocol, licence belongs to
  the operator); `llm_calls=0`; zero external calls; no "corpus".

## Boundary / state preserved

Local validation, no network (operator-URL / external-integration validation explicitly `disabled`). An
`L4_READY_FOR_TECHNICAL_REVIEW` result is technical preparation of external interoperability — it is not
active external integration, is not production, is not a licence, does not move funds, does not certify,
does not approve, does not create an operator, and does not make BANZA a payment service provider. BANZA
is an open protocol; the authorised operator is responsible for real financial services and their
licence/authorisation. The BRL is fail-closed. `/operators=[]`, `production_certificates=false`, no M2/M3,
provider mock, `llm_calls=0`. Status/readiness computed in Rust, never in TypeScript. Evidence Bundle
minimum readiness (SimB + L0) unchanged; L1/L2/L3/L4 are additional next-level readiness.
