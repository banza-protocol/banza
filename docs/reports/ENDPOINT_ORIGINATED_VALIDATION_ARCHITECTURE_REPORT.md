# Endpoint-Originated Validation Architecture — M2.19G.1 (ADR-068)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **Rollback tag:** `rollback-pre-m2-19g1-operator-validation` → `a272d32`
- **ADR:** ADR-068 · **Related:** ADR-037 (Rust-first), ADR-054 (BanzAI single interface), ADR-065
  (Technical Registry), ADR-067 (Operador Zero), ADR-038 (open trust)
- **Date:** 2026-07-30

## 1. The core rule

> In BanzAI's official validation journey, **every evaluated artifact is obtained exclusively from the
> public endpoints of the selected implementation** (ADR-068 §4.4). No pasted content, uploaded file,
> drag-and-drop, user-entered URL, local fixture, frontend mock, embedded JSON, pre-computed result or
> manually chosen artifact may enter the official journey.

Operational rule (ADR-068 §4):
**the operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result; the Technical
Registry publishes the verifiable state.**

## 2. Canonical flow

```
operator → implementation → Technical Registry → canonical origin → discovery →
public endpoints → secure Rust fetcher → fetched content → no-network Rust engines →
evidence → OperationReceipts → JourneyReceipt → Certification Readiness (READY | BLOCKED)
```

Component responsibilities:

| Stage | Component | Kind | Decides? |
|-------|-----------|------|----------|
| target resolution | `engines/banza-target-registry` (Rust/WASM) | closed-set resolution | eligibility |
| artifact fetch | `engines/banza-artifact-fetcher` (Rust svc `banza-fetcher`) | network (egress) | never |
| orchestration | `services/banzai-api/src/validate.js` | JS glue | never |
| transport to fetcher | `services/banzai-api/src/fetcherClient.js` | JS glue | never |
| step verdicts | `banza-operator-manifest / -trust / -conformance / -l2-readiness / -l3-readiness / -evidence-bundle` (Rust/WASM, no-network) | decision engines | verdict |
| step status + readiness | `banza-target-registry :: verdict.rs` | Rust | verdict/aggregate |
| render | `website/components/banzai/*` (React) | UI | never |

**Rust decides every verdict; Qwen only explains; TypeScript never decides** (ADR-068 §21). There is no
model call in validation mode — `qwen_calls = 0`, `external_model_calls = 0` by construction; protocol
fetches are counted as `protocol_fetch_count`.

## 3. The nine-step spine (ADR-068 §21)

Each step names its decision engine and the registry endpoint keys it fetches
(`validate.js :: STEP_ORDER` + `STEP_SPEC`; the FIRST key is the receipt's primary endpoint):

| # | Step | Engine | Fetched endpoint keys |
|---|------|--------|-----------------------|
| 1 | discovery | banza-target-registry (`validate_discovery`) | `discovery` |
| 2 | manifest | banza-operator-manifest | `manifest` |
| 3 | keys | banza-trust | `signed_metadata, key_manifest, revocation, manifest, conformance` |
| 4 | conformance | banza-conformance | `conformance` |
| 5 | interoperability | banza-l2-readiness | `manifest, payment_qr, payment_refund, ledger, traces` |
| 6 | trust | banza-trust | `signed_metadata, key_manifest, manifest, conformance, revocation` |
| 7 | federation | banza-l3-readiness | `federation_metadata, federation_manifest, traces, manifest` |
| 8 | evidence | banza-evidence-bundle | `evidence_bundle` |
| 9 | certification | banza-target-registry (`certification_readiness`) | — (aggregate only) |

## 4. How a step runs (`validate.js :: runTechnicalStep`)

1. For each endpoint key in the step spec, derive the fetch **path** from the resolved absolute URL
   (`pathOf` strips the origin prefix), and call `fetcher.fetchArtifact({ canonical_origin,
   expected_host, path, media_type_allowlist })`. **Only a registry-resolved origin + host + path reach
   the fetcher — never a caller URL.**
2. If any required fetch fails, the step is **BLOCKED**: the fetcher's `reason_codes` are surfaced into
   the receipt with `FETCH_BLOCKED`, and no verdict is computed on partial content.
3. If all artifacts are fetched, assemble the engine input **only from fetched content**
   (single-artifact engines get the fetched body verbatim; composite engines — trust/L2/L3 — are
   assembled from the relevant fetched artifacts; `assembleTrustInput` / `assembleL2Input` /
   `assembleL3Input`). No fixture contributes any verdict-bearing content.
4. Run the matching Rust/WASM engine on the fetched content, then map the engine's own declared status to
   the canonical step status via `registry.registry_step_status_json` (`verdict.rs :: step_status`).
5. Emit a §30 `OperationReceipt` bound to the exact origin of the inputs.

### Input assembly is content-only

The prior flow substituted Rust demo **fixtures** for the operator's published key material at the
keys/trust steps and re-simulated interop/federation with the self-contained SimB simulator
(`registry-operator-zero-inputs-audit.json` → `official_flow_local_inputs`: LI-03, LI-06 fixture
bypasses; LI-05, LI-07 simulator seeds). The rebuild removes those substitutions: trust is assembled from
the fetched `signed_metadata` + `key_manifest` + `revocation` + `manifest` + `conformance`; L2 from the
fetched `manifest` + `payment_qr` + `payment_refund` + `ledger` + `traces`; L3 from the fetched
`federation_metadata` + `federation_manifest` + `traces` + `manifest`. **SimB is no longer the interop/
federation verdict source.**

## 5. Discovery is verified, not trusted

Step 1 does not merely fetch `/discovery.json` — `verdict.rs :: validate_discovery` checks that the
fetched document's `operator_id`, `implementation_id`, `canonical_origin` and `protocol_version` match
the **resolved target**, and that every announced endpoint URL is host-bound to `expected_host`
(`DISCOVERY_MISMATCH` / `DISCOVERY_ENDPOINT_OFF_ORIGIN` / `DISCOVERY_ENDPOINTS_MISSING`). Impersonation
and off-origin endpoint smuggling are caught at the entry document.

## 6. Certification Readiness — aggregate, never a certificate

Step 9 (`verdict.rs :: certification_readiness`, run by `validate.js :: runCertificationStep`) aggregates
the eight technical step verdicts **in Rust** into a `READINESS_AGGREGATE`:

- `readiness` is `READY` (all technical steps VERIFIED) or `BLOCKED`; it is **never** `CERTIFIED`.
- `certification_status` is always `NOT_CERTIFIED`; `certified/authorised/licensed = false`.
- It carries `aggregated_in: "rust"`, `qwen_calls: 0`, `external_model_calls: 0`.

For a single-step `certification` call the eight technical steps run first, so readiness is derived from
real endpoint evidence, not a client claim (`validate.js :: validateStep`).

## 7. Served surface

`services/banzai-api/src/server.js` exposes two POST routes carrying only closed
`{operator_id, implementation_id, step?}`:

- `POST /validate/step` — one step (resolves first; `certification` runs the eight technical steps).
- `POST /validate/journey` — all nine steps → a §31 `JourneyReceipt`.

nginx (`infra/banza-network/nginx/conf.d/banza.conf`) proxies `/banzai/validate/step` (65s) and
`/banzai/validate/journey` (120s, ~9 sequential server-side fetches) under the `banzai_ask` rate-limit
zone; explicit 405 on the wrong method. The browser client
(`website/lib/banzaiValidateClient.ts`) POSTs same-origin, re-checks closed ids, and only renders the
returned receipt — it never fetches an operator origin and never sends a URL.

## 8. No-network engines stay no-network

The decision engines have **no** HTTP client dependency (audit `existing_outbound_http.rust_engines`:
"No HTTP client dependency in any engines/*/Cargo.toml"). Network reach lives **only** in the fetcher;
the engines receive already-fetched bytes and decide. Network reach and verdict authority are separated
components (ADR-068 Consequences; threat model M2.19G.1 trust boundaries).

## 9. Guard coverage

`banzai-endpoint-originated-validation-check`, `banzai-nine-step-endpoint-input-check`,
`banzai-no-manual-input-official-flow-check`, `banzai-no-arbitrary-url-check`,
`banzai-rust-fetch-authority-check`, `banzai-no-qwen-decision-check`,
`banzai-no-fixture-as-production-evidence-check`, `banzai-certification-readiness-language-check` — plus
the fetcher (`banzai-secure-fetcher-check`), registry (`banzai-closed-target-registry-check`) and
receipt guards documented in the companion reports. Backend behaviour is covered by
`services/banzai-api/test/endpoint-validation.test.js` (hermetic fetcher stub, 12 cases).

## 10. Boundary restatement

Endpoint-originated validation activates no real money, admits no operator, and asserts no regulatory
status. It produces reproducible technical evidence and a Certification Readiness (READY/BLOCKED) only; a
receipt is not a certificate and it never returns `CERTIFIED` (ADR-068 §4.10).
