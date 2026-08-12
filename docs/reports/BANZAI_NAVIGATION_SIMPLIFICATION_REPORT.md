# BanzAI Navigation Simplification — M2.19G.1 (ADR-068 §29, §12, §24, §27)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 · **Related:** ADR-054 (BanzAI single interface)
- **Date:** 2026-07-30

## 1. Starting state (audit)

`docs/reports/BANZAI_OPERATOR_VALIDATION_UX_AUDIT.md` documented a sidebar that carried **two competing
progress models, orphan tabs, relabelled tabs, and receipts shown three times**:

- A flat `RESULTADOS` tab group (Receipts, Relatórios, Traces, Artefactos, Evidence Bundle) whose labels
  disagreed with the panels they opened (Relatórios→"Conformidade", Artefactos→"Manifest").
- **Two orphan tabs** (`trust`, `simb`) renderable via `renderPanel` but absent from the sidebar list,
  reachable only through cross-links.
- A **second, competing progress model** (`PreReviewFlow` "PRÉ-REVISÃO OBRIGATÓRIA" strip) alongside the
  9-step journey, with its own `locked/incomplete/pending/external` status vocabulary.
- Duplicate navigation: journey step ↔ Resultados tab for manifest, conformance, trust, federation,
  evidence.

## 2. Target structure delivered

The shell now has a **single "Resultados" area** with in-area sub-views, not a flat tab list
(`website/components/banzai/banzai-agent.ts:13`, `TABS`/`TAB_META`):

```
Modos
  • Perguntar ao BanzAI        (ask — the conversation)
  • Validar operador           (the ONE official journey, endpoint-originated — ADR-068 §4.1)

Jornada de validação           (9 steps, each fetching a PUBLISHED endpoint)
  1 Discovery … 9 Certification Readiness

Resultados                     (ONE sidebar entry; in-area sub-views — ADR-068 §29)
  Resumo · Receipts · Relatórios · Artefactos · Traces · Evidence Bundle

Recursos
  • Guia · Referência · Programadores   (Repositório link moved into Programadores)
```

- The human-facing mode is **"Validar operador"** (`MODES`, `banzai-agent.ts:73`); the header reads
  "Validação técnica de implementação"; the object evaluated is an implementation (ADR-068 §4.1/§4.2).
- `RESULTS_VIEWS` (`BanzaiValidationMode.tsx:62`) is the single set of six in-area sub-views
  (`resumo, receipts, relatorios, artefactos, traces, evidence`) — one surface, in-area tabs, **not**
  sidebar entries (ADR-068 §29).

## 3. What was removed

- The flat multi-entry `RESULTADOS` tab group → collapsed to one `resultados` sidebar entry.
- The two orphan tabs (`trust`, `simb`) → no renderable panel is absent from the sidebar list.
- The `PreReviewFlow` competing progress model and its parallel status vocabulary.
- The label-vs-panel-title divergence (Relatórios/Artefactos relabelling).
- The paste/upload/fixture analysers → moved to **Programadores** (`ProgramadoresTools.tsx`), out of the
  primary journey (see `DRAFT_VALIDATION_ISOLATION_REPORT.md`).
- The vestigial disabled URL input and the "endpoint desactivado" rows → replaced by the real
  registry-resolved endpoint origin.

`BanzaiAgent.tsx` shrank by ~3,178 lines net in this change (diffstat) as the duplicate stores, orphan
panels and competing flow were removed.

## 4. Fase 0 — operator + implementation selection (ADR-068 §12)

`BanzaiValidationMode.tsx:96` renders **Fase 0 · contexto**: the human selects an operator, then one of
its published implementations, from the closed registry (`session.operators / operator / implementation`).
Only after a target is selected does the journey offer "Executar primeira etapa" / "Executar jornada
completa". This makes the operator–implementation model (see
`OPERATOR_IMPLEMENTATION_DOMAIN_MODEL_REPORT.md`) the entry point, not an afterthought.

## 5. Contextual step actions (ADR-068 §24)

The primary step action is now **state-contextual** (`BanzaiValidationMode.tsx:344-399`):

- not-yet-run → **Executar esta etapa** (primary) + Executar a partir daqui;
- VERIFIED/evaluated → **Ver receipt** (primary) + Executar novamente + Explicar este resultado;
- all evaluated → **Executar jornada completa** / Executar primeira etapa.

This replaces the audit's finding that "Executar esta etapa" stayed the primary button even after a step
was VERIFIED/FAILED, with no relabel to the natural next action.

## 6. Contextual right panel (ADR-068 §27)

The header carries the static target metadata; the right panel is **contextual only** — progresso,
próxima acção, bloqueios, endpoint seleccionado, evidência da etapa, fontes
(`BanzaiValidationMode.tsx:475`) — instead of permanently restating the header's TARGET + PROGRESSO. This
removes the audit's "two surfaces, one dataset" duplication.

## 7. Guard coverage

| Guard | Locks |
|---|---|
| `banzai-operator-validation-mode-check` | sidebar mode is "Validar operador" (§4.1) |
| `banzai-single-results-area-check` | ONE Resultados entry with in-area sub-views (§29) |
| `banzai-no-duplicate-tabs-check` | no step also appears as a persistent Resultados tab (§29) |
| `banzai-no-orphan-tabs-check` | no renderable panel absent from the sidebar (no trust/simb orphans) (§29) |
| `banzai-contextual-actions-check` | step actions are state-contextual (§24) |
| `banzai-contextual-right-panel-check` | header static; right panel contextual only (§27) |
| `banzai-operator-implementation-model-check` | Fase 0 selects operator THEN implementation (§12) |

## 8. Result

A single, coherent validation surface: one mode, one journey, one Resultados area, one status vocabulary,
one receipt surface (see `BANZAI_RESULTS_CONSOLIDATION_REPORT.md`), with contextual actions and a
contextual panel. The two competing progress models, the orphan/relabelled/duplicated tabs, and the
scattered manual-input surfaces are gone.
