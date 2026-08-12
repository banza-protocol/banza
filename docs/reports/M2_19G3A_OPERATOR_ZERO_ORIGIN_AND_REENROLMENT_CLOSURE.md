# M2.19G.3A — Operador Zero origin proof + re-enrolment closure (ADR-069)

**Status:** COMPLETE + LIVE · **Date:** 2026-07-30 ·
**PR:** [#238](https://github.com/banza-protocol/banza/pull/238) → `main` `61646a5` (CI 249/249) · **Deployed:** banza.network (VPS 82.165.165.97)
**ADR:** [ADR-069](../../decisions/adr/ADR-069-simple-secure-operator-onboarding.md) ·
**Branch:** `fix/m2-19g3a-operator-zero-origin-closure` ·
**Rollback tag:** `rollback-pre-m2-19g3a-operator-zero-origin-closure`
**Builds on:** [M2.19G.3](./M2_19G3_SIMPLE_SECURE_OPERATOR_ONBOARDING.md) (onboarding) +
[ADR-068](../../decisions/adr/ADR-068-endpoint-originated-operator-validation.md) (endpoint-originated validation)

---

## 1. Why this corrective exists

The M2.19G.3 re-enrolment of the Operador Zero **did not complete**. It stopped at `ORIGIN_PENDING` with
a fail-closed `unreachable` verdict, because the domain never published the ownership challenge. There
was therefore:

- **no** positive origin proof,
- **no** valid `OriginVerificationReceipt`,
- **no** execution of the nine-stage validation journey,
- **no** `OperationReceipt`s and **no** `JourneyReceipt`,
- **no** reconciliation with the existing public Operador Zero entry.

> **A re-enrolment *attempt* is not a completed re-enrolment.** The Operador Zero is only fully
> re-enrolled when: the domain publishes the real challenge; the Rust fetcher obtains it over the public
> edge; the proof is positive; a valid `OriginVerificationReceipt` exists; the nine-stage journey is
> actually executed; `OperationReceipt`s exist; a `JourneyReceipt` exists; the candidature is reconciled
> with the *existing* Operador Zero; no duplicate entry is created; and the public state stays correct.

## 2. The essential security boundary (§4)

Origin ownership proof is only meaningful if the challenge is **published by infrastructure the operator
controls**, and **fetched + verified by a separate verifier**. In this repository the verifier is
`banzai-api` (the onboarding backend). Therefore:

- The challenge is published by the **Operador Zero origin** — the `zero.banza.network` nginx vhost — from
  a **static file**, mounted read-only. It is **not** served by `banzai-api`, by the website app, or from
  the onboarding database.
- An exact-match `location = /.well-known/banza/ownership-challenge.json` outranks the website proxy for
  that one URL only. It aliases a file on disk; it never `proxy_pass`es to the verifier.
- The nonce lives **only** in the published file. The backend generates it, stores only its HMAC digest,
  and the secure Rust fetcher (`banza-fetcher`, SSRF-hardened, registry-derived origin) retrieves it over
  the public edge. The verifier never answers its own challenge.

**Prohibited and confirmed absent:** serving the challenge from BanzAI / onboarding-backend / a Candidate
Registry proxy; a verifier that answers its own challenge; sharing the candidate DB with the public
endpoint; marking origin verified directly in the DB; inserting a receipt by hand; a hardcoded
nonce/verdict; a production fixture; an admin bypass; an endpoint that returns success only for the
Operador Zero.

## 3. What was built

### 3.1 Independent origin publication (nginx + compose)
- `infra/banza-network/nginx/conf.d/banza.conf` — the `zero.banza.network` vhost gains
  `location = /.well-known/banza/ownership-challenge.json` → `alias /etc/nginx/oz-well-known/ownership-challenge.json`,
  `default_type application/json`, `Cache-Control: no-store`, and `405` for any method other than GET/HEAD.
  Absent file → `404` (the correct default: no active challenge).
- `infra/banza-network/compose.yml` — the reverse proxy mounts `./nginx/oz-well-known:/etc/nginx/oz-well-known:ro`
  (read-only). The publication dir carries a `.gitignore` (only its docs are tracked; a published
  `ownership-challenge.json` with a live nonce is **never** committed) and a `README.md` describing the
  contract.

### 3.2 Single-use challenge (Rust + store + service)
- `engines/banzai-onboarding/src/lib.rs` — `origin_verify_json` accepts `consumed_at_ms`; a challenge that
  has already been consumed returns `{ result: "already_used", reason_code: "challenge_already_consumed" }`.
- `infra/banza-network/postgres/init/001_schema.sql` + `.../migrations/M2_19G3A_origin_single_use.sql` —
  `origin_challenges` gains a `consumed_at timestamptz` column.
- `services/banzai-api/src/onboarding/store.js` — `markOriginChallengeConsumed` is **write-once**
  (`SET consumed_at=$2 WHERE challenge_id=$1 AND consumed_at IS NULL`); `originChallengeCounts` reports
  active vs consumed.
- `services/banzai-api/src/onboarding/service.js` — `verifyOrigin` short-circuits a replay on a consumed
  challenge **before any refetch** (audit `origin_verify_replay_rejected`), and on a positive verify it
  consumes the challenge (audit `origin_verified { consumed: true }`).

### 3.3 Reconciliation without duplication (§14)
- `services/banzai-api/src/onboarding/service.js` — `reconcileCandidate` requires an owned implementation
  in `ORIGIN_VERIFIED`, resolves the target in the **closed** Technical Registry
  (`engine.resolveRegistryTarget` → must be `.ok`, else `registry_target_unknown`), walks the Rust state
  machine one governed transition at a time (`validation_started → validation_completed →
  publication_eligible → published`, each persisted + audited), then records the correspondence to the
  **existing** entry via `setImplementationPublished` + `setCandidatePublished`. It **never** creates a
  registry row, **never** name-matches, and **never** writes `/operators`.
- `services/banzai-api/src/onboarding/routes.js` — authenticated `POST /onboarding/candidate/reconcile`
  (session-required, Origin-checked) maps to `service.reconcileCandidate`.

## 4. Guards + tests

- **Guard** `tools/check-operator-zero-origin-closure.sh` (`make operator-zero-origin-closure-check`,
  CI job *Operador Zero origin-proof closure*) — **14 labelled invariants** G1–G14: independent-origin
  static publication, exact-match precedence, method-guard (405), no-store, read-only compose mount,
  verifier-independence, single-use in Rust, single-use in store/schema (write-once), consume-on-verify +
  replay short-circuit, secure-fetcher-only egress, reconcile binding to the closed registry, reconcile
  origin gate, no operator creation / no `/operators` write, no committed nonce / no OZ verdict bypass.
  Self-tests every run.
- **Unit/integration** `services/banzai-api/test/onboarding.test.js` — extended: single-use replay returns
  `already_used`; a fresh tampered challenge still returns `mismatch`; reconcile binds to
  `operator-zero`/`operator-zero-ref-impl` and drives the full audited state chain; reconcile refuses an
  unknown registry target; reconcile refuses before origin is verified. **11/11 pass.**
- Rust engine: `cargo fmt --check` clean, `cargo test` **9/9**, `cargo clippy -D warnings` clean.

## 5. Live production evidence (§8–§13, §23 metrics)

Executed on `banza.network` (VPS 82.165.165.97), `BANZAI_ONBOARDING_ENABLED=1`, on 2026-07-30. The
Operador Zero candidate recovered was the **existing** one from the failed G.3 attempt
(`candidate 10e14892…`, `implementation 93c890cb…`, `zero.banza.network`) — recovered, never recreated.

**a. Authentication (§8, human gate).** One real email-OTP to `contact@banza.network` → verified →
`__Host-` session. (The code was never stored or printed.)

**b. Independent origin publication + external verification (§5, §6, §9).** A **fresh** challenge was
issued and published at the Operador Zero origin. Verified over the public edge **before** the engine ran:

| Check | Result |
|---|---|
| `GET https://zero.banza.network/.well-known/banza/ownership-challenge.json` | `HTTP 200`, `Content-Type: application/json`, `0` redirects, `Cache-Control: no-store` |
| `HEAD` | `HTTP 200` · `PUT` | `HTTP 405` |
| Served document | schema valid; nonce hash matched the issued nonce (`38343d87…`, hash only); bytes identical to the published file |
| Served by | nginx via Cloudflare (`cf-cache-status: DYNAMIC`) — the OZ origin, **not** the verifier |

**c. Engine verification (§10, §11) — positive `OriginVerificationReceipt`:** the SSRF-hardened Rust
fetcher (`banza-fetcher`) retrieved the document and Rust verified it.

```json
{ "receipt_type": "OriginVerificationReceipt", "result": "verified", "reason_code": "ok",
  "engine": "banzai-onboarding", "engine_version": "0.1.0", "method": ".well-known",
  "domain": "zero.banza.network", "response_sha256": "e1da8af1…bc400c2d",
  "candidate_id": "10e14892…", "candidate_implementation_id": "93c890cb…" }
```

**d. Single-use consume + replay refusal (§11).** On the positive verify the challenge was consumed. The
published file was removed (origin URL → `404`) and a re-verify of the same challenge returned
`{ ok:false, result:"already_used", reason_code:"challenge_already_consumed" }` — refused **before any
refetch**. DB: `origin_challenges` → `consumed=1`, `verified=1`. The candidate implementation is
`ORIGIN_VERIFIED`.

**e. Nine-stage journey executed (§12) — honest, not forced.** `POST /banzai/validate/journey`
{`operator-zero`, `operator-zero-ref-impl`} ran all **9 steps** (`step_count=9`, `protocol_fetch_count=23`,
`duration_ms≈1584`). Real per-step blockers were recorded (e.g. `TRUST_INVALID_ROOT_METADATA`,
`CONFORMANCE_EVIDENCE_INCOMPLETE`, `EVIDENCE_BUNDLE_INVALID`). JourneyReceipt
`journey-c8525897…`: `overall_status=FAILED`, `certification_status=NOT_CERTIFIED`, `certified=false`,
`certification_readiness=BLOCKED`, **`external_model_calls=0`, `qwen_calls=0`**. No CERTIFIED was ever
forced — this is the correct outcome for the sandbox Operador Zero.

**f. Reconciliation without duplication (§14).** `POST /onboarding/candidate/reconcile` bound the
origin-verified candidate to the **existing** closed-registry entry and drove the audited state chain to
`PUBLISHED`:

```json
{ "ok": true, "state": "PUBLISHED", "published_operator_id": "operator-zero",
  "published_implementation_id": "operator-zero-ref-impl",
  "note": "Candidatura ligada à entrada existente no Registo Técnico. Não cria operador novo nem entra em /operators; a certificação continua determinada pela evidência real." }
```

Audit trail (this run): `origin_challenge_issued → origin_verified → origin_verify_replay_rejected →
candidate_validation_started → candidate_validation_completed → candidate_publication_eligible →
candidate_published → candidate_reconciled`.

**g. §23 metrics confirmed (post-run, public edge + DB):**

| Metric | Value |
|---|---|
| `operator_zero_public_entries` (closed Technical Registry) | **1** |
| `reference_implementations` | **1** |
| `duplicates` | **0** (candidate count = 1; the recovered candidate, not a new one) |
| `origin_verified` | **true** |
| `journey_executed` | **true** (9/9 steps) |
| `external_model_called` | **0** |
| `GET /operators` (boundary) | **`[]`** — unchanged |
| challenge URL after consume | **`404`** |
| candidate | `PUBLISHED`, `published_operator_id=operator-zero` |

## 6. Verdict (§24)

The Operador Zero is now **integrally re-enrolled**: the domain published the real challenge; the Rust
fetcher obtained it over the public edge; the proof was positive; a valid `OriginVerificationReceipt`
exists; the challenge is consumed and single-use (replay refused); the nine-stage journey was actually
executed with honest blockers and zero model calls; the candidature is reconciled to the *existing*
Operador Zero entry; no duplicate was created; and the public state remains correct (`/operators` `[]`,
challenge URL `404`).

## 7. Boundary reaffirmed

The Operador Zero stays a **reference / sandbox** implementation: published, not production, real-money
activation off, `NOT_CERTIFIED`. Certification remains determined by real evidence — reconciliation only
records that a verified candidature corresponds to the existing public entry; it asserts nothing about
certification.
