# BANZA / BanzAI — Phase BX1.5: Evidence Bundle Export

**Date:** 2026-07-16
**Branch:** `feat/bx1-5-banzai-evidence-bundle-export-2026-07`
**Scope:** Turn the BanzAI Workbench `Evidence Bundle` tab into a real technical-evidence export tool that
gathers the SimB, Conformidade L0, Trace and Trust & BRL reports, computes readiness + SHA-256 hashes in
Rust/WASM, and exports a JSON bundle.
**Central rule:** the Evidence Bundle is technical evidence — **not a certificate, not an approval, not a
substitute for the BANZA CA.**

## Architecture decision (Part 2)

The assembler lives in a **new crate `engines/banza-evidence-bundle`** (`rlib` + `cdylib`, `wasm`
feature) — decoupled: it consumes the other tools' report JSON and reuses the real engines
(`banza-simb`, `banza-conformance`, `banza-trust`) only for the **demo bundle**. It was kept out of
`banzai-evidence` (the Assistente knowledge engine — no `sha2`/assembly logic there) and out of
`banza-conformance` (single responsibility). Documented in `docs/governance/EVIDENCE_BUNDLE.md`.

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | `engines/banza-evidence-bundle` — `build_bundle`, `validate_bundle` (fields + boundary flags + readiness enum + **SHA-256 integrity recompute**), `demo_bundle` (real engines), `schema`, `tool_version`. Readiness, hashes, bundle_id, missing artifacts **computed in Rust**. 10 tests. |
| Engine (Rust) | `banzai-evidence` — `evidence_bundle` answer intent + `bundle` citation → the Assistente explains readiness/blockers and states it is not a certificate. 2 tests. |
| WASM | `website/lib/wasm/banza_evidence_bundle*` (feature-gated: exports only `evidence_bundle_*`); `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaEvidenceBundle.ts` — load + marshal only; `readinessTone` is render-only. TS never decides readiness or hashes. |
| UI | `EvidencePanel` — artifact checklist (SimB/L0 required, Trace/Trust recommended), readiness badge, buttons (Gerar bundle / Gerar bundle demo / Validar bundle / Copiar JSON / Exportar JSON), missing-artifact list, hashes, ask-Assistente bridge, dynamic sidebar. Export → `banza-evidence-bundle-YYYYMMDD-HHMM.json`. |
| CI | `banza-evidence-bundle` job added to `.github/workflows/rust-engines.yml` (fmt --check, clippy -D warnings, test). |
| Docs | `EVIDENCE_BUNDLE.md` + this report. |

### WASM exports

```
evidence_bundle_build_json, evidence_bundle_validate_json, evidence_bundle_demo_json,
evidence_bundle_schema_json, evidence_bundle_tool_version_json
```

### Readiness (computed in Rust)

`READY_FOR_TECHNICAL_REVIEW` = SimB PASS + L0 PASS · `BLOCKED_BY_SIMB` = SimB FAIL ·
`BLOCKED_BY_CONFORMANCE` = SimB PASS + L0 FAIL · `INCOMPLETE` = missing required. Required = SimB + L0;
recommended = Trace + Trust & BRL. Every bundle carries `not_a_certificate = true`,
`not_an_approval = true`, `requires_banza_ca_review = true`, `llm_calls = 0`,
`external_model_called = false`, and the `boundary` string.

### Integrity

SHA-256 over canonical JSON (sorted keys). `validate_bundle` recomputes `bundle_hash` and fails on
mismatch (tamper detection). Hashes are technical integrity, not signature/authority.

## Verification (all green)

- **Rust:** `cargo fmt`/`clippy`/`test` — banza-evidence-bundle (10), banzai-evidence (3+2+6+3). `make
  simb-rs-check`, `conformance-rs-check`, `rust-engine-check` (picks up the new crate),
  `rust-final-closure-check`, `rust-rule-check` (new crate is Rust → allowed) ✓.
- **Website:** `tsc`, `next lint`, `next build` (both `/banzai` routes, 125 kB), `vitest` (24) ✓.
- **Repo gates:** `purity`/`identity`/`invariant`/`reference-svg` ✓. Forbidden-claims sweep: zero
  NEEDS_FIX.
- **Adversarial diff review** (boundary / readiness-in-Rust / integrity lenses): 0 confirmed findings.
- **Live browser E2E:** SimB PASS + L0 PASS → Gerar bundle → `READY_FOR_TECHNICAL_REVIEW`, Exportar JSON;
  SimB FAIL → Gerar bundle → `BLOCKED_BY_SIMB`; demo bundle (Trust present, Trace missing-recommended);
  Validar bundle → válido; tampered → integrity fail; ask-Assistente bridge; `llm_calls=0`; zero external
  calls; console clean.

## Boundary preserved

The bundle is technical evidence, not a certificate or approval. BanzAI does not certify/approve/emit.
No operator created; `/operators = []`, `production_certificates = false`; no M2/M3. The BANZA CA review
is external to the Workbench.
