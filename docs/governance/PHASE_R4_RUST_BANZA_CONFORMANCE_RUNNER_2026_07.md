# Phase R4 — Rust BANZA Conformance Runner with Golden Parity (2026-07)

**Program:** R1–R6 Rust-first engine migration (ADR-037). **Repo:** `banza-protocol/banza`.
**Branch:** `feat/r4-rust-banza-conformance-runner-2026-07`. Safety-critical.

> **PASS is technical conformance evidence, not production certification.** R4 adds the Rust runner but
> the Python legacy is **not removed**; no M2, no operator, no certificate; `/operators=[]` and
> `production_certificates=false` are untouched.

## Objective

Create `banza-conformance-rs` (`engines/banza-conformance`), the Rust conformance runner, with **proven
parity for the scope it ports**, keeping the Python legacy (`tools/banza-conformance/`) available for
the rest.

## Legacy audit (what the Python runner is)

- `run.py` — an **HTTP runner against a live operator** (`--url`): health/wallets/transfers/traces/
  manifest/payment-initiation suites, `SUITES`/`LEVEL_SUITES`, `compute_certification_level` (L0–L3),
  `build_report`. Requires a running operator; with none (pre-production, `/operators=[]`) it cannot
  produce PASS offline.
- `run_fed.py` (8 872 lines) — the federation runner (FED-* suites), needs a SimB fixture + crypto.
- `fixture_server.py` / `runner_infra.py` — the simulated-operator HTTP fixture + BRL/manifest signing.
- `conformance/vectors/*.json` — 61 offline vectors (levels 0–2) that describe operator cases **and**
  encode the financial invariants. `conformance/report-schema.json` — the report contract.

**Classification:** the offline vector/invariant/level/report logic is portable now; live-operator
execution and federation execution are `NOT_YET_PORTED` (need a running operator/SimB and R5 crypto).

## What shipped — `engines/banza-conformance`

- **Data model:** `ConformanceLevel` (L0–L4/Unknown), `Status`, `InvariantResult`,
  `ConformanceOutcome`, `Totals`, `ConformanceReport` (with `certification_disclaimer` +
  `not_yet_ported`), `Vector`, `VectorValidation`.
- **Runner (offline):** loads the 61 embedded vectors; validates structure; checks invariants —
  `INV-LEDGER-PRECISION` (integer minor units), `INV-LEDGER-DOUBLE-ENTRY` (`DEBIT|CREDIT`),
  `INV-SETTLE-IDENTITY-FIELDS`, `INV-LEVEL-BOUND`; builds a schema-compatible report carrying the PASS
  disclaimer.
- **CLI `banza-conformance-rs`:** `run`, `run-fed` (prints `not_yet_ported`), `check-vectors`,
  `report`, `parity`, `fixture`, `version` — deterministic JSON, no network, fail-closed.
- **Golden parity:** `golden/parity-summary.json` (timestamp-free summary of all 61 vectors + invariant
  ids); `parity` recomputes and asserts equality.
- **Tests (10):** level parse, vector parse (61), clean validation, ledger double-entry invariant,
  bad-vector/float-money rejection, report totals + deterministic JSON + disclaimer, report-schema
  validation (rejects missing disclaimer + certification claims), parity stability, honest
  not-yet-ported, security (no cert claim, fixed protocol version).
- **Make:** `conformance-rs-check` / `conformance-rs-test` / `conformance-rs-parity`;
  `rust-engine-check` now also builds/tests this crate. **CI:** `banza-conformance-rs.yml`.

## Parity result

Rust vector summary == golden for all **61 vectors** across 9 files (levels 0–2). Live-operator +
federation execution parity vs Python is `NOT_YET_PORTED` (needs a running operator/SimB + R5) — **R4
does not declare full parity**, only parity for the ported offline scope.

## Legacy status

Python `tools/banza-conformance/**` is **kept** and reclassified `R4_RUST_PARITY_IN_PROGRESS` in
`docs/governance/rust-first-legacy-allowlist.json`, removal condition = full parity (live + federation)
+ wrapper transition; crypto after R5. No PyPI/GHCR publish. `make conformance-check` (Python, live
operator) is unchanged.

## Checks

`cargo fmt`/`clippy -D warnings`/`test` (10) + `check-vectors`/`report`/`parity`/`run-fed` PASS ·
`make rust-rule-check` (0 blocked) · `rust-engine-check` · `purity`/`identity`/`invariant`/
`reference-svg` PASS. VERSION `1.0.0`.

## Confirmations

- No VERSION change. No M2, operator, certificate. `/operators=[]`, `production_certificates=false`
  untouched. No contracts/OpenAPI/vector semantic change (vectors read-only). No PyPI/GHCR publish.
- No provider real / Qwen / DeepSeek; no GPU; no external call; no secrets/`.env`. No Postgres/DNS/TLS/
  Cloudflare. **No deploy** (no website/service change). No `banzai` repo change.
- Python legacy **not removed**. PASS remains technical evidence, never a certificate.

## Next

R5 `banza-trust` (ed25519/BRL/certificate, parity + vectors) unblocks the federation + crypto scope;
then the federation runner and live-operator execution can be ported and Python retired.
