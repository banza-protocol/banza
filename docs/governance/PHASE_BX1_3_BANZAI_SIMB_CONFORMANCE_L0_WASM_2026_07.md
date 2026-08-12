# BANZA / BanzAI — Phase BX1.3: SimB WASM and Conformance L0 Demo

**Date:** 2026-07-16
**Branch:** `feat/bx1-3-banzai-simb-conformance-l0-wasm-2026-07`
**Scope:** Turn the BanzAI Workbench `SimB` and `Conformidade` tabs from static explainers into real,
in-browser demo tools powered by the Rust `banza-simb` and `banza-conformance` engines compiled to WASM.
**Boundary:** Demo / TEST-ONLY. No real operator, no external endpoint, no certificate, no M2/M3, no
change to `/operators` or `/certificates`. L0 only — **L1–L4 are shown as requirements/future phases and
never fake execution.**

---

## 1. What shipped

| Layer | Artifact | Role |
|---|---|---|
| Engine (Rust) | `engines/banza-simb/src/scenario.rs` | Deterministic TEST-ONLY scenarios + the canonical invariant checker (`check_bundle`); **PASS/FAIL computed in Rust** |
| Engine (Rust) | `engines/banza-simb/src/wasm.rs` | 5 `#[wasm_bindgen]` exports (behind the `wasm` feature) |
| Engine (Rust) | `engines/banza-conformance/src/tool.rs` | `run_l0_demo` against SimB → L0 `ConformanceReport`; L1–L4 = non-runnable requirements |
| Engine (Rust) | `engines/banza-conformance/src/wasm.rs` | 5 `#[wasm_bindgen]` exports (behind the `wasm` feature) |
| WASM | `website/lib/wasm/banza_simb*` (183 KB), `banza_conformance*` (226 KB) | `wasm-pack --features wasm --target web`, vendored |
| Adapter (TS) | `website/lib/banzaSimb.ts`, `website/lib/banzaConformance.ts` | Load + marshal only; **no simulation, no invariant, no verdict in TS** |
| UI | `website/components/banzai/BanzaiChat.tsx` → `SimbPanel`, `ConformidadePanel` | Real tools: scenario selector, run buttons, results, dynamic sidebars, cross-tab + ask-Assistente bridges |

### Rust exports (browser)

```
banza-simb:         simb_demo_scenarios_json, simb_run_scenario_json, simb_operator_manifest_json,
                    simb_federation_demo_json, simb_tool_version_json
banza-conformance:  conformance_run_l0_demo_json, conformance_validate_report_json,
                    conformance_demo_fixtures_json, conformance_levels_info_json,
                    conformance_tool_version_json
```

### SimB scenarios (TEST-ONLY, deterministic)

Every scenario runs the same valid L0 flow on a fresh `SimOperator` (transfer → idempotent replay →
second transfer → settlement); the fault scenarios then inject **exactly one** deterministic fault so
that **exactly one invariant fails**:

- `simb_valid_l0` → PASS (INV-LEDGER-001, INV-IDEM-001, INV-SETTLE-001, INV-WALLET-001 all pass)
- `simb_invalid_ledger` → FAIL (a CREDIT entry is dropped → double-entry sum breaks)
- `simb_idempotency_fail` → FAIL (a replay of the same key returns a different durable result)
- `simb_settlement_fail` → FAIL (`net + fee != gross`)

Each output carries `test_only: true`, the `TEST ONLY — LOCAL SIMULATOR, NOT PRODUCTION` marker,
`llm_calls: 0`, `external_model_called: false`.

### Conformance L0

`run_l0_demo({scenario})` or `run_l0_demo({run})` executes the L0 demo **against SimB** and produces an
L0 report: `level: "L0"`, `status: PASS|FAIL`, per-invariant `cases`, `failures`, `evidence`,
`report_id`, `tool_version`, and the disclaimer *"PASS técnico é evidência … não é certificação"*
(plus the canonical English `certification_disclaimer`). The report round-trips `validate_report`.
`levels_info()` marks **L0 runnable**; **L1–L4 `runnable: false`** with requirements and a future-phase
status — the UI shows requirement cards with a "Ver requisitos" button and **no run button**.

### Status is decided in Rust

The invariant checker (`banza_simb::scenario::check_bundle`) is the single source of technical truth,
reused by the conformance L0 report framing. The TS adapters only `JSON.parse(mod.*_json(...))` and map
a Rust-computed status to a render tone. TypeScript never simulates a ledger, evaluates an invariant, or
decides a verdict.

### Clean per-engine WASM surfaces (feature gate)

`banza-simb`, `banza-trust` and `banza-conformance` gained `crate-type = ["cdylib","rlib"]` and a `wasm`
cargo feature guarding their `#[wasm_bindgen]` module. Standalone builds pass `--features wasm`; because
`banza-conformance` does **not** enable its deps' `wasm` feature, the conformance bundle exports only
`conformance_*` (no `simb_*`/`trust_*` leakage) — the bundle shrank from 497 KB to 226 KB.

---

## 2. Verification (all green)

**Rust** (`cargo fmt`/`clippy`/`test` per crate):
- `banza-simb`: 8 scenario tests + 6 existing — pass.
- `banza-conformance`: 12 tool tests + 7 existing — pass.
- `banza-trust`: 7 + 9 (unchanged) — pass (feature-gate refactor is native-transparent).
- `make simb-rs-check`, `conformance-rs-check`, `rust-engine-check`, **`rust-final-closure-check`**
  (live + federation runners against SimB still PASS), `rust-rule-check` — all pass.

**Website** (authoritative gates):
- `tsc --noEmit` clean · `next lint` clean · `next build` success (`/banzai/workbench` + `/banzai/chat`
  build, 122 kB) · `vitest run` 17 tests pass.

**Repo gates:** `purity-check`, `identity-check`, `invariant-check`, `reference-svg-check` — pass
(identity advisories pre-existing).

**Claims sweep:** zero NEEDS_FIX across all BX1.3 surfaces.

**Live browser E2E** (`/banzai/workbench`):
- SimB `valid_l0` → **PASS técnico**; `invalid_ledger` → **FAIL técnico** on exactly INV-LEDGER-001
  (fault banner shown).
- "Usar este cenário na Conformidade L0" switches tab, defaults the source to the SimB run, and
  L0 → **FAIL** on it; valid L0 fixture → **PASS**.
- L1–L4 render as requirement cards with **no run button** (only one "Correr" button on the page).
- Ask-Assistente bridge switches to the Assistente and answers.
- `llm_calls=0` on every result; **zero external network requests**; WASM loaded locally only.
- Console: only the pre-existing root-`<html>` `js`-class hydration warning (unrelated, all pages).

---

## 3. Boundary preserved

- SimB **simulates**; it does not move real funds and does not represent a certified operator.
- Conformance **produces technical evidence**; PASS is not a certificate. BanzAI does not certify,
  approve, or emit certificates — certification is a BANZA CA / M2–M3 decision.
- L1–L4 are requirements/future phases; the UI never offers to run them.
- `/operators` and `/certificates` untouched. Pre-production posture intact: mock provider,
  `llm_calls=0`, no external model, no certified operator, no production certificate.

---

## 4. Not in scope (correctly deferred)

Full L1–L4 execution (needs a live operator / federation surface), Evidence Bundle export
(skeleton — marked "em preparação"), upload/operator-URL modes. BX1.3 delivers **L0 demo only**.
