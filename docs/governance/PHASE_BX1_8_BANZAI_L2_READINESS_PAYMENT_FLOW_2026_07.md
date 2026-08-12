# BANZA / BanzAI — Phase BX1.8: L2 Readiness and Payment-Flow Preparation

**Date:** 2026-07-16
**Branch:** `feat/bx1-8-banzai-l2-readiness-payment-flow-2026-07`
**Scope:** Prepare the BanzAI Workbench for **L2 technical validation in local/demo mode** — the essential
BANZA payment flows — without moving real funds, without a real operator, and without contacting
production. New Rust/WASM engine that validates a payment intent, idempotency handling, double-entry
ledger postings, trace linkage, a settlement obligation and an evidence reference, aggregated over the
Operator Manifest, SimB, Conformidade L0 and L1 readiness reports.
**Central rule:** L2 Readiness é preparação técnica de fluxo de pagamento. **Não é pagamento real, não é
certificação, não é aprovação, não cria operador e não move fundos.**

## Contract (Part 1 & 2)

Canonical shapes drive the fixtures (no invented fields):
- **PaymentIntent** — `contracts/payment-intents/payment-intent.schema.json` (ADR-014): `id`,
  `operator_id`, `payee_wallet_id`, `merchant_id`, `amount_minor` (integer minor units, never float),
  `currency`, `surface`, `status`, `transfer_id`, `idempotency_key`, `created_at`; trace linkage via the
  Transfer's causation (INV-TRACE-001).
- **Ledger entries** — `conformance/vectors/ledger-postings.json`: `kind` (DEBIT/CREDIT), `amount_minor`,
  `currency`, `trace_id`, `correlation_id`; zero-sum (DEBIT = CREDIT), trace-linked.
- **ApplicationSettlement** — `contracts/settlements/application-settlement.schema.json` (ADR-019):
  `amount_minor` (gross), `application_fee_minor` (fee); net = gross − fee.

## Architecture decision (Part 3)

**New crate `engines/banza-l2-readiness`** (`rlib`+`cdylib`, `wasm` feature; deps serde/serde_json/sha2 —
NO engine deps). It reads the upstream reports' status fields AND validates the payment-flow artifacts,
computing the L2 status/readiness, the payment-flow / idempotency / ledger / trace / settlement checks and
SHA-256 hashes **entirely in Rust**. Local, no network. Kept a separate single-responsibility crate;
reused by `banza-evidence-bundle` (demo builds a real L2 report).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **`banza-l2-readiness`** — `validate_l2` (status + readiness + payment-flow/idempotency/ledger/trace/settlement checks + SHA-256 hashes, **all in Rust**), `demo_fixtures`, `schema`, `tool_version`. Local, no network; operator payment-URL validation `disabled`. 12 tests. CI job added. |
| Engine (Rust) | `banza-evidence-bundle` accepts `l2_readiness` (recommended artifact) + surfaces an `l2_readiness_summary`; demo includes a real L2 report. `banzai-evidence` gains the `l2_readiness` intent + `l2` citation. |
| WASM | `banza_l2_readiness*` (only `l2_readiness_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaL2Readiness.ts` — load+marshal only; `l2StatusTone` render-only. |
| UI | Conformidade → `Preparação L2 · fluxo de pagamento` (10-item checklist, fixture selector, Validar/Usar-estado-actual, per-artifact summaries, report); Programadores → `Fluxo de pagamento L2` (payment-intent structure, idempotency/ledger/trace/settlement/evidence, relations, disabled real-payment endpoint); Evidence Bundle → `L2 readiness report` artifact. New `coins` icon. |
| Docs | `PHASE_BX1_8_…md` + `L2_READINESS.md`. |

### WASM exports

```
l2_readiness_validate_json, l2_readiness_demo_fixtures_json,
l2_readiness_schema_json, l2_readiness_tool_version_json
```

### Report envelope

`status`, `readiness`, `required_artifacts`, `recommended_artifacts`, `missing_artifacts`,
`invalid_artifacts`, `payment_flow_summary`, `idempotency_summary`, `ledger_summary`, `trace_summary`,
`settlement_summary`, `evidence_summary`, `warnings`, `next_steps`, `operator_url_validation: "disabled"`,
`report_id`, `l2_report_hash`, `boundary`, `tool`, `tool_version`, `not_a_payment: true`,
`not_a_certificate: true`, `not_an_approval: true`, `does_not_move_funds: true`,
`does_not_create_operator: true`, `requires_banza_ca_review: true`, `test_only: true`, `llm_calls: 0`,
`external_model_called: false`.

### Status values (Rust, precedence order)

`L2_INVALID` (production/real-payment claim) → `L2_BLOCKED_BY_MANIFEST` → `_BY_SIMB` → `_BY_L0` →
`_BY_L1` → `_BY_PAYMENT_FLOW` → `_BY_IDEMPOTENCY` → `_BY_LEDGER` → `_BY_TRACE` → `_BY_SETTLEMENT` →
`L2_INCOMPLETE` → `L2_READY_FOR_TECHNICAL_REVIEW`.

### Fixtures (TEST ONLY — NOT PRODUCTION; no real money)

`l2_ready_payment_flow` → READY · `idempotency_fail` → BLOCKED_BY_IDEMPOTENCY · `ledger_fail` →
BLOCKED_BY_LEDGER · `trace_fail` → BLOCKED_BY_TRACE · `settlement_fail` → BLOCKED_BY_SETTLEMENT ·
`missing_l1` → INCOMPLETE · `production_claim` → INVALID.

## Verification (all green)

- Rust: fmt/clippy(-D warnings)/test — l2-readiness (12), evidence-bundle (10), banzai-evidence (incl.
  4 new L2 tests + kb regression). `rust-engine-check` (new crate), `rust-rule-check`,
  `rust-final-closure-check`, `conformance-rs-check`, `simb-rs-check`, `purity-check`, `identity-check`,
  `invariant-check`, `reference-svg-check` ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` (48) ✓.
- Sweeps: no "corpus", no public "KB", no forbidden payment/certification claims — zero NEEDS_FIX.
- Adversarial review (boundary/no-real-payment · readiness-in-Rust · no-network): 0 confirmed.
- Live browser E2E: `l2_ready_payment_flow` → L2_READY_FOR_TECHNICAL_REVIEW; `idempotency_fail` →
  L2_BLOCKED_BY_IDEMPOTENCY; `ledger_fail` → L2_BLOCKED_BY_LEDGER; Programadores payment flow;
  Assistente "L2 readiness é pagamento real?" → denial; `llm_calls=0`; zero external calls; no "corpus".

## Boundary / state preserved

Local validation, no network (operator payment-URL validation explicitly `disabled`). An
`L2_READY_FOR_TECHNICAL_REVIEW` result is technical preparation of a payment flow — it does not move
funds, is not a real payment, does not certify, does not approve, does not create an operator, and does
not run the BANZA CA review. Money is integer minor units; no fixture is real money. `/operators=[]`,
`production_certificates=false`, no M2/M3, provider mock, `llm_calls=0`. Status/readiness computed in
Rust, never in TypeScript. Evidence Bundle minimum readiness (SimB + L0) is unchanged; L1/L2 are
additional next-level readiness.
