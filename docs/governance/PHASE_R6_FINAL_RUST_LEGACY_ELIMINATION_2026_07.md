# Phase R6 — Final Rust Legacy Elimination, Runtime Swap and Guard Tightening (2026-07)

**Program:** R1–R6 Rust-first engine migration (ADR-037). **Repo:** `banza-protocol/banza`.
**Branch:** `chore/r6-final-rust-legacy-elimination-2026-07`.

> **Verdict: `BANZA / BANZAI R6 PARTIAL — NOT_YET_PORTED BLOCKERS REMAIN`.** Two blockers are
> structural (below), not deferred work — so R6 cannot be declared "complete". Everything that *could*
> be eliminated has been.

## What R6 eliminated / tightened (banza)

### 1. Live `banzai-api` knowledge engine → Rust (with authorized deploy)

`services/banzai-api/src/knowledge.js` was the last **live** JS retrieval engine (behind
`banzai.banza.network`). R6 ports its algorithm to Rust:

- **`engines/banzai-api-kb`** — a **byte-faithful** port of `normalize`/`scoreEntry`/`retrieveTopK`
  over the embedded entry keyword index, compiled to **Node WASM** (`src/rustkb`).
- **Parity proof:** old JS vs Rust WASM identical on **50/50** checks (25 questions × k∈{1,3}, retrieval
  ids **and** normalization). The **38** banzai-api service tests pass unchanged after the rewire.
- `knowledge.js` now keeps only DATA (`SOURCES`/`ENTRIES`/answers) + `RUST_WRAPPER_ONLY` glue: `normalize`
  and `retrieveTopK` call the Rust engine; `retrieve`/`buildContext` compose over the returned ids. No JS
  scoring/matching/ranking remains.
- Deployed **banzai-api only** (rollback-tagged; reverse-proxy/website/verification-api/postgres preserved).

### 2. `rust-rule-guard` tightening

- New **`RUST_WRAPPER_ONLY`** marker → a thin wrapper that only calls a Rust engine is allowed without a
  legacy allowlist entry (verdict `allowed:rust-wrapper-only`). `knowledge.js` uses it and was **removed
  from the allowlist**.
- Added code-specific engine markers (`retrieve_topk`, `route_task`, `guard_claim`, `verify_certificate`,
  `verify_brl`, `check_chain`); excluded generated `rustkb`/`pkg` output. New test: wrapper-marked file
  passes without an allowlist entry (11 guard tests).

### 3. Allowlist tightening

Removed the substituted `knowledge.js` engine entry; added `pipeline.test.js` as `TEST_DRIVER_ALLOWED`.
No P0/P1 *substituted* engine remains allowlisted.

## NOT_YET_PORTED blockers (why R6 is PARTIAL)

1. **Trust signing + root ceremony** — R5's `banza-trust` is a **verifier** by design. `trust_root.py`'s
   signing/key-generation and `tools/root-ceremony/` are **not** ported (production signing stays
   offline/disabled pre-M2). A verifier cannot "eliminate" the signer.
2. **Live-operator + federation conformance** — R4's `banza-conformance-rs` ports the **offline** scope;
   `run.py` (live-operator HTTP) and `run_fed.py` (federation) require a **running operator/SimB** to
   execute, which does not exist pre-production. They stay Python (`R4_RUST_PARITY_IN_PROGRESS`).

These are tracked in the allowlist with categories and removal conditions; they are not counted as
"substituted-but-kept".

## Checks

`cargo fmt`/`clippy -D warnings`/`test` for all 5 crates (rust-rule-guard 11, banzai-evidence, banza-
conformance, banza-trust 7, banzai-api-kb 3) · `make rust-rule-check` **0 blocked** · `conformance-rs`/
`trust-rs` checks · `purity`/`identity`/`invariant`/`reference-svg` · banzai-api **38** service tests ·
Node parity **50/50** · 0 forbidden claims. VERSION `1.0.0`.

## Confirmations

- No VERSION change. No M2/M3, operator, certificate. `/operators=[]`, `production_certificates=false`
  untouched. No contracts/OpenAPI/vector semantic change. No PyPI/GHCR publish.
- No real provider / Qwen / DeepSeek; no GPU; no external call; `llm_calls=0`, mock-only. No secrets/
  `.env`. No DNS/TLS/Cloudflare/Postgres.
- **Deploy:** `banzai-api` only (authorized for the knowledge swap), rollback image
  `banza-banzai-api:rollback-pre-r6-rust-knowledge-swap`; reverse-proxy/website/verification-api/postgres
  **preserved**.
