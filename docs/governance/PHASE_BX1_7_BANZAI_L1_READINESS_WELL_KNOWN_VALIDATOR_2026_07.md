# BANZA / BanzAI — Phase BX1.7: L1 Readiness and Well-Known Endpoint Validator

**Date:** 2026-07-16
**Branch:** `feat/bx1-7-banzai-l1-readiness-well-known-validator-2026-07`
**Scope:** Add a Rust/WASM **L1 readiness** aggregator to the BanzAI Workbench — local (no-network),
producing a technical L1 readiness report from the other tools' outputs (Operator Manifest, SimB
pre-review, Conformidade L0, key manifest, certificates, BRL, Evidence Bundle) and verifying the
expected **well-known** endpoint paths (by contract, not by URL). Wired into Conformidade, Programadores,
Evidence Bundle and the Assistente.
**Central rule:** L1 Readiness é preparação técnica. **Não é certificação, não é aprovação, não cria
operador e não executa a revisão BANZA CA.**

## Contract (Part 1)

The well-known surface an operator candidate is expected to expose (verified here by **path contract**,
never fetched):

```
/.well-known/banza/operator.json      → Operator Manifest
/.well-known/banza/key-manifest.json  → Key Manifest (raiz de confiança)
/certificates                         → Certificates document
/federation/revocation-list.json      → BRL (revogação)
/conformance/evidence                 → Conformance evidence
```

L1 readiness is the **L0-demo → L1-technical-preparation** transition: it asserts an operator candidate
has the minimum artifacts *structured for later technical review*. It is **not** a certification level
attained; L1–L4 remain requirements/future phases and the BANZA CA owns the review decision.

## Architecture decision (Part 2)

**New crate `engines/banza-l1-readiness`** (`rlib`+`cdylib`, `wasm` feature) — a **pure aggregator**. It
takes no engine dependencies: it reads the *status fields* the other tools already produced and computes
the L1 status, readiness, endpoint contract, warnings, next steps and SHA-256 hashes **entirely in
Rust**. Kept separate from `banza-conformance`/`banza-operator-manifest` (single responsibility). Reused
by `banza-evidence-bundle` (demo builds a real L1 report).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | `banza-l1-readiness` — `validate_l1` (status + readiness + endpoint contract + SHA-256 hashes, **all in Rust**), `demo_fixtures`, `schema`, `tool_version`. Local, **no network** (operator-URL validation disabled this phase). 8 tests. CI job added. |
| Engine (Rust) | `banza-evidence-bundle` — accepts `l1_readiness` (recommended artifact); demo includes a real L1 report. `banzai-evidence` — `l1_readiness` answer intent + `l1` citation. |
| WASM | `website/lib/wasm/banza_l1_readiness*` (feature-gated: only `l1_readiness_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaL1Readiness.ts` — load + marshal only; `l1StatusTone` render-only. |
| UI | `L1Preparation` in the **Conformidade** tab (8-item checklist, fixture selector, "Validar readiness L1" + "Usar estado actual", states, report, ask); `WellKnownEndpoints` in the **Programadores** tab (path list, disabled URL field + "fase futura" note, "Ver checklist L1"); **Evidence Bundle** adds the `L1 readiness report` recommended artifact; dynamic sidebar. |

### WASM exports

```
l1_readiness_validate_json, l1_readiness_demo_fixtures_json,
l1_readiness_schema_json, l1_readiness_tool_version_json
```

### Report envelope

`status`, `readiness`, `required_artifacts`, `recommended_artifacts`, `missing_artifacts`,
`invalid_artifacts`, `endpoint_paths` (path contract, no network), `well_known_paths`, `trust_summary`,
`conformance_summary`, `warnings`, `next_steps`, `operator_url_validation: "disabled"`, `report_id`,
`l1_report_hash`, `boundary`, `tool`, `tool_version`, `not_a_certificate: true`, `not_an_approval: true`,
`does_not_create_operator: true`, `requires_banza_ca_review: true`, `test_only: true`, `llm_calls: 0`,
`external_model_called: false`.

### Status values (computed in Rust, in precedence order)

`L1_INVALID` (production claim) → `L1_BLOCKED_BY_MANIFEST` → `L1_BLOCKED_BY_SIMB` → `L1_BLOCKED_BY_L0` →
`L1_BLOCKED_BY_TRUST` (key manifest / BRL) → `L1_INCOMPLETE` (missing required artifact) →
`L1_READY_FOR_TECHNICAL_REVIEW`.

### Fixtures (TEST-ONLY)

`l1_ready_candidate` → L1_READY_FOR_TECHNICAL_REVIEW · `l1_missing_key_manifest` → L1_BLOCKED_BY_TRUST ·
`l1_simb_fail` → L1_BLOCKED_BY_SIMB · `l1_l0_fail` → L1_BLOCKED_BY_L0 · `l1_production_claim` →
L1_INVALID (boundary).

## Verification (all green)

- Rust: `cargo fmt`/`clippy -D warnings`/`test` — l1-readiness (8), evidence-bundle (10),
  banzai-evidence (boundary/evidence_bundle/kb/l1_readiness/operator_manifest/simb_gate). `rust-engine-check`
  (new crate), `rust-rule-check`, `final-closure`, `conformance`/`simb`, `purity`/`identity`/`invariant`/
  `reference-svg` ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` ✓.
- Forbidden-claims + no-"corpus" + no public-"KB" sweep: zero NEEDS_FIX.
- Adversarial diff review: 0 confirmed findings.
- Live browser E2E: `l1_ready_candidate` → L1_READY_FOR_TECHNICAL_REVIEW; `l1_simb_fail` →
  L1_BLOCKED_BY_SIMB; Programadores lists the well-known paths (URL field disabled); Evidence Bundle
  lists the L1 report; ask-Assistente "L1 readiness é certificado?"; `llm_calls=0`; zero external calls;
  no "corpus".

## Boundary preserved

Local validation, no network by default (operator-URL validation explicitly `disabled`). An
`L1_READY_FOR_TECHNICAL_REVIEW` result is technical preparation — it does not create an operator, does
not certify, does not approve, and does not run the BANZA CA review. `/operators=[]`,
`production_certificates=false`, no M2/M3. Status/readiness computed in Rust, never in TypeScript.
