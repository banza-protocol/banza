# M2.19G.1 — Production Validation Report (PRIMARY)

> **Endpoint-Originated Operator Validation & the Operator–Implementation Target Model (ADR-068).**
> This is the primary M2.19G.1 record. It consolidates the change set, the verification battery, the §44
> metrics, the rollback path, and the two live gates the parent completes after deploy.

- **Milestone:** M2.19G.1 (submilestone of M2.19-FINAL — BANZA v1.0 launch)
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` (M2.19G finalized + LIVE, PR #227)
- **Rollback tag:** `rollback-pre-m2-19g1-operator-validation` → `a272d32`
- **ADR:** ADR-068 — Endpoint-Originated Operator Validation and Operator–Implementation Target Model
- **HEAD at report time:** `0412e82` (corpus reindex 669 chunks + vocabulary + api-kb WASM)
- **Deployed commit:** `c06f7f8` (PR #228 → `main`, CI 237/237 SUCCESS)
- **Date:** 2026-07-30
- **Status:** COMPLETE + LIVE — 2026-07-30

---

## 1. What M2.19G.1 did

The official BanzAI validation journey is now **endpoint-originated**. It resolves a target from a
**closed Technical Registry** (`operator_id → implementation_id → canonical_origin → discovery`), fetches
**every** artifact from the implementation's **public endpoints** via a secure, SSRF-hardened Rust fetcher
(`banza-fetcher`; the browser never fetches; the no-network engines stay no-network), runs the Rust
decision engines on the fetched content, and emits **origin-bound** `OperationReceipt`s (§30) + a
`JourneyReceipt` (§31). Manual JSON paste/upload is removed from the official flow and isolated as a
non-authoritative developer **draft** tool (`DRAFT_VALIDATION_RESULT`). The BanzAI UX is simplified:
"Validar operador", a Fase 0 operator/implementation selection, a single Resultados area, no
duplicate/orphan/relabelled tabs, contextual actions + a contextual right panel, and readiness ≠ status
language. **Operador Zero receives no shortcut/fixture/bypass** — it publishes its 14 endpoints at
`zero.banza.network` and is validated through the same path. **Rust decides every verdict; Qwen only
explains; TypeScript never decides.** The M2.19G three-layer public surface is **not** regressed.

Operational rule (ADR-068 §4): *the operator publishes; BanzAI obtains; Rust verifies; the receipt fixes
the result; the Technical Registry publishes the verifiable state.*

## 2. Commit trail

| Commit | Summary |
|--------|---------|
| `ab75b84` | branch base + execution-state (Endpoint-Originated Operator Validation, ADR-068) |
| `64fa2db` | ADR-068 + operator–implementation model; repo-guards range `1..=68` |
| `fd890da` | secure Rust artifact fetcher + Operador Zero published endpoints |
| `fdf1474` | endpoint-originated validation backend (registry + `/validate` + receipts) |
| `bd598de` | BanzAI UX rebuilt — endpoint-originated, simplified, draft-tool isolated |
| `5d5c0e5` | deploy wiring — `banza-fetcher` service + `banza-fetch` egress net + nginx `/banzai/validate/*` |
| `ab7e12d` | guard convergence + 28 new guards + docs/OpenAPI/threat-model + ADR-068 allowlist |
| `0412e82` | reindex corpus (669 chunks, ADR-068 + new docs) + regen vocabulary + rebuild api-kb WASM |

Diffstat (`a272d32..HEAD`): **165 files changed, ~15,165 insertions, ~4,300 deletions**.

## 3. Full change set

### 3.1 New Rust engines (ADR-037 Rust-first)

- `engines/banza-artifact-fetcher` — SSRF-hardened secure fetcher (library + `banza-fetcher` axum
  service). **27 reason codes**; 42/42 tests (23 unit + 19 integration); `fmt`/`clippy -D warnings` clean.
  Component detail: `docs/reports/SECURE_ARTIFACT_FETCHER_REPORT.md`.
- `engines/banza-target-registry` — closed registry + resolution + verdict/readiness (library + WASM).
  Source: `lib.rs`, `model.rs`, `registry.rs`, `verdict.rs`, `wasm.rs`. **15 typed `ResolutionReason`
  variants**; **14 canonical endpoints** (`Endpoints::reference()`); Certification Readiness aggregated in
  Rust (READY/BLOCKED, never CERTIFIED).

### 3.2 Backend (endpoint-originated)

- `services/banzai-api/src/validate.js` — the nine-step orchestrator (resolve → fetch → run engine →
  receipt); `fetcherClient.js` — typed transport to `banza-fetcher`, no user URL ever accepted.
- `services/banzai-api/src/server.js` — `POST /validate/step`, `POST /validate/journey` (405 on wrong
  method).
- Validation-engine WASM vendored under `services/banzai-api/src/validatewasm/` (7 crates).

### 3.3 BanzAI UX

- Rebuilt `BanzaiValidationMode.tsx` (Fase 0, contextual actions, contextual right panel, single
  Resultados area with 6 in-area sub-views), slimmed `BanzaiAgent.tsx`, `banzai-agent.ts`,
  `validationJourney.tsx`; new `DraftValidationTool.tsx` + `ProgramadoresTools.tsx`; client
  `banzaiValidateClient.ts`; server-issued receipt types in `operationReceipt.ts`.

### 3.4 Operador Zero

- 4 new published endpoints (`discovery`, `capabilities`, `signed-metadata`, `federation-metadata`) →
  **14 total**; new example artifacts under `examples/operators/zero/{discovery,capabilities,metadata,
  federation}`; `operadorZero.ts` / `zeroSubdomain.ts` / `gen-operador-zero-artifacts.mjs` synced.

### 3.5 Contracts & docs

- `contracts/openapi/operator-validation.yaml`; 6 production schemas under `contracts/production/`;
  `docs/security/THREAT_MODEL.md` §M2.19G.1 (20 threats); ADR-068 + website mirror; BanzAI operator docs;
  engine + service READMEs.

### 3.6 Deploy wiring

- `infra/banza-network/compose.yml` — `banza-fetcher` service + `banza-fetch` egress-only bridge (shared
  only with `banzai-api`, no published ports, not on `banza-edge`) + `FETCHER_URL`.
- `infra/banza-network/nginx/conf.d/banza.conf` — `/banzai/validate/step` (65s) + `/banzai/validate/journey`
  (120s) under the `banzai_ask` rate-limit zone.

### 3.7 Grounding

- Corpus reindexed to **669 chunks**; canonical vocabulary regenerated; `banzai_api_kb_bg.wasm` rebuilt.

## 4. Verification battery

| Check | Result |
|-------|--------|
| `banza-artifact-fetcher` — `cargo fmt --check` + `clippy --all-targets -D warnings` + `cargo test` | fmt PASS · clippy PASS (0 warnings) · test 42/42 PASS |
| `banza-target-registry` — `cargo fmt` + `clippy -D warnings` + `cargo test` | PASS (all 15 reason variants + happy path + discovery + readiness) |
| banzai-api backend tests (incl. `test/endpoint-validation.test.js`, 12 hermetic cases) | 313 PASS |
| website vitest (incl. `banzaiValidateClient` / `banzaiValidationRegistry` / `receiptOriginFields`) | 396 PASS |
| M2.19G.1 guard suite | **28 new guards + 8 realigned** (+ zero-subdomain routing-list synced), PASS |
| `banzai-m2-19g-semantic-regression-check` | `m2_19g_semantic_regressions = 0` (three-layer surface intact) |
| repo-guards ADR range | `1..=68` |

> Test totals (313 banzai-api, 396 website vitest) and the guard counts are the milestone-reported
> figures; the Rust engine test counts are as reported by `cargo test` on this branch.

### The 28 new guards (§37)

`banzai-operator-validation-mode-check` · `banzai-operator-implementation-model-check` ·
`banzai-endpoint-originated-validation-check` · `banzai-no-manual-input-official-flow-check` ·
`banzai-draft-validation-isolation-check` · `banzai-closed-target-registry-check` ·
`banzai-no-arbitrary-url-check` · `banzai-secure-fetcher-check` · `banzai-fetch-receipt-binding-check` ·
`banzai-nine-step-endpoint-input-check` · `banzai-single-results-area-check` ·
`banzai-no-duplicate-tabs-check` · `banzai-no-orphan-tabs-check` · `banzai-contextual-actions-check` ·
`banzai-contextual-right-panel-check` · `banzai-certification-readiness-language-check` ·
`banzai-operator-zero-parity-check` · `banzai-operator-zero-no-bypass-check` ·
`banzai-operator-zero-public-e2e-check` · `banzai-no-fixture-as-production-evidence-check` ·
`banzai-receipt-origin-fields-check` · `banzai-journey-receipt-origin-check` ·
`banzai-no-qwen-decision-check` · `banzai-rust-fetch-authority-check` ·
`banzai-m2-19g-semantic-regression-check` · `banzai-accessibility-check` · `banzai-responsive-check` ·
`banzai-m2-19g1-readiness-check`.

### The 8 realigned guards

`check-banzai-operator-journey.sh` · `check-banzai-operator-journey-e2e.sh` ·
`check-banzai-operator-zero-only-ui.sh` · `check-banzai-session-context-robustness.sh` ·
`check-banzai-upload-copy.sh` · `check-banzai-vocabulary-contract.sh` ·
`check-operator-zero-full-e2e.sh` · `check-operator-zero-realistic-journey.sh`.
(`check-zero-subdomain-routing.sh` was also touched — a routing-list sync for the 4 new OZ endpoints, not
a logic realignment.)

## 5. §44 metrics table

| Metric | Value |
|--------|-------|
| ADR | ADR-068 |
| repo-guards ADR range | `1..=68` |
| new Rust engines | 2 (`banza-artifact-fetcher`, `banza-target-registry`) |
| fetcher reason codes (closed set) | **27** |
| fetcher tests | 42/42 (23 unit + 19 integration) |
| registry ineligibility reasons | 15 typed |
| canonical endpoints per implementation | 14 |
| Operador Zero published endpoints | 14 (4 new) |
| nine-step spine | 9 steps (8 technical + Certification Readiness) |
| official-flow manual-input surfaces | 0 (moved to the draft tool) |
| Qwen decisions in validation | 0 · `qwen_calls`/`external_model_calls` = 0 |
| new guards | 28 |
| realigned guards | 8 (+1 routing-list sync) |
| banzai-api tests | 313 |
| website vitest | 396 |
| new production schemas | 6 |
| OpenAPI contract | `contracts/openapi/operator-validation.yaml` |
| corpus chunks | 669 |
| `m2_19g_semantic_regressions` | 0 |
| diffstat | 165 files, ~15,165(+) / ~4,300(−) |

## 6. Rollback

- **Rollback tag:** `rollback-pre-m2-19g1-operator-validation` → `a272d32` (M2.19G finalized + LIVE).
- Runtime rollback: redeploy `a272d32` from the reproducible bundle
  (`infra/banza-network/`); the `banza-fetcher` service and the `banza-fetch` network are additive, so
  reverting removes `/banzai/validate/*` and the fetcher without touching `banza-data`/`banza-inference`
  or the financial/no-network engines. Prior M2.19G public surface returns unchanged.

## 7. Report set (§42)

`OPERATOR_IMPLEMENTATION_DOMAIN_MODEL_REPORT` · `ENDPOINT_ORIGINATED_VALIDATION_ARCHITECTURE_REPORT` ·
`DRAFT_VALIDATION_ISOLATION_REPORT` · `BANZAI_NAVIGATION_SIMPLIFICATION_REPORT` ·
`BANZAI_RESULTS_CONSOLIDATION_REPORT` · `OPERATION_RECEIPT_ORIGIN_BINDING_REPORT` ·
`TECHNICAL_REGISTRY_TARGET_RESOLUTION_REPORT` · `OPERATOR_ZERO_PARITY_REPORT` ·
`M2_19G_DOCUMENTATION_UPDATE_REPORT` · `M2_19G_SEMANTIC_REGRESSION_REPORT` · `BANZAI_SECURITY_REPORT` ·
`BANZAI_ACCESSIBILITY_AND_MOBILE_REPORT` (M2.19G.1 section appended) · this report · plus the pre-existing
`SECURE_ARTIFACT_FETCHER_REPORT` + `BANZAI_OPERATOR_VALIDATION_UX_AUDIT`, and the
`OPERATOR_ZERO_PUBLIC_E2E_REPORT` (live run recorded — §9).

---

## 8. Production validation — PASS

> **Completed 2026-07-30.** PR #228 was merged to `main` (`c06f7f8`, CI **237/237 SUCCESS**) and the merged
> commit was deployed to the production VPS (`82.165.165.97`, stack under `/srv/banza-protocol/runtime`).
> The new `banza-fetcher` SSRF-hardened Rust service, `banzai-api`, and `website` are live; the live
> public-edge QA below passed against `banza.network` / `zero.banza.network`. This milestone is **LIVE**.

- **Deployed repo commit:** `c06f7f8` (PR #228) + PR #229 federation-path follow-up (registry declares only served endpoints)
- **PR / CI:** `#228` → `c06f7f8` · CI **237/237 SUCCESS** · `#229` federation-path follow-up
- **Image digests:**
  - website `sha256:2088bfa1…`
  - banza-fetcher `ghcr.io/banza-protocol/banza-fetcher:v0.1.0` `sha256:366f109f…`
  - banzai-api `ghcr.io/banza-protocol/banzai-api:v0.1.0` `sha256:f019c3f6…` (federation-path build)
- **`banza-fetcher` health:** healthy (distroless `--healthcheck`). All containers healthy: `banza-fetcher`,
  `banzai-api`, `website`, `llama-local`, `reverse-proxy`.
- **Network:** `banza-fetch` egress bridge up, shared only with `banzai-api`, no published ports — confirmed
  (the fetcher exposes no route at the public edge).

### 8.1 Endpoint-served confirmation (Operador Zero public origin)

Every registry-declared Operador Zero endpoint is served **200** at `zero.banza.network`; the official
journey reads **no local fixture** (served path grep-clean). 14/14 canonical endpoints live:

| # | Endpoint | Served |
|---|----------|--------|
| 1 | `/discovery.json` | 200 |
| 2 | `/manifest.json` | 200 |
| 3 | `/key-manifest.json` | 200 |
| 4 | `/signed-metadata.json` | 200 |
| 5 | `/capabilities.json` | 200 |
| 6 | `/conformance/evidence.json` | 200 |
| 7 | `/revocation-list.json` | 200 |
| 8 | `/federation/metadata.json` | 200 |
| 9 | `/federation-metadata.json` | 200 |
| 10 | `/evidence-bundle.json` | 200 |
| 11 | `/traces/full-e2e.json` | 200 |
| 12 | `/ledger/demo.json` | 200 |
| 13 | `/payments/demo-qr.json` | 200 |
| 14 | `/payments/demo-refund.json` | 200 |

### 8.2 §44 metrics — live observed values

| Metric | Live value |
|--------|-----------|
| `POST /banzai/validate/journey` | HTTP 200 in ~1.5s |
| receipts | 9 `OperationReceipt`s + 1 `JourneyReceipt` |
| steps executed | 9 (8 technical + Certification Readiness) |
| `overall_status` | FAILED (honest demo state) |
| `certification_readiness` | BLOCKED |
| `certification_status` | NOT_CERTIFIED |
| `certified` | false |
| `qwen_calls` | **0** |
| `external_model_calls` | **0** |
| `protocol_fetch_count` | **23** |
| input_hash present | 9/9 receipts (real `sha256:`) |
| endpoint bound | 8/9 (step 9 certification is a pure Rust aggregate — no fetch) |

### 8.3 Live public-edge QA

- `POST https://banza.network/banzai/validate/journey` `{operator_id:operator-zero,
  implementation_id:operator-zero-ref-impl}` → **HTTP 200 in ~1.5s**, 9 receipts + 1 `JourneyReceipt`,
  `certification_readiness=BLOCKED`, `certification_status=NOT_CERTIFIED`, `certified=false`,
  `qwen_calls=0`, `external_model_calls=0`, `protocol_fetch_count=23`. Every technical receipt carries a
  real `zero.banza.network` endpoint, a real HTTP status and a real `sha256:` input hash.
- Each step fetched server-side through the secure Rust `banza-fetcher`; the browser never fetches.
- The official journey reads **no local fixture** — served path grep-clean, endpoint-originated only.
- Per §44 this is the **correct, expected** outcome: the acceptance criteria require 9 steps executed,
  9 receipts, 1 `JourneyReceipt`, real endpoints + hashes, and an honest `NOT_CERTIFIED` — **not** that
  every step VERIFIES. Operador Zero receives no shortcut/fixture/bypass (ADR-068 §4.9).

> **Note (federation path — resolved):** PR #229 aligns the registry so it declares only endpoints Operador
> Zero actually serves (ADR-068 §4.6/§22): `federation_manifest` now points at the served
> `/federation-metadata.json` (200, `application/json`). The definitive post-deploy E2E run
> (`artifacts/m2-19g1/operator-zero-public-e2e.json`, evidence for `OPERATOR_ZERO_PUBLIC_E2E_REPORT.md`)
> records step 7 (federation) fetching the served `/federation/metadata.json` → 200 and the
> `banza-l3-readiness` engine returning a real **content** verdict (`FAILED` / `L3_BLOCKED_BY_MANIFEST`) — no
> step returns `http_status_not_ok`. The aggregate outcome (`NOT_CERTIFIED` / BLOCKED, 9 receipts + 1
> `JourneyReceipt`, qwen/external 0, `protocol_fetch_count` 23) is the honest ADR-068 §4.9 no-bypass state.

- **Result:** **PASS** — production validation complete, milestone **COMPLETE + LIVE**.

## 9. Operador Zero public E2E — PASS

> **Completed 2026-07-30.** Operador Zero was validated through the **same** secure fetch + Rust engines as
> any implementation (ADR-068 §4.9), producing real origin-bound receipts. The live 9-receipt + 1-journey
> evidence run against `https://zero.banza.network` is captured in
> `artifacts/m2-19g1/operator-zero-public-e2e.json` and detailed in
> `docs/reports/OPERATOR_ZERO_PUBLIC_E2E_REPORT.md`.

- **Target:** `operator-zero` / `operator-zero-ref-impl` @ `https://zero.banza.network`
- **Journey result:** **9 real `OperationReceipt`s + 1 `JourneyReceipt`**, real endpoints + `sha256:`
  hashes, `overall_status=FAILED`, `certification_readiness=BLOCKED`, `certification_status=NOT_CERTIFIED`,
  `certified=false`, `qwen_calls=0`, `external_model_calls=0`, `protocol_fetch_count=23`. Step verdicts:
  discovery VERIFIED · manifest VERIFIED · keys FAILED (fail-closed: trust root metadata expired/revoked) ·
  conformance PENDING (incomplete evidence) · interoperability FAILED (L2 blocked — thin published
  artifacts) · trust FAILED (fail-closed) · federation FAILED (content verdict `L3_BLOCKED_BY_MANIFEST` on
  the served `/federation/metadata.json`, 200) · evidence FAILED (bundle schema incomplete) ·
  certification NOT_CERTIFIED / BLOCKED (Rust aggregate).
- **No-bypass:** no shortcut, no official fixture, no pre-computed result — same registry entry, same secure
  fetch, same engines as any implementation; receipts bound to real `zero.banza.network` endpoints and
  content hashes.
- **`banzai-operator-zero-public-e2e-check`:** evidence artifact present
  (`artifacts/m2-19g1/operator-zero-public-e2e.json`) — hard-check PASS.
- **Evidence report:** `docs/reports/OPERATOR_ZERO_PUBLIC_E2E_REPORT.md`
