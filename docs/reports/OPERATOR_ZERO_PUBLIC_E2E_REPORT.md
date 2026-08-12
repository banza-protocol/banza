# Operador Zero — Public Endpoint-Originated E2E (LIVE) — M2.19G.1

> **LIVE RUN RECORDED — 2026-07-30.** This report captures the live, endpoint-originated validation of
> Operador Zero against its public origin, run through the **same** secure Rust fetcher + Rust decision
> engines as any implementation (ADR-068 §4.9) — no shortcut, no fixture, no pre-computed result. The
> evidence artifact is `artifacts/m2-19g1/operator-zero-public-e2e.json`, which
> `banzai-operator-zero-public-e2e-check` hard-checks.

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation · **ADR:** ADR-068 (§4.9, §21, §30/§31)
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation` · **Base:** `a272d32`
- **Deployed commit:** `c06f7f8` (PR #228 → `main`, CI 237/237)
- **Target:** operator `operator-zero` / implementation `operator-zero-ref-impl`
- **Canonical origin:** `https://zero.banza.network`
- **Status:** COMPLETE + LIVE — 2026-07-30

---

## 1. How to produce this evidence (parent)

After deploy (production VPS `82.165.165.97`, stack under `/srv/banza-protocol/runtime`), run the whole
journey against the live origin and record the returned `JourneyReceipt`:

```
POST https://banza.network/banzai/validate/journey
     { "operator_id": "operator-zero", "implementation_id": "operator-zero-ref-impl" }
```

Pace requests ≥ 3.2s (the `banzai_ask` edge zone is 20r/m burst-5). The backend performs ~9 sequential
server-side fetches via `banza-fetcher`; the browser never fetches.

## 2. Shape confirmed by the live run

- **9 receipts** (one `OperationReceipt` per step) + **1 `JourneyReceipt`** — confirmed.
- Each **technical** receipt bound to a real `zero.banza.network` endpoint (`endpoint`, `resolved_host`,
  `fetched_at`, real `http_status`, a real `sha256:` input hash, `engine`/`engine_version`); endpoint
  present on **8/9** steps, `input_hash` present on **9/9** (step 9 certification is a pure Rust aggregate,
  no fetch).
- `qwen_calls = 0`, `external_model_calls = 0` on every receipt and in aggregate; `protocol_fetch_count =
  23`.
- `certification_status = NOT_CERTIFIED`, `certified = false`; `certification_readiness = BLOCKED` (derived
  in Rust, not asserted).

## 3. Live run record

- **Run at:** `2026-07-29T23:23:46Z` → `2026-07-29T23:23:47Z` (RFC3339 UTC), `duration_ms = 1477`
- **Deployed:** post-#229 federation-path build — `banzai-api` `sha256:f019c3f6…` (PR #229 → `main`; builds on #228 `c06f7f8`)
- **Journey via:** `POST https://banza.network/banzai/validate/journey`
  `{ "operator_id": "operator-zero", "implementation_id": "operator-zero-ref-impl" }` → HTTP 200 in ~1.5s
- **JourneyReceipt id:** `journey-3851b33a-3eec-4768-94f1-ec076aa4ba5f` · **request_id:**
  `3474f160-aadd-43e8-b654-74de1b7e5501`
- **overall_status:** `FAILED` · **certification_readiness:** `BLOCKED` ·
  **certification_status:** `NOT_CERTIFIED` · **certified:** `false`
- **qwen_calls:** `0` · **external_model_calls:** `0` · **protocol_fetch_count:** `23`

### Per-step receipts

| # | Step | Endpoint fetched | resolved_host | http_status | sha256 (input) | result.status | engine |
|---|------|------------------|---------------|-------------|----------------|---------------|--------|
| 1 | discovery | `https://zero.banza.network/discovery.json` | `zero.banza.network` | `200` | `sha256:c41401d6…` | `VERIFIED` | `banza-target-registry@0.1.0` |
| 2 | manifest | `https://zero.banza.network/manifest.json` | `zero.banza.network` | `200` | `sha256:b6f63991…` | `VERIFIED` | `banza-operator-manifest@0.1.0` |
| 3 | keys | `https://zero.banza.network/signed-metadata.json` | `zero.banza.network` | `200` | `sha256:f3917194…` | `FAILED` | `banza-trust@0.2.0` |
| 4 | conformance | `https://zero.banza.network/conformance/evidence.json` | `zero.banza.network` | `200` | `sha256:553dd354…` | `PENDING` | `banza-conformance@0.1.0` |
| 5 | interoperability | `https://zero.banza.network/manifest.json` | `zero.banza.network` | `200` | `sha256:913a45c5…` | `FAILED` | `banza-l2-readiness@0.1.0` |
| 6 | trust | `https://zero.banza.network/signed-metadata.json` | `zero.banza.network` | `200` | `sha256:2c5e15de…` | `FAILED` | `banza-trust@0.2.0` |
| 7 | federation | `https://zero.banza.network/federation/metadata.json` | `zero.banza.network` | `200` | `sha256:4263ba33…` | `FAILED` | `banza-l3-readiness@0.1.0` |
| 8 | evidence | `https://zero.banza.network/evidence-bundle.json` | `zero.banza.network` | `200` | `sha256:2ec6d5d8…` | `FAILED` | `banza-evidence-bundle@0.1.0` |
| 9 | certification | — (Rust aggregate, no fetch) | `zero.banza.network` | — | `sha256:cfa0c67c…` | `BLOCKED` → `NOT_CERTIFIED` | `banza-target-registry@0.1.0` |

Reason-code highlights: keys/trust `TRUST_INVALID_ROOT_METADATA` (fail-closed — root metadata
expired/revoked); conformance `CONFORMANCE_EVIDENCE_INCOMPLETE` (`report missing required field: runner`);
interoperability `L2_BLOCKED_BY_MANIFEST` (thin published artifacts); federation `L3_BLOCKED_BY_MANIFEST`
(content verdict on the fetched federation metadata); evidence `EVIDENCE_BUNDLE_INVALID` (bundle schema
incomplete); certification `NOT_CERTIFIED` / `PRECEDING_STEP_FAILED` / `TECHNICAL_STEPS_INCOMPLETE`.

> **Federation path (resolved):** step 7 fetches the served `https://zero.banza.network/federation/metadata.json`
> (200, `application/json`) and the `banza-l3-readiness` engine runs on the fetched content — a real content
> verdict (`FAILED` / `L3_BLOCKED_BY_MANIFEST`), not a fetch failure. This is the definitive post-deploy run:
> the registry no longer declares the unserved `/federation-manifest.json`, so no step returns a
> `http_status_not_ok`. The aggregate — 9 receipts + 1 `JourneyReceipt`, `NOT_CERTIFIED` / BLOCKED,
> qwen/external 0, `protocol_fetch_count` 23 — is the honest ADR-068 §4.9 no-bypass demo state.

## 4. No-bypass confirmation

- No shortcut / official fixture / pre-computed result used → **confirmed** (official journey reads no local
  fixture; served path grep-clean).
- Same registry entry + same secure fetch (`banza-fetcher`) + same Rust engines as any implementation →
  **confirmed**.
- Receipts bound to real `zero.banza.network` endpoints and content hashes → **confirmed** (endpoint on
  8/9, `sha256:` input hash on 9/9, real HTTP statuses).
- `banzai-operator-zero-public-e2e-check` — evidence artifact present
  (`artifacts/m2-19g1/operator-zero-public-e2e.json`) → **hard-check PASS**.

## 4a. Verdict

This is the honest, expected **§44-compliant** outcome. The acceptance criteria require **9 steps
executed, 9 `OperationReceipt`s + 1 `JourneyReceipt`, real endpoints + hashes, and an honest
`NOT_CERTIFIED`** — **not** that every step VERIFIES. Operador Zero receives no shortcut, fixture, or
bypass (ADR-068 §4.9): it is validated through the same endpoint-originated secure-fetch + Rust-decision
path as any implementation, and its thin/incomplete published artifacts correctly aggregate to
`certification_readiness = BLOCKED`, `certification_status = NOT_CERTIFIED`, `certified = false`, with
`qwen_calls = 0` and `external_model_calls = 0`.

## 5. Cross-links

- Primary record: `docs/reports/M2_19G1_PRODUCTION_VALIDATION_REPORT.md` §9.
- Parity rationale: `docs/reports/OPERATOR_ZERO_PARITY_REPORT.md`.
- Fetcher security: `docs/reports/SECURE_ARTIFACT_FETCHER_REPORT.md`,
  `docs/reports/BANZAI_SECURITY_REPORT.md`.
