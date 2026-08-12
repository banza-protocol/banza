# Fase A — Tests & Guards Inventory (BanzAI Workbench reconstruction)

> Completes the one Fase-A audit area that errored in the discovery workflow. Read-only inventory.
> Feeds the Fase D/F test plan. HEAD `598a7e03`; branch `feat/banzai-workbench-reconstruction`.

## Top-line facts

- **Coverage is strong.** §12.1 (unit/contractual) = ALL PRESENT. §12.2 (negative security) = essentially
  ALL PRESENT (extensive real SSRF suite). §12.3 (Operator Zero E2E variants) = 6 concrete gaps.
- **No `cargo-fuzz` dir** in any validation engine; proptest/quickcheck are not deps. The only
  fuzz/property/metamorphic suite is `engines/banzai-query-core/tests/` (reasoning core, not a validation engine).
- CI `.github/workflows/identity-guard.yml` = **105 jobs**; Rust `cargo test` runs in `rust-engines.yml`,
  `banza-trust.yml`, `banza-conformance-rs.yml`, `operator-zero.yml`, `conformance.yml`. Makefile = 165
  `*-check:` targets.

## Rust engine test coverage (validation path)

| Engine | #[test] | Character |
|---|---|---|
| banza-target-registry | 13 | closed registry lookup/shape |
| banza-operator-manifest | 7 | wrapped/bare manifest, deterministic hashes, bad-version invalid, missing-key-manifest incomplete, production-claim invalid |
| banza-trust | 26 | signed-metadata verify; negatives: tampered sig, expired/stale, incompatible version, revoked delegated key, wrong delegated usage/domain, root threshold |
| banza-conformance | 21 | conformance runner + tool |
| banza-l2-readiness | 12 | L2 gating (idempotency/double-entry/settlement) |
| banza-l3-readiness | 11 | L3 federation (l1=8, l4=12 also present) |
| banza-evidence-bundle | 10 | build↔validate roundtrip, tampered fails integrity, malformed fails closed, incomplete surfaces |
| **banza-artifact-fetcher** | **42** | **full SSRF negative suite**: private IP, loopback v4/v6/ULA/link-local, CGNAT/reserved/metadata-IP, DNS rebinding (private + mixed-set), redirect blocked & never followed + loop, forbidden port, invalid TLS, oversize (declared+streamed), wrong content-type, non-https, host mismatch, content-encoding bomb |
| **banzai-operator-journey** | **66** | state machine + dependency gating + back-nav + upload safety (private-key/PEM/JWK/credential/nested-secret blocked) + `journey_e2e.rs` (failing verdict sends back, fixing unblocks exactly next step, full green run reaches complete evidence, two views never disagree) |
| banzai-onboarding | 9 | OTP single-use/expired/attempts, rate-limit, session, origin roundtrip, never stores plaintext |
| operator-zero-core | 43 | ledger invariants, demo boundary, artifact tree |
| operator-zero-e2e-root | 10 | all artifacts exist, Ed25519 verify, tampered fails, revocation fail-closed, demo root ≠ protocol trust root |

## banzai-api key suites

- `endpoint-validation.test.js` (12) — **core §12 aggregate E2E**: 9 origin-bound receipts w/ every §30 field;
  engine per step; INVALID published manifest flips verdict; Readiness aggregates but never certifies; never
  calls a model; negatives (unknown operator/impl, `host_mismatch`, `size_cap_exceeded`, unknown step).
- `journey.test.js` (7) — `deriveJourney` re-derives safe view from Rust, never trusts browser; upload sanitiser.
- `onboarding.test.js` (12) — OTP→session→candidate→impl→origin proof; single-use replay closed; ownership
  isolation; rate-limit; no plaintext persisted.
- `runtime-ssot.test.js` (3), `workbench-tool-routing.test.js` (9), OZ suites, boundary suites, large reasoning
  suites (pipeline 50, provider 36, answer-contract 15, intent/typo/grounded).

## §12 coverage map

- **§12.1 unit/contractual — ALL PRESENT** (states, transitions, dependencies, reason-codes, serializers,
  schemas, hashes, receipts, evidence-bundle, invalidation, retries, step-9 aggregation).
- **§12.2 negative security — ALL PRESENT** (arbitrary URL, redirect, private IP, loopback, DNS rebinding,
  forbidden port, invalid TLS, oversize, invalid content-type, invalid manifest, incompatible version, invalid
  signature, revoked key, wrong key domain, stale metadata, digest mismatch, replay, missing artifact,
  incomplete bundle, tampered engine result, expired session, reused OTP, rate-limit abuse, cross-workspace).
  Nuance: expired-key is covered via signed-metadata expiry, not a dedicated key-TTL test.

## §12.3 — Operator Zero E2E gaps (the NEW tests Fase D must add)

1. **No single literal 20-step OZ E2E** — the sequence is proven across three suites (`endpoint-validation.js`
   + `journey_e2e.rs` + `operator-zero-e2e-root/e2e_root.rs`), not one end-to-end script. → add a single
   authoritative 20-step E2E.
2. **Cancel** — MISSING: no journey-cancel test. → add.
3. **Journey-level timeout/abort** — PARTIAL (only fetcher/provider timeouts). → add.
4. **Origin unavailable/unreachable** as a distinct journey path — PARTIAL (only host-mismatch/size-cap). → add.
5. **Resumed session mid-flight** — PARTIAL (consistency + always-mounted covered; resume-after-persist not).
   → becomes meaningful with the ADR-076 Postgres receipt store; add resume-after-persist E2E.
6. **Expired key** dedicated key-TTL test (minor). → add.

## NEW tests required by ADR-076 (beyond §12 gaps)

- **Durable receipts:** persistence-after-API-restart; immutability (UPDATE/DELETE fail via DB trigger);
  tampered-hash detected on read; idempotent no-double-receipt; **OZ uses identical tables/APIs/authz (no
  privileged path)**; no LLM/free-model text in the formal signed receipt.
- **Journey capabilities:** from-first-unverified; invalidation of dependents (re-run upstream marks downstream
  stale); reproduction from pinned artefacts (SEMANTICALLY_EQUIVALENT/NOT_EQUIVALENT/INPUTS_UNAVAILABLE/
  ENGINE_VERSION_UNAVAILABLE/BLOCKED, never overwrite original); comparison between two runs.
- **Model A guidance-only:** zero verdict-states/scores/technical-decisions; Model-A→Model-B references are
  typed-id only; a Model B FAILED/BLOCKED never shows positive in Model A.
- **Residual security:** IPv6 NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`) + 6to4 (`2002::/16`) SSRF blocked in
  `banza-artifact-fetcher/src/policy.rs`.

## Existing guards to REUSE / RETARGET (not rebuild)

~50 banzai/OZ/journey/onboarding/runtime guards already exist (endpoint-originated, no-arbitrary-url,
closed-target-registry, secure-fetcher, fetch-receipt-binding, receipt-origin-fields, journey-receipt-origin,
nine-step-endpoint-input, no-qwen-decision, operator-journey[-e2e], session-context-robustness, runtime-ssot,
degraded-mode-render, post-synthesis-validation, ~15 operator-zero-*, operator-onboarding, simb-active-surface-
clean, UI structure guards). Fase E must **retarget** `operator-zero-vocabulary-contract` and
`check-banzai-simb-active-surface-clean` after removing orphan WASM. Fase D adds the NEW-behaviour guards from
ADR-076 D-076-13.
