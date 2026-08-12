# BANZA / BanzAI — Phase BX1.6: Operator Manifest Validator

**Date:** 2026-07-16
**Branch:** `feat/bx1-6-banzai-operator-manifest-validator-2026-07`
**Scope:** Add a Rust/WASM operator-manifest validator to the BanzAI Workbench — local (no-network),
producing a technical report, wired into the SimB gate, Conformidade, Evidence Bundle and the Assistente.
**Central rule:** Operator Manifest Validation is technical evidence — **not certification, not approval,
and it does not create a real operator** (does not change `/operators`).

## Contract (Part 1)

A canonical `OperatorManifest` exists (`contracts/openapi/reference-operator.yaml` + conformance vectors
`operator-manifests.json` MAN-001..004): required `operator_id, environment, simulated,
production_allowed, capabilities`; sandbox safety invariant `simulated=true, production_allowed=false`.
The prompt's richer fields (`key_manifest_url`, `protocol_version`, `base_url`, `supported_levels`) are
**not** canonical, so they are a **DRAFT candidate-submission extension** (non-normative until governed
approval). Documented in `docs/governance/OPERATOR_MANIFEST_VALIDATION.md`.

## Architecture decision (Part 2)

**New crate `engines/banza-operator-manifest`** (`rlib`+`cdylib`, `wasm` feature) — a decoupled, local
validator. Kept separate from `banza-conformance` (single responsibility). Reused by
`banza-evidence-bundle` (demo).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | `banza-operator-manifest` — `validate_manifest_str`/`validate_manifest` (status VALID/INVALID/INCOMPLETE/MALFORMED + readiness + SHA-256 hashes, **all in Rust**), `demo_fixtures`, `schema`, `tool_version`. Local, **no network** (URLs checked for form only). 7 tests. CI job added. |
| Engine (Rust) | `banza-evidence-bundle` — accepts `operator_manifest_validation` (recommended artifact); demo includes a real manifest validation. `banzai-evidence` — `operator_manifest` answer intent + updated `manifest_review` (now validates locally) + `manifest` citation. |
| WASM | `website/lib/wasm/banza_operator_manifest*` (feature-gated: only `operator_manifest_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaOperatorManifest.ts` — load + marshal only; `manifestStatusTone` render-only. |
| UI | `ManifestValidator` in the **Programadores** tab (fixture selector, paste-JSON, Validar/Carregar/Copiar/Exportar/Ask); **Conformidade** shows a recommended `Operator Manifest` prerequisite (a valid manifest does not replace SimB/L0); **Evidence Bundle** adds the `Operator manifest validation report` recommended artifact; dynamic sidebar. |

### WASM exports

```
operator_manifest_validate_json, operator_manifest_demo_fixtures_json,
operator_manifest_schema_json, operator_manifest_tool_version_json
```

### Report envelope

`status`, `manifest_id`, `operator_id`, `environment`, `protocol_version`, `errors`, `warnings`,
`required_fields`, `missing_fields`, `endpoint_checks` (form-only, no network), `key_manifest_reference`,
`manifest_hash`, `readiness`, `next_step`, `boundary`, `tool`, `tool_version`, `not_a_certificate: true`,
`not_an_approval: true`, `does_not_create_operator: true`, `requires_simb_pre_review: true`,
`requires_banza_ca_review: true`, `llm_calls: 0`, `external_model_called: false`.

### Fixtures (TEST-ONLY)

`valid_l0_candidate_manifest` → VALID · `missing_key_manifest` → INCOMPLETE · `bad_protocol_version` →
INVALID · `production_claim_manifest` → INVALID (boundary) · `malformed_json` → MALFORMED.

## Verification (all green)

- Rust: `cargo fmt`/`clippy -D warnings`/`test` — operator-manifest (7), evidence-bundle (10),
  banzai-evidence (3+5+6+2+3+3). `rust-engine-check` (new crate), `rust-rule-check`, `final-closure`,
  `conformance`/`simb`, `purity`/`identity`/`invariant`/`reference-svg` ✓.
- Website: `tsc`, `next lint`, `next build` (126 kB), `vitest` (29) ✓.
- Forbidden-claims + no-"corpus" sweep: zero NEEDS_FIX.
- Adversarial diff review: 0 confirmed findings.
- Live browser E2E: valid fixture → VALID (READY_FOR_SIMB_PRE_REVIEW); missing_key_manifest →
  INCOMPLETE; production_claim → INVALID (boundary); Conformidade shows the manifest prerequisite;
  Evidence Bundle lists the manifest artifact; ask-Assistente; `llm_calls=0`; zero external calls; no
  "corpus".

## Boundary preserved

Local validation, no network by default. A valid manifest is technical evidence — it does not create an
operator, does not certify, does not approve. `/operators=[]`, `production_certificates=false`, no M2/M3.
Readiness/validity computed in Rust, never in TypeScript.
