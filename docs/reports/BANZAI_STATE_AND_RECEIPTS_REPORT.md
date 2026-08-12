# BanzAI State & Receipts Model (M2.19E/F.2)

**One validated state source; one receipt model; state preserved across mode switches; every query param closed and safe.**

**Status:** COMPLETE + LIVE — 2026-07-29

## Single state source

`parseBanzaiState` (`website/lib/banzaiState.ts`) is the single contract that turns request query params into a typed, always-valid `BanzaiState`:

```ts
interface BanzaiState {
  mode: "ask" | "validation";
  target: ValidationTarget;   // always a real target
  targetKnown: boolean;       // false when the requested target was off-list
  workflow: ValidationWorkflow;
  step: ValidationStepId | null;
  view: "guia" | null;
}
```

It is read **server-side** in `website/app/banzai/page.tsx` so the correct mode/step renders on first paint (no flash, no hydration divergence, survives refresh / new tab / shared URL). The client keeps mode/view in sync with the URL on `popstate` (back/forward). Mode itself is then pure React state in `BanzaiAgent` — switching it changes no route and resets no session.

The validation runtime state is owned by one hook, `useValidationSession` (`website/components/banzai/validationJourney.tsx`): `results` (per-step status/reason_codes/evidence/receipt), `activeStep`, `journeyReceipt`, `progress`, `blockers`, `evidence`, `receipts`, `targetInfo`.

## Receipt model

`website/lib/operationReceipt.ts` defines the two record types — UI provenance, not protocol artifacts:

- **`OperationReceipt`** (per executed step): `operation_id`, `request_id`, `workflow`, `step`, `actor: "banzai-web"`, `target: "operator-zero"`, `timestamp`, `engine` + `engine_version`, `duration_ms`, `inputs` + `input_hashes`, `result`, `status`, `reason_codes`, `outputs` + `output_hashes`, `evidence_references`, and `qwen_calls: 0` / `external_calls: 0` (typed as literal `0`).
- **`JourneyReceipt`** (per run): binds all step receipts with `journey_id`, `overall_status`, `certification_status: "NOT_CERTIFIED"`, `certification_readiness: "PRE_PRODUCTION"`, `demo_only: true`, `step_count`, and `qwen_calls`/`external_calls` fixed at `0`.

Hashes are SHA-256 over canonical JSON via `crypto.subtle` (`sha256:` prefix), with a deterministic non-crypto fallback (`fnv1a32:`) so the type stays usable everywhere. Receipts are read-only (no network, no mutation) and exportable as pretty JSON (`downloadReceipt`).

## Preservation across mode switches

`useValidationSession` is **always mounted** — including in ask mode — so switching Perguntar ↔ Validar never loses the target, progress, receipts or journey receipt. The same receipts surface in three places off the one store: the validation workspace, the right context panel (`RECEIPTS (n)`), and the ask-mode "Receipts" resultado panel (`ValidationReceiptsPanel`). Ask-mode conversation and tool state live in the same `BanzaiAgent` component and likewise persist while the user is in validation mode.

## Safe query params

Every param resolves against a closed allowlist and `parseBanzaiState` never throws:

- `mode` → `validation` only when literally `"validation"`, else `ask`;
- `target` → `resolveTarget` (closed registry); off-list → default Operador Zero + `targetKnown=false`;
- `workflow` → `resolveWorkflow` (closed set of 9 steps + `full`); unknown → `full`;
- `step` → `resolveStep` (closed 9-step set); off-list/`full` → `null` (shell starts at discovery); also derived from a step-shaped `workflow`;
- `view` → `guia` only.

No caller-supplied URL is ever fetched → SSRF / path-traversal / injection impossible by construction. Unit coverage: `banzaiState.test.ts` + `operationReceipt.test.ts` + `banzaiValidation.test.ts` (part of vitest 366/366).

Metrics (§39): `banzai_receipt_losses = 0` · `arbitrary_target_acceptance = 0` (closed allowlist) · `qwen_decision_calls = 0` · `external_model_calls = 0`.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. State flows from one validated source (`parseBanzaiState`) into one always-mounted session; receipts follow one hash-bound model (`OperationReceipt` + `JourneyReceipt`, `qwen_calls: 0`/`external_calls: 0`); state survives mode switches; every query param is closed and SSRF-safe.
