# ADR-037 — Rust-first policy for official BANZA and BanzAI engines

- **Status:** Accepted
- **Date:** 2026-07

## Context

BANZA is an operator-neutral protocol: **external operators may implement their systems in any
technology** (ADR-001, `docs/governance/certification-boundary.md`). That neutrality is a permanent
protocol invariant and is not in question here.

Separately, the project maintains a growing set of **official implementations** — the conformance
runner, the cryptographic trust root, the BanzAI evidence/retrieval engine, invariant checkers, and
various quality/authority guards. Phase R0 ()
audited both `banza-protocol/banza` and `banza-protocol/banzai` and found these official engines
spread across Python, TypeScript and Bash, with **no Rust present** and no policy fixing which
language an official engine must use. That is a correctness and auditability risk for the components
that will become the integrity spine of the federation (certification verdicts, ed25519/BRL trust).

## Decision

**Official BANZA/BanzAI engines must be implemented in Rust.** An "engine" is any algorithmic or
computational component: conformance, crypto, BRL, trust, certificate and manifest verification,
invariant checking, BanzAI retrieval/indexing/scoring, guards, eval runners, provider routing,
semantic validation, and evidence-bundle generation.

- **TypeScript/JavaScript** is permitted only for UI, React/Next.js, rendering, navigation, browser
  glue, HTTP wrappers without algorithm, and thin adapters that consume Rust artifacts/binaries/WASM.
- **Python** is permitted only as a temporary legacy/compatibility wrapper while an engine is
  migrated; it is not the canonical implementation once a Rust engine exists.
- **Bash/Makefile** is permitted only for orchestration, invoking Rust binaries, and CI/deploy glue.
- **JSON/YAML/Markdown/SVG** remain data, spec and documentation.
- **External operators remain technology-neutral** — this rule binds only the official
  implementations maintained by BANZA/BanzAI.
- **Legacy** non-Rust engines identified by R0 are recorded in
  `docs/governance/rust-first-legacy-allowlist.json` and migrated in phases **R2–R6**; they are not
  removed before Rust parity is proven.
- **New** non-Rust engines are **blocked in CI** by `engines/rust-rule-guard` (the `Rust Rule Guard`
  workflow and `make rust-rule-check`). Exceptions require a short, justified allowlist entry.

## Consequences

- The computational core of the ecosystem becomes uniformly Rust: testable with `cargo test`,
  auditable, deterministic, and cheap to run without a model or network.
- TypeScript is confined to presentation; the website consumes Rust-produced evidence rather than
  computing it.
- The legacy Python conformance/crypto runners stay as compatibility wrappers until
  `engines/banza-conformance` and `engines/banza-trust` reach proven parity (R4/R5), then are
  deprecated — never silently removed.
- A drift guard prevents regressions: no new TS/JS/Python engine can land outside the allowlist.
- Operator neutrality is untouched; the protocol still admits any operator technology.

See `docs/governance/RUST_FIRST_IMPLEMENTATION_POLICY.md` for the operational policy and
`docs/governance/PHASE_R1_R6_RUST_FIRST_ENGINE_MIGRATION_2026_07.md` for the migration program.
