# BanzAI Results Consolidation — M2.19G.1 (ADR-068 §29)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 §29
- **Date:** 2026-07-30

## 1. Problem

The audit (`docs/reports/BANZAI_OPERATOR_VALIDATION_UX_AUDIT.md` §6) found results, receipts, artifacts
and evidence **shown more than once**:

- **Receipts in three views** — the workspace "Painel técnico (recibo)" + raw JSON, the
  `ValidationContextPanel` RECEIPTS section, and the `ValidationReceiptsPanel` tab. `JourneyReceipt` was
  likewise shown in the workspace, the Receipts tab and echoed as `request_id` in the context panel.
- **Header-vs-context metadata duplication** — the 8-field header grid restated by the right panel.
- **~6 ask-mode right-panel restatements** — each analyser tab's right panel restated its own body.
- **A second session store** — ~18 report `useState` slots in ask mode, separate from
  `useValidationSession`, driving the redundant right-panel context.

## 2. The single Resultados area

Results now live in **one** area with six in-area sub-views (`BanzaiValidationMode.tsx:60-69`,
`RESULTS_VIEWS`):

| Sub-view | Shows |
|---|---|
| **Resumo** | overall outcome, blockers, next action, endpoints consulted |
| **Receipts** | the single receipt surface (per-step `OperationReceipt` + the `JourneyReceipt`) |
| **Relatórios** | per-step Rust verdicts |
| **Artefactos** | the fetched artifacts + their content hashes |
| **Traces** | journey trace evidence (read-only) |
| **Evidence Bundle** | the fetched, validated bundle |

These are in-area tabs (`view` state, `setView`), **not** separate sidebar entries (§29). The empty state
points the human back to Fase 0: *"Ainda não há resultados. Abra Validar operador, seleccione um operador
e uma implementação, e execute a jornada…"* (`:654`).

## 3. Receipts: 3 → 1

The server-issued receipts (`website/lib/operationReceipt.ts` — `ServerOperationReceipt` /
`ServerJourneyReceipt`) are rendered in **one** place: the Receipts sub-view. The workspace's per-step
view and the context panel no longer carry their own receipt copies; contextual actions route to the
single surface (e.g. "Ver receipt" → `onOpenResults("receipts")`, `BanzaiValidationMode.tsx:382`;
"Ver receipts" from the Resumo, `:698`). `downloadReceipt` accepts any receipt shape and is the single
export path.

## 4. Metadata: header static, panel contextual

Static target metadata (operator, implementation, environment, profile, protocol version, canonical
origin) lives on the header; the right panel is contextual only (progresso, próxima acção, bloqueios,
endpoint seleccionado, evidência da etapa — `:475`). The header is no longer restated by the panel
(see `BANZAI_NAVIGATION_SIMPLIFICATION_REPORT.md` §6).

## 5. One session store, one status vocabulary

The ask-mode second results store and its ~18 `useState` slots are removed; the validation surface reads
`useValidationSession` only. The single status vocabulary is `VERIFIED / PENDING / FAILED / BLOCKED /
NOT_EVALUATED` (`operationReceipt.ts :: StepStatus`); the `PreReviewFlow` `locked/incomplete/pending/
external` vocabulary is gone.

## 6. Readiness ≠ status in the Resumo

The Resumo separates **progress** ("steps evaluated") from **outcome**. Certification Readiness (READY /
BLOCKED) is shown distinctly from Certification Status (always NOT_CERTIFIED) — the audit's confusing
"9/9 · Bloqueado" (which read as failure when it only meant NOT_CERTIFIED-because-demo) no longer appears.
This is locked by `banzai-certification-readiness-language-check` (see
`OPERATION_RECEIPT_ORIGIN_BINDING_REPORT.md` §7).

## 7. Guard coverage

- `banzai-single-results-area-check` — ONE Resultados sidebar entry with the six in-area sub-views (§29).
- `banzai-no-duplicate-tabs-check` — no step also persists as a Resultados tab (no manifest/conformance/
  trust/federation/evidence duplication) (§29).
- `banzai-no-orphan-tabs-check` — no renderable panel absent from the sidebar (§29).
- `banzai-contextual-right-panel-check` — no permanent header duplication in the panel (§27).

## 8. Result

One surface, six sub-views, one receipt view, one session store, one status vocabulary, and readiness
kept distinct from status. Every duplication catalogued in the audit §6 is resolved.
