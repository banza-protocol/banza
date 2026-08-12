# BanzAI Interface Duplication Audit (M2.19E/F.2)

**The regression: two BanzAI applications, two shells, two journeys, two navs — consolidated into one.**

**Status:** RESOLVED + LIVE — 2026-07-29

## Pre-state (the duplication)

Before this milestone BanzAI presented as **two parallel products**:

| Dimension | Surface A | Surface B (duplicate) |
|---|---|---|
| Route | `/banzai` — the "BanzAI" agent (ask + tool panels) | `/banzai/validar` — the standalone "Validation Workbench" |
| Brand | BanzAI | "BanzAI Web" / "BanzAI Web Validation Workbench" |
| Shell/layout | Agent shell (sidebar + workspace + context panel) | Its own page chrome, header and layout |
| Journey | ask-mode analysers + a legacy Operador Zero step-gating "journey strip" (7-step) | the Workbench's own validation flow |
| Session/state | ask-side React state + a legacy in-browser Operador Zero evidence-session | the Workbench's separate session |
| Nav | agent tabs | separate workbench navigation |

The same responsibilities — header, navigation, session/state store, journey/step model, receipt handling, boundary copy, and the "target" concept — were **implemented twice**. Two entry points meant two things to keep in sync, two places for boundary/neutrality copy to drift, and a real risk of the two disagreeing about verdicts, targets or certification status.

## What was consolidated

Everything collapsed into **one shell at one route**, `/banzai`, with **two modes of the same shell**:

- **Single shell** — `website/components/banzai/BanzaiAgent.tsx` renders one three-column layout (sidebar · workspace · sources/context) for both modes. Switching mode is pure React state (`setMode`) — no route change, no second app, no remount.
- **Single session** — validation is owned by one hook, `useValidationSession` (`website/components/banzai/validationJourney.tsx`), always mounted so switching modes never loses target, progress or receipts. Ask-mode tool state is ordinary React state in the same component.
- **Single URL-state contract** — `parseBanzaiState` (`website/lib/banzaiState.ts`), read server-side in `website/app/banzai/page.tsx`, resolves `mode/target/workflow/step` against closed allowlists on first paint.
- **Single journey** — the legacy 7-step Operador Zero step-gating strip and the legacy in-browser evidence-session model were deleted; the canonical 9-step journey is the only journey (see `BANZAI_NINE_STEP_JOURNEY_REPORT.md`).
- **Single brand** — "BanzAI Web" and "Validation Workbench" removed as product names (see `BANZAI_NAMING_CANONICALIZATION_REPORT.md`).

The parallel route `/banzai/validar` and the `ValidationWorkbench` component were deleted outright (see `BANZAI_VALIDAR_ROUTE_REMOVAL_REPORT.md`).

## Enforcement against re-duplication

`tools/check-banzai-single-interface.sh` (15 assertions) is the hard gate: it fails the build if `website/app/banzai/` grows a second route folder or any non-`page.tsx` file, if the retired route/brand/product re-enters active surfaces, or if the step/target registries drift. The prior workbench guard (`check-banzai-operator-validation-workbench.sh`) was removed; 8 guards that pinned the old two-app model were realigned to the single-interface contract (PRs #224/#225).

Metrics (§39): `banzai_public_application_routes = 1` · `banzai_application_shells = 1` · `banzai_session_stores = 1` · `banzai_validation_journeys = 1` · `banzai_legacy_seven_step_journeys = 0`.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1` (consolidation); PR #225 → `5b57cc4` (guard realignment, CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** RESOLVED. The interface duplication is gone: one route, one shell, one session, one journey, one brand. What was two applications kept in fragile sync is now two modes of a single source of truth, with an automated guard preventing the second application from re-appearing.
