# Phase R7–R8–R9 — Final Rust Closure (2026-07)

**Program:** R1–R9 Rust-first engine migration (ADR-037). **Repo:** `banza-protocol/banza`.
**Branch:** `feat/r7-r8-r9-final-rust-closure-2026-07`.

> **Verdict: `BANZA / BANZAI FINAL RUST CLOSURE COMPLETE`** for the two R6 blockers. No official
> critical engine remains in Python/TS/JS for a function that Rust has substituted. TEST ONLY — no real
> key, no production certificate, no operator; `/operators=[]`, `production_certificates=false`.

## The two R6 blockers — eliminated

### R7 — Trust signing + root ceremony → Rust (TEST ONLY)

`engines/banza-trust` gained a `sign` module: deterministic-seed ed25519 keypairs (no randomness, no
production keygen), `sign_test_certificate/brl/key_manifest/assertion`, and a **root-ceremony
simulator** (`ceremony-simulate`: root → key manifest → certificate → BRL → revoke → verify;
`ceremony-check`). Every artifact is `TEST ONLY — NOT PRODUCTION`; the report asserts
`production=false`, `operators_changed=false`, `certificates_changed=false`,
`root_public_state_changed=false`. New CLI: `generate-test-root`, `sign-test-*`, `ceremony-simulate`,
`ceremony-check`. The Rust signer/verifier round-trips (Rust signs → Rust verifies); revocation and
tamper are rejected. **9 trust tests** (R5 golden parity + R7 signing/ceremony).

### R8 — Live + federation conformance → Rust, against a Rust SimB

- **`engines/banza-simb`** — a local, deterministic, in-process operator/federation simulator (ledger
  double-entry, idempotency, no-negative-balance, settlement identity, federation route + netting). No
  network, no funds, no secrets. **6 tests.**
- **`engines/banza-conformance`** gained `live::run_live` (L0–L2 against SimB: health, transfer,
  double-entry, idempotency, invalid payload, no-negative-balance, settlement identity — **7 PASS**) and
  `live::run_fed` (two SimB peers + `banza-trust` cert/BRL verification, trust-peer, **revocation
  fail-closed**, route, idempotency, netting — **8 PASS**). New CLI: `run-live`/`run-against-simb`,
  `run-fed`, `e2e`. `not_yet_ported()` is now **empty**. **12 conformance tests.**

### R9 — Remove the substituted Python; strict guard

**Removed** (replaced by the Rust engines above): the whole Python conformance package
(`run.py`, `run_fed.py`, `fixture_server.py`, `runner_infra.py`, `run_interop.py`, `l0_fixture.py`,
`trust_root.py`), the Python root ceremony (`ceremony_script.py`, `test_ceremony_custody.py`), and
`conformance/tests/test_crypto_integrity.py`. Their entrypoint READMEs now point to Rust. The 3 Python
publish/distribution CI workflows (PyPI/GHCR/distribution) were **removed** (no package is published).
`make conformance-check` → `banza-conformance-rs` (vectors + live-SimB); `make crypto-check` →
`banza-trust` golden. The **guard** gained strict Python-engine markers (`sign_certificate`, `sign_brl`,
`run_federation`, `fixture_server`, `signingkey`, …) + a test that a new Python signer/conformance runner
is **blocked**. The three stale allowlist entries (removed files) were dropped.

## Blockers: before → after

| Blocker | Before (R6) | After (R9) |
|---|---|---|
| Trust signing + root ceremony | Python (`trust_root.py`, `ceremony_script.py`) | **Rust** `banza-trust` sign + `ceremony-simulate` (TEST ONLY); Python removed |
| Live-operator + federation conformance | Python (`run.py`, `run_fed.py`) NOT_YET_PORTED | **Rust** `banza-conformance-rs run-live/run-fed` against `banza-simb`; Python removed |

`not_yet_ported` = **[]**. No PyPI/GHCR publish.

## Checks

Eight Rust crates (rust-rule-guard 12, banzai-evidence, banzai-api-kb, banza-conformance 12,
banza-trust 9, banza-simb 6, + guard) `fmt`/`clippy -D warnings`/`test`. `make rust-final-closure-check`
(signing + ceremony + SimB + live + federation) · `conformance-check` (vectors + live-SimB) ·
`crypto-check` (golden ed25519) · `rust-rule-check` (0 blocked) · `purity`/`identity`/`invariant`/
`reference-svg` PASS · 0 forbidden claims · VERSION `1.0.0`.

## Remaining non-substituted legacy (not the two blockers, not parallel motors)

For full transparency: a few **P1 shell gates** in banza (`check-repository-purity.sh`,
`check-operator-contamination.sh`, `check-invariants.sh`, `check-openapi-compatibility.sh`) and the
**banzai dev/local `src/api` TS** (not the deployed service) are non-Rust but have **no parallel Rust
motor** — they are *not-yet-ported gates*, not *substituted engines kept in parallel*. They do not
reintroduce either R6 blocker. They remain allowlisted for a later gate-migration.

## Confirmations

- No real key, no production keygen/signing, no certificate issuance; TEST fixtures/seeds only.
- No VERSION change. No M2/M3, operator, certificate. `/operators=[]`, `production_certificates=false`
  untouched. No contracts/OpenAPI/vector semantic change. No PyPI/GHCR publish.
- No provider real / Qwen / DeepSeek; no GPU; no external call; no secrets/`.env`. No Postgres/DNS/TLS/
  Cloudflare. **No deploy** (engines/docs/CI only; no live service changed). BanzAI/banzai-api still
  Rust/WASM, mock, `llm_calls=0`. Operators remain technology-neutral.
