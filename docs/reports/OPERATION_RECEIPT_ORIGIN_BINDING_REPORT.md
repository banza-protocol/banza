# OperationReceipt & JourneyReceipt Origin Binding — M2.19G.1 (ADR-068 §4.8, §30, §31)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 §4.8 / §30 / §31
- **Date:** 2026-07-30

## 1. Decision

Every `OperationReceipt` and the `JourneyReceipt` bind the result to the **exact origin of the inputs** —
operator, implementation, endpoint, resolved host, fetched-at, HTTP status, content type, content length,
ETag, hash, signature status and engine version. Protocol fetches are counted as `protocol_fetch_count`,
**never** as `external_model_calls` (ADR-068 §4.8).

## 2. §30 OperationReceipt — per-step, origin-bound

Emitted by `services/banzai-api/src/validate.js :: buildOperationReceipt`; typed in
`website/lib/operationReceipt.ts` as `ServerOperationReceipt`. Every origin field is populated from the
fetcher response:

| Group | Fields |
|---|---|
| identity | `receipt_version`, `operation_id`, `request_id`, `workflow`, `step` |
| target | `operator_id`, `implementation_id`, `environment`, `profile`, `protocol_version`, `canonical_origin` |
| **origin of inputs** | `endpoint`, `resolved_host`, `fetched_at`, `http_status`, `content_type`, `content_length`, `etag`, `last_modified` |
| evidence | `input_hash`, `signature_status`, `engine`, `engine_version`, `result`, `reason_codes`, `evidence_refs`, `output_hash` |
| accounting | `duration_ms`, `qwen_calls` (0), `external_model_calls` (0), `protocol_fetch_count`, `audit_ref` |

- The **primary endpoint** is the first fetched endpoint of the step (or the first failure);
  `endpoint`/`resolved_host`/`fetched_at`/`http_status`/`content_type`/`content_length`/`etag` come
  straight from the fetcher's `FetchResponse`.
- Each `evidence_ref` is an endpoint URL **+** the SHA-256 hash fetched from it
  (`${url}#${sha256}`), so a later divergence is detectable.
- `signature_status` is meaningful only for the keys/trust steps (derived from the trust engine's
  checks); otherwise `not_applicable`.
- `audit_ref` links the API request id to the fetcher's per-fetch `request_id`.

## 3. §31 JourneyReceipt — aggregate, origin-bound

Emitted by `validate.js :: validateJourney`; typed as `ServerJourneyReceipt`. It carries the target
identity, `canonical_origin`, `resolved_host`, `started_at`/`finished_at`/`duration_ms`, `step_count`,
the full `steps[]` (each a §30 receipt), the aggregate `overall_status`, and:

- `certification_readiness`: `READY | BLOCKED`;
- `certification_status`: **always** `NOT_CERTIFIED`; `certified: false`;
- `qwen_calls` / `external_model_calls`: `0`;
- `protocol_fetch_count`: the sum of the steps' fetch counts;
- a Portuguese `disclaimer` stating Rust decides, the AI never decides, and readiness is not a
  Certification Record.

## 4. Fetch accounting — protocol_fetch, not external_model

Protocol fetches are counted in a dedicated `protocol_fetch_count` field (summed across steps in the
journey receipt). The fetcher itself logs one JSON audit line per fetch with `event:"protocol_fetch"`
(`SECURE_ARTIFACT_FETCHER_REPORT.md` §5). `qwen_calls` and `external_model_calls` are always `0` in
validation mode — there is no model call — so a protocol fetch is never miscounted as an external model
call (ADR-068 §4.8).

## 5. Rust decides; TypeScript builds the receipt

The receipt records the verdict — it does not author it. The step status comes from
`banza-target-registry :: verdict.rs :: step_status` over the decision engine's own declared status;
`validate.js` shuttles JSON, assembles engine inputs from **fetched** content, and fills the receipt
fields. The browser (`operationReceipt.ts`) only **renders** the server-issued receipt; it no longer
builds receipts client-side for the official journey (the legacy browser-built `OperationReceipt`/
`JourneyReceipt` types remain for the read-only demo provenance, clearly distinct from the server types).

## 6. Reproducibility & tamper-evidence

Because each receipt binds `endpoint + fetched_at + http_status + content_type/length + etag + sha256 +
engine_version`, a second verifier re-fetching the same origin obtains a comparable hash, and a stale /
mutated / split-view response is detectable (threat model M2.19G.1: "stale/mutable artefact",
"split-view response", "cache poisoning", "replay"). The result is specific to the implementation,
profile, version, environment, artifacts and moment of evaluation.

## 7. Certification Readiness ≠ Certification Status

The receipts keep the two distinct: **Readiness** (READY/BLOCKED) is the aggregate of the technical step
verdicts; **Status** is always NOT_CERTIFIED. A receipt is not a certificate and never returns
`CERTIFIED` (ADR-068 §4.10). This distinction is enforced in the UI by
`banzai-certification-readiness-language-check` (no "9/9 · Bloqueado" phrasing) and in Rust by
`verdict.rs :: certification_readiness` (`record_kind: READINESS_AGGREGATE`, never `CERTIFIED`).

## 8. Contracts & guard coverage

- Contracts: `contracts/production/operation-receipt.production.schema.json`,
  `contracts/production/journey-receipt.production.schema.json`, and the
  `contracts/openapi/operator-validation.yaml` response shapes.
- Guards: `banzai-receipt-origin-fields-check` (§30 origin fields in contract + builder),
  `banzai-journey-receipt-origin-check` (§31 fields incl. hashes + protocol_fetch_count),
  `banzai-fetch-receipt-binding-check` (endpoint/resolved_host/fetched_at/http_status/content_type/
  input_hash/signature_status per receipt), `banzai-no-qwen-decision-check` (qwen_calls:0 /
  external_model_calls:0).
- Tests: `website/lib/receiptOriginFields.test.ts` (vitest) and
  `services/banzai-api/test/endpoint-validation.test.js` (hermetic backend receipts).
