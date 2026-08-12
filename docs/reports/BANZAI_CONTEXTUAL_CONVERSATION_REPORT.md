# BanzAI Contextual Conversation: Ask ↔ Validation (M2.19E/F.2)

**One shell means shared context: a validation step can hand its verdict to the conversation with a click — and Qwen only explains, never decides.**

**Status:** COMPLETE + LIVE — 2026-07-29

## Shared context across the two modes

Because ask and validation are two modes of **one** `BanzaiAgent` shell (not two apps), the conversation and the validation session coexist in the same component. The validation session (`useValidationSession`) stays mounted in both modes, so a user can move from a step verdict to a question and back without losing either.

## "Explicar no BanzAI" — attaching step context to the conversation

The validation workspace (`BanzaiValidationMode.tsx`) offers **"Explicar no BanzAI"** on the active step. It calls `explainPrompt(session, stepId)`, which composes a prompt carrying:

- the step **title** and its **Rust engine** (`motor …`);
- the **verdict already computed** by that engine — the step `status` and its first reason code;
- an explicit instruction that Qwen explains only: *"o Qwen não decide o resultado — apenas explica o veredicto já calculado pelos motores Rust."*

The prompt is routed through `askInChat(text)`, which switches to ask mode, selects the conversation panel, and submits. The ask-mode tool panels do the same via "Perguntar ao BanzAI" (e.g. `l0AskPrompt`, `trustAskPrompt`, `bundleAskPrompt`), attaching the relevant report state (status, failures, target) into the question.

Target and evidence context are surfaced alongside in the shared right-hand context panel (Target · Progresso · Bloqueios · Evidence · Receipts · Fontes), and receipts (with their engine, hashes and `qwen_calls: 0`) remain visible while the user asks. Context is carried by composing an explicit prompt from the session — an auditable text hand-off, not a hidden data channel.

## Qwen explains; Rust decides

- **Validation verdicts** are produced entirely by the Rust/WASM engines; every `OperationReceipt`/`JourneyReceipt` records `qwen_calls: 0`, `external_calls: 0`. No model call ever touches a validation result.
- **Ask answers** come from the local, on-host Qwen backend (same-origin `/banzai/ask`, llama.cpp, reasoning disabled) — `external_calls: 0`, nothing leaves the host. When a user asks BanzAI to *explain* a step, the model narrates the verdict Rust already computed; it cannot execute a test, select a result, change a state, waive a requirement, produce a PASS, or emit a certification record.

This is the ADR-067 operational rule in the UI: **BanzAI initiates · Operador Zero responds · Rust evaluates · the evidence demonstrates · the Registry publishes · Qwen explains** (`qwen_decision_calls = 0`, `external_model_calls = 0`).

## Verified

- Live QA: full journey run in-shell with `qwen_calls: 0` on every receipt; ask mode answers via `/banzai/ask` (backend `GET` returns 405 JSON per M2.9F; POST answers locally).
- Metrics (§39): `qwen_decision_calls = 0` · `external_model_calls = 0` · `typescript_verdict_decisions = 0`.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. Ask and validation share one shell and one context; "Explicar no BanzAI" hands a step's engine, verdict and reason code to the conversation as an explicit, auditable prompt; Qwen explains and never decides (`qwen_calls: 0`).
