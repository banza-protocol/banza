# M2.19E/F.2 — Production Validation Report

**BanzAI Canonical Unified Interface · Native Protocol Validation · permanent removal of `/banzai/validar`**

**Status:** COMPLETE + LIVE — 2026-07-29

## Change set

- **Base (rollback):** `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799` (pre-milestone main).
- **PR [#224](https://github.com/banza-protocol/banza/pull/224)** — consolidation → squash-merged to main `e9959d1`. CI flagged 8 guards still pinning the removed legacy journey/session/nav model (caught by CI, not local subset).
- **PR [#225](https://github.com/banza-protocol/banza/pull/225)** — guard realignment (8 guards → single-interface contract, mutation-tested) → squash-merged to main `5b57cc4`. **CI 169 pass / 0 fail.**
- **Deployed** (repo `5b57cc4`): website `sha256:7539d7aee51ae5f35f94041906fd60a03ab9cf30cef9d613720b1e18ca26cd78`; banzai-api `sha256:738997a04257a4091312cf09f66d39b8e85e87f104a19cf42c9564cb7b732219`. reverse-proxy restarted; both containers healthy.

## Architecture delivered

BanzAI is now **one canonical interface at `/banzai`** with two modes of a single shell (one header, sidebar, workspace, right context panel, session, receipt store):
- **Ask** (`?mode=ask`, default) — conversation, sources, references (backend `/banzai/ask`, local Qwen, `external_calls:0`).
- **Validation** (`?mode=validation&target=operator-zero&workflow=full[&step=…]`) — the 9-step journey (Discovery, Manifest, Keys, Conformance, Interoperability, Trust, Federation, Evidence Bundle, Certification Readiness) executed in-shell by the protocol's Rust/WASM engines via `useValidationSession`, with an OperationReceipt per step and a JourneyReceipt.

Removed: the parallel route `/banzai/validar` (+ `ValidationWorkbench`), the "BanzAI Web" brand, the standalone "Validation Workbench" product, and the legacy 7-step operator journey. Safe query state (`mode`/`target`/`workflow`/`step`) resolves against closed allowlists (`parseBanzaiState`) — SSRF/injection impossible by construction. Rust decides every verdict; Qwen only explains (`qwen_calls:0`).

## Public-edge QA (production)

| Gate | Result |
|---|---|
| `GET /banzai/validar` | **HTTP 404, 0 redirects, no `Location`** |
| `GET /banzai/validar?target=operator-zero&workflow=full` | **HTTP 404, 0 redirects, no `Location`** |
| `GET /banzai` · `?mode=ask` · `?mode=validation&target=operator-zero&workflow=full` | **200 / 0 redirects** (all three) |
| Operador Zero CTAs | all `/banzai?mode=validation&target=operator-zero&workflow=…` (7 workflows); **0** `/banzai/validar` |
| `"BanzAI Web"` occurrences on `zero.banza.network` + `/banzai` | **0** |
| `GET /banzai/ask` (backend) | **405** (JSON, per M2.9F) |
| ADR-067 on `/decisoes` | present |
| Validation mode render | single shell: **MODOS** (Perguntar/Validar) · **JORNADA DE VALIDAÇÃO** (9 steps) · **RECURSOS** · **RESULTADOS**; header (Operador Zero, 0/9, NOT_CERTIFIED, workflow full); right panel Target/Progresso/Bloqueios/Evidence/Receipts (`qwen_calls: 0`)/Fontes/Fronteira |
| **Full journey executed live** (single shell) | **9/9 · Bloqueado**, **RECEIPTS (9)**, Discovery **VERIFIED**, honest NOT_CERTIFIED aggregate, `qwen_calls:0` |

## Metrics (§39)

`banzai_public_application_routes = 1` · `banzai_validar_route_files = 0` · `banzai_validar_redirects = 0` · `banzai_validar_rewrites = 0` · `banzai_validar_internal_links = 0` · `banzai_validar_operator_zero_links = 0` · `banzai_validar_sitemap_entries = 0` · `banzai_validar_service_worker_entries = 0` (no SW) · `banzai_web_brand_occurrences = 0` · `standalone_validation_workbench_occurrences = 0` · `banzai_application_shells = 1` · `banzai_session_stores = 1` · `banzai_validation_journeys = 1` · `banzai_validation_steps = 9` · `banzai_legacy_seven_step_journeys = 0` · `operator_zero_canonical_targets = 1` · `fictional_operator_targets = 0` · `arbitrary_target_acceptance = 0` (closed allowlist) · `banzai_receipt_losses = 0` · `qwen_decision_calls = 0` · `external_model_calls = 0` · `typescript_verdict_decisions = 0`.

## Verification battery

- `tsc` clean · `vitest` 366/366 (incl. new `banzaiState`, `validationJourney`, updated `banzaiValidation`) · banzai-api node 301/301 · `next build` (single `/banzai`, no `/banzai/validar`).
- Guards: new `banzai-single-interface` (15 assertions) + 8 realigned guards + workbench guard removed; corpus/alias/SVG/identity/rust-rule/public-surface/three-layer/operator-zero family — all pass. CI (#225) 169/0.
- Corpus reindexed: `doc-index.json` 658 chunks; api-kb WASM + vocabulary regenerated; **0** forbidden terms (`BanzAI Web`, `banzai/validar`).

## Process note

PR #224 was admin-merged while 8 CI guard jobs (that pinned the removed old architecture) were still failing — a real miss from running only a guard subset locally. Fixed forward in PR #225 (all 8 realigned + mutation-tested; CI 169/0) before any production deploy. Deploy happened only after main was fully green.

## Rollback

`git revert 5b57cc4 e9959d1` or `git checkout rollback-pre-m2-19ef2-banzai-canonical-interface` (`6acc799`), rebuild + redeploy website+banzai-api.

**Verdict:** M2.19E/F.2 COMPLETE + LIVE. BanzAI is one canonical interface at `/banzai`; validation is a native mode; `/banzai/validar` is permanently a 404 with no redirect/rewrite/alias/link/sitemap/SW entry; "BanzAI Web" and the standalone Workbench are gone; the legacy 7-step journey is replaced by the canonical 9-step journey; Operador Zero links into the validation mode; Rust decides, Qwen explains, TypeScript presents.
