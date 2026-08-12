# BanzAI Canonical 9-Step Validation Journey (M2.19E/F.2)

**The one and only journey — nine steps, each decided by a Rust engine, each sealed in a receipt. The legacy 7-step journey is gone.**

**Status:** COMPLETE + LIVE — 2026-07-29

## The nine steps

Defined in `STEPS` (`website/components/banzai/validationJourney.tsx`), ordered by `VALIDATION_STEP_IDS` (`website/lib/banzaiValidation.ts`). Each step runner calls a Rust/WASM engine and records exactly what it returns — TypeScript fabricates no verdict.

| # | Step | id | Rust engine(s) | Verdict from |
|---|---|---|---|---|
| 1 | Discovery | `discovery` | `banza-operator-manifest` | manifest recognisability (MALFORMED → FAILED; INCOMPLETE → PENDING; else VERIFIED) |
| 2 | Manifest | `manifest` | `banza-operator-manifest` | manifest status VALID/INCOMPLETE/INVALID/MALFORMED |
| 3 | Keys | `keys` | `banza-trust` | ed25519 signature, delegated key, revocation (Rust-signed demo trust material) |
| 4 | Conformance | `conformance` | `banza-conformance` | L0 PASS/FAIL vs SimB + financial invariants |
| 5 | Interoperability | `interoperability` | `banza-l2-readiness` · `banza-simb` | payment/refund, idempotency, double-entry ledger, settlement (L2 readiness) |
| 6 | Trust | `trust` | `banza-trust` | signed metadata, delegated keys, manifest, conformance evidence, registry, revocation |
| 7 | Federation | `federation` | `banza-simb` · `banza-l3-readiness` | idempotent routing + netting demo, L3 readiness |
| 8 | Evidence Bundle | `evidence` | `banza-evidence-bundle` | bundle readiness, required/missing artifacts, SHA-256 integrity |
| 9 | Certification Readiness | `certification` | deterministic TypeScript aggregation (no engine/WASM) | aggregates the prior Rust verdicts into a **PREVIEW** record |

**Step 9 is honest about its nature.** There is no certification engine; `runCertification` is deterministic TypeScript aggregation of the prior Rust step verdicts. Because Operador Zero is demo (`production_allowed=false`), the record is a `record_kind: "PREVIEW"` and the outcome is categorically `NOT_CERTIFIED` / `PRE_PRODUCTION` — never a certified record. Its own step status is `BLOCKED` with reason codes `NOT_CERTIFIED, DEMO_ENVIRONMENT, NO_PRODUCTION_EVIDENCE, PRODUCTION_ALLOWED_FALSE`.

## States and receipts

- **Step states** (`StepStatus`): `NOT_EVALUATED · PENDING · VERIFIED · FAILED · BLOCKED`. Mapped from each engine's tone; never invented.
- **Journey aggregate** (`aggregateStatus`, worst-first): `FAILED > BLOCKED > PENDING > VERIFIED > NOT_EVALUATED`.
- **Receipts** — every executed step yields an `OperationReceipt`; a full run yields a sealing `JourneyReceipt` (`step_count`, `overall_status`, `certification_status: NOT_CERTIFIED`, `certification_readiness: PRE_PRODUCTION`, `demo_only: true`). Every receipt carries `qwen_calls: 0` and `external_calls: 0` by construction. Journey context (manifest, l0, simb, trust, l2, l3, bundle) is threaded across steps so later steps consume earlier Rust reports.

Steps run individually (`runOne` / `runNext`) or as the full journey (`runAll`); each is exportable as JSON.

## Removal of the legacy 7-step journey

- The legacy Operador Zero step-gating "journey strip" and the legacy in-browser evidence-session model were **deleted** from `BanzaiAgent.tsx` (the ask-mode tool panels remain, but only as standalone analysers, no longer a numbered journey).
- `tools/check-banzai-single-interface.sh` enforces the replacement:
  - assertion 8 — `VALIDATION_STEP_IDS` contains all nine canonical ids and **exactly nine**;
  - assertion 9 — no legacy 7-step markers (`JOURNEY_STEPS`, `0/7`, `7 etapas`, `journeyLength`) anywhere under `website/components/banzai/**`.

Metrics (§39): `banzai_validation_journeys = 1` · `banzai_validation_steps = 9` · `banzai_legacy_seven_step_journeys = 0`.

## Live QA (production, single shell)

Full journey executed in-shell: **9/9 · Bloqueado**, **RECEIPTS (9)**, Discovery **VERIFIED**, honest `NOT_CERTIFIED` aggregate, `qwen_calls: 0`. Unit coverage: `validationJourney.test.ts` (plus `operationReceipt.test.ts`, `banzaiValidation.test.ts`), part of vitest 366/366.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. The canonical 9-step journey (Discovery → Certification Readiness) is the only validation journey; each step's verdict comes from a Rust engine (step 9 an honest deterministic PREVIEW aggregation), each produces a receipt, and the legacy 7-step journey is removed and guarded against return.
