# BANZA / BanzAI — Phase BX1.4: Mandatory SimB Pre-Review Gate

**Date:** 2026-07-16
**Branch:** `feat/bx1-4-mandatory-simb-pre-review-gate-2026-07`
**Scope:** Formalize and wire, throughout the BanzAI Workbench, the normative rule that every candidate
operator must pass SimB before any real BANZA CA review.
**Rule:** *Todo operador candidato deve passar por SimB antes de qualquer revisão real pela BANZA CA.*

## Racional

SimB is the mandatory technical pre-validation environment. A candidate operator runs its BANZA flows
against SimB (ledger, idempotency, settlement, traces, initial conformance), obtains **technical
pre-review evidence**, and only then submits for real review. The gate reduces failures before the
BANZA CA spends review cycles. **SimB does not certify, does not approve, does not create a real
operator, does not touch `/operators` or `/certificates`, and does not move real funds.** The real
review stays with the BANZA CA, **outside the BanzAI Workbench**.

## Fluxo

```
SimB (obrigatório) → Conformidade L0 → Evidence Bundle → Revisão BANZA CA (externa ao Workbench)
```

## What shipped

| Area | Change |
|---|---|
| Governance | `docs/governance/SIMB_PRE_REVIEW_GATE.md` — the normative rule, definition, boundary, statuses (`SIMB_PRE_REVIEW_PASS/FAIL/INCOMPLETE`), and terminology. |
| Engine — `banza-simb` | `run_scenario` envelope gains `pre_review_gate: true`, `pre_review_status` (computed in Rust), `not_a_certificate: true`, `required_before_banza_ca_review: true`, `disclaimer`. |
| Engine — `banza-conformance` | L0 report gains `pre_review_gate`, `simb_pre_review_status`, `ready_for_banza_ca_review` (**true only when SimB PASS + L0 PASS**), `ready_disclaimer` = "Ready for BANZA CA review is not certification." |
| Engine — `banzai-evidence` | Two answer intents: SimB is a mandatory pre-validation step; a SimB PASS is technical evidence, not certification; the BANZA CA decision is separate/external. New `simb` citation. |
| Website | `SimbPreReviewState` (browser-local, never persisted/sent). SimB tab: "Etapa obrigatória antes da revisão" badge + rule. Conformidade tab: `Pré-requisito: SimB` block (execute / PASS / blocked). Evidence tab: mandatory `SimB pre-review report` item (missing/pass/fail/incomplete). A `PreReviewFlow` stepper (SimB → Conformidade L0 → Evidence → Revisão BANZA CA) where BANZA CA review is **informative, not a button**. Assistente example prompts added. |

### Status is decided in Rust

`pre_review_status` and `ready_for_banza_ca_review` are computed in the Rust engines. The TS layer only
marshals JSON and maps a Rust-computed status to a UI state (`deriveSimbPreReviewState` is a render-only
mapping). TypeScript never decides a verdict or readiness.

### Educação livre, revisão bloqueada

The rule does not artificially block the demo tools: a visitor can still open Conformidade, read the
L0–L4 requirements, and run an educational fixture. Only the **"pronto para revisão"** language depends
on a SimB PASS.

## Verification (all green)

- **Rust:** `cargo fmt`/`clippy`/`test` — banza-simb (10 scenario + 6), banza-conformance (12 + 9),
  banzai-evidence (3 boundary + 6 kb + 3 SimB-gate). `make simb-rs-check`, `conformance-rs-check`,
  `rust-final-closure-check` (live+fed still PASS), `rust-rule-check` ✓.
- **Website:** `tsc`, `next lint`, `next build` (both `/banzai` routes, 123 kB), `vitest` (19) ✓.
- **Repo gates:** `purity`/`identity`/`invariant`/`reference-svg` ✓. Forbidden-claims sweep: zero
  NEEDS_FIX (all hits are refusal/question match-keywords or negated boundary facts).
- **Live browser E2E:** Conformidade before SimB → "Execute SimB antes"; SimB badge + rule; SimB PASS →
  Conformidade "SimB PASS técnico — pronto" → L0 → "Pronto para revisão BANZA CA (evidência técnica)"
  + "Ready for BANZA CA review is not certification"; SimB FAIL → "Bloqueado por falhas SimB" + Evidence
  item `fail`; Assistente "Posso ir para revisão sem SimB?" → mandatory / not-certification / BANZA CA,
  never allows skipping; `llm_calls=0`; zero external network calls; console clean.

## Boundary preserved

SimB PASS is technical evidence, not certification. `ready_for_banza_ca_review` is technical readiness
evidence, not approval. BanzAI does not certify, approve, or emit certificates. `/operators = []`,
`production_certificates = false`, no operator created, no M2/M3. The BANZA CA review is external to the
Workbench.
