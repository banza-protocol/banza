# BANZA — Phase M2: Production Protocol Implementation

> **Este relatório é histórico de implementação. A arquitectura activa está documentada nos documentos de governance actuais** — em particular [`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md), [`OPEN_PROTOCOL_GOVERNANCE.md`](OPEN_PROTOCOL_GOVERNANCE.md), [`M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md`](M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md) e ADR-038/039/040. Alguns nomes e artefactos citados abaixo (por exemplo a "BANZA CA production role", o "operator admission flow" e nomes de estados/campos anteriores) foram substituídos pelo modelo aberto activo — signed protocol metadata, delegated signing keys, operator self-publication, conformance evidence, public protocol registry e revocation/fail-closed — e não descrevem a arquitectura actual.

**Date:** 2026-07-17
**Branch:** `feat/m2-production-protocol-implementation-2026-07`
**Scope:** Begin the **production implementation of the BANZA protocol** — production state model, production
contract baseline, protocol release governance, BANZA CA production role, operator admission flow,
production trust path, and an M2 protocol gate engine in Rust/WASM. From M2 on, L0–L4 "readiness" is
historical/evidence; M2 is the primary focus.

> **Central rule:** M2 implementa o protocolo BANZA para produção enquanto protocolo aberto. **Isto não
> transforma BANZA em prestador de serviços de pagamento, não move fundos, não liquida valores, não cria
> operador financeiro e não substitui licença/autorização do operador.** «Produção» aqui é produção do
> PROTOCOLO, não operação financeira.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa
> transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por
> operadores autorizados que implementam o protocolo.

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **NEW crate `engines/banza-m2-protocol-gate`** — `validate_m2_protocol_gate` (M2 status + production-protocol gates + missing artifacts + blocked items + forbidden-activation attempts + SHA-256 hash, **all in Rust**), `demo_fixtures` (8 fixtures — one per status), `schema`, `tool_version`. Local, no network. 14 tests. CI job `banza-m2-protocol-gate (M2 protocol gate)`. |
| Engine (Rust) | `banza-evidence-bundle` accepts `m2_protocol_gate` (recommended artifact `m2_protocol_gate_report`) + `m2_protocol_gate_summary`; demo builds a real M2 report. `banzai-evidence` gains the `m2_production` intent + `m2` citation. |
| WASM | **NEW** `banza_m2_protocol_gate*` (only `m2_protocol_gate_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt (siblings byte-identical). |
| Contracts | **NEW `contracts/production/`** — `protocol-version.json` + 8 production schemas (operator-manifest / key-manifest / certificate / brl / evidence-bundle / conformance-report / operator-admission / protocol-release) + README. Protocol-production, not financial-production; licence/regulatory fields are operator-owned & declarative. |
| Governance docs | `M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md`, `PROTOCOL_PRODUCTION_STATE_MODEL.md`, `PROTOCOL_RELEASE_GOVERNANCE.md` + this phase report. (The two originally-shipped governance docs describing the "BANZA CA production role" and the "operator admission flow" were later superseded by ADR-038/039/040 and removed; trust and operator self-publication are now documented in `BANZA_TRUST_ARCHITECTURE.md` and `OPEN_PROTOCOL_GOVERNANCE.md`.) |
| Security docs | `docs/security/PRODUCTION_TRUST_PATH.md`, `PRODUCTION_ARTIFACT_SIGNING_POLICY.md` (prepare the production trust path; no real keys generated). |
| Adapter (TS) | `website/lib/banzaM2ProtocolGate.ts` — load+marshal only; `m2StatusTone` / `m2GateTone` render-only. `banzaEvidenceBundle.ts` `BundleInput.m2_protocol_gate`. |
| UI | Conformidade → **M2 · Production Protocol Implementation** as the primary section (6 gate cards: Contract Baseline / Release Governance / Production Trust Path / Operator Admission / Assurance / Regulatory Boundary), M2 fixture selector, "Validar M2 protocol gate", state/gates/blocked/forbidden/next-steps, boundary + open-protocol copy. L0–L4 relabeled "HISTÓRICO". Evidence Bundle → `M2 protocol gate report`. |

### WASM exports

```
m2_protocol_gate_validate_json, m2_protocol_gate_demo_fixtures_json,
m2_protocol_gate_schema_json, m2_protocol_gate_tool_version_json
```

### Report envelope

`status`, `m2_state`, `required_inputs`, `production_protocol_gates` (contracts / governance / trust_path /
operator_admission / assurance / regulatory_boundary, each ok/gap/missing), `missing_artifacts`,
`blocked_items`, `forbidden_activation_attempts`, `contract_summary`, `governance_summary`,
`trust_path_summary`, `operator_admission_summary`, `security_assurance_summary`,
`regulatory_boundary_summary`, `next_steps`, `report_id`, `m2_report_hash`, and the boundary flags:
`protocol_production_prepared`, `operator_activation_allowed: false`, `production_certificates_allowed:
false`, `payment_service_operation_allowed: false`, `not_a_psp`, `does_not_move_funds`,
`does_not_create_operator`, `does_not_issue_payment_service_authorisation`,
`does_not_make_banza_a_payment_service_provider`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`, `test_only` (all true where
applicable), `llm_calls: 0`, `external_model_called: false`.

### Status values (Rust, precedence order)

`M2_INVALID_REGULATORY_BOUNDARY` (PSP/licence/funds claim) → `M2_INVALID_FORBIDDEN_ACTIVATION` (tries to
activate operator / emit production certificate / set production_certificates / add operator / move funds)
→ `M2_BLOCKED_BY_MISSING_CONTRACTS` → `M2_BLOCKED_BY_GOVERNANCE_GAP` → `M2_BLOCKED_BY_TRUST_PATH_GAP` →
`M2_BLOCKED_BY_OPERATOR_ADMISSION_GAP` → `M2_BLOCKED_BY_ASSURANCE_GAP` → `M2_PROTOCOL_IMPLEMENTATION_READY`.

### Production state model

`PRE_PRODUCTION` (current) → `M2_PROTOCOL_IMPLEMENTATION` → `M2_PROTOCOL_REVIEW` → `M2_PROTOCOL_CANDIDATE`
→ `M3_OPERATOR_CANDIDATE` → `M4_PRODUCTION_NETWORK` (future-only; not activated). Forbidden in M2: adding a
real operator, emitting a real production certificate, `/operators` with a real operator,
`production_certificates=true`, activating real payments, claiming operational production.

## Boundary / status computed in Rust — never in TypeScript

The M2 status, the six production-protocol gates, the missing artifacts, the blocked items, the
forbidden-activation attempts and the report hash are all computed by `validate_m2_protocol_gate`
(Rust → WASM). The TypeScript adapter only marshals JSON and maps a Rust-computed status/gate to a render
tone (`m2StatusTone` / `m2GateTone`). The Assistente `m2_production` intent is deterministic (`llm_calls =
0`, `external_model_called = false`) and cites only real internal routes.

## Pre-production state unchanged

`/operators = []`, `production_certificates = false`, provider mock, `llm_calls = 0`,
`external_model_called = false`. No operator created, no production certificate emitted, no funds moved, no
external integration active. No `.env`/VERSION/DNS/TLS/Cloudflare/Postgres/secret changes; website-only
deploy.

## Checks

`cargo fmt` + `clippy` + `cargo test` (banza-m2-protocol-gate 14, banza-evidence-bundle 11, banzai-evidence
full incl. `kb`), WASM build, `npm run test` (vitest 105), `npm run type-check` (tsc), `npm run build`
(next), and the `make` guards: rust-rule-check, rust-engine-check, rust-final-closure-check,
conformance-rs-check, simb-rs-check, purity-check, identity-check, invariant-check, reference-svg-check,
regulatory-check — all green. Browser E2E on `/banzai/workbench`. Adversarial multi-agent review.
