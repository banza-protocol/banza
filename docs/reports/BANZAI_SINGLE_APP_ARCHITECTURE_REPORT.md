# BanzAI Single-App Architecture (M2.19E/F.2)

**One shell, one session, one context panel, one results/receipt store — two modes.**

**Status:** COMPLETE + LIVE — 2026-07-29

## The single shell

`/banzai` renders exactly one component tree, `BanzaiAgent` (`website/components/banzai/BanzaiAgent.tsx`), mounted by the server component `website/app/banzai/page.tsx`. It is a three-column layout that is identical across both modes — only the workspace and context contents change:

```
┌───────────────┬───────────────────────┬──────────────────────┐
│  SIDEBAR      │      WORKSPACE         │  SOURCES & CONTEXT    │
│  (nav)        │  (<main>)             │  (right aside)        │
│               │                       │                      │
│  MODOS        │  ask: conversation /  │  ask: CITAÇÕES /      │
│  JORNADA DE   │       tool panel      │       tool context   │
│  VALIDAÇÃO    │  validation: header + │  validation: Target· │
│  RECURSOS     │       9-step          │  Progresso·Bloqueios·│
│  RESULTADOS   │       workspace        │  Evidence·Receipts·  │
│               │                       │  Fontes              │
│               │                       │  + FRONTEIRA·ESTADO  │
└───────────────┴───────────────────────┴──────────────────────┘
```

On desktop it is a CSS grid (`lg:grid-cols-[…232-288px…_1fr_…252-336px…]`); on narrow screens it reflows to a single stacked column. Switching between "Perguntar ao BanzAI" and "Validar uma implementação" is pure state (`setMode`) — no route change, no remount, no second shell.

## The sidebar: four groups

Rendered by `BanzaiAgent` from `MODES` / `TABS` (`website/components/banzai/banzai-agent.ts`):

- **MODOS** — `Perguntar ao BanzAI` (ask) · `Validar uma implementação` (validation).
- **JORNADA DE VALIDAÇÃO** — shown only in validation mode; the 9-step spine (`ValidationStepNav`).
- **RECURSOS** — Guia · Referência · Programadores · Repositório (external link).
- **RESULTADOS** — Receipts · Relatórios · Traces · Artefactos · Evidence Bundle.

Selecting a Recursos/Resultados tab drops into ask mode and shows that panel; selecting a mode switches the whole shell.

## Single session / state / receipt store

- **Validation session** — `useValidationSession` (`website/components/banzai/validationJourney.tsx`) is the single source of truth for validation: `results`, `activeStep`, `journeyReceipt`, `progress`, `blockers`, `evidence`, `receipts`, `targetInfo`. It is **always mounted** (even in ask mode) so mode switches never lose state.
- **Ask-mode state** — conversation, citations and tool reports live in ordinary React state in the same `BanzaiAgent` component.
- **Receipt store** — one model (`OperationReceipt` + `JourneyReceipt`, `website/lib/operationReceipt.ts`); the same receipts render in the validation context panel, the workspace, and the ask-mode "Receipts" resultado panel.

## Component inventory

| File | Role |
|---|---|
| `website/app/banzai/page.tsx` | Server entry; `parseBanzaiState` → `initialState` → `<BanzaiAgent>` |
| `website/components/banzai/BanzaiAgent.tsx` | The single shell; owns mode, ask state, tool state; mounts the validation session |
| `website/components/banzai/BanzaiValidationMode.tsx` | Validation UI slots: `ValidationStepNav`, `ValidationHeader`, `ValidationWorkspace`, `ValidationContextPanel`, `ValidationReceiptsPanel` |
| `website/components/banzai/validationJourney.tsx` | `useValidationSession` hook + `STEPS` + per-step Rust/WASM runners |
| `website/lib/banzaiState.ts` | `parseBanzaiState` — validated URL-state |
| `website/lib/banzaiValidation.ts` | closed target/workflow/step registries + deep-link builders |
| `website/lib/operationReceipt.ts` | `OperationReceipt`/`JourneyReceipt` + hashing + export |

Metrics (§39): `banzai_application_shells = 1` · `banzai_session_stores = 1` · `banzai_validation_journeys = 1`.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. BanzAI is a single application: one shell, one session, one context panel and one receipt store, with a Modos/Jornada/Recursos/Resultados sidebar. Modes are state, not routes.
