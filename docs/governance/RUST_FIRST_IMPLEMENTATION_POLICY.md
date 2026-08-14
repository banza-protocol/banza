# Rust-First Implementation Policy (ADR-038)

**Status:** Accepted (2026-07) · **Enforced by:** `engines/rust-rule-guard` + the `Rust Rule Guard`
CI workflow + `make rust-rule-check`.

Official BANZA/BanzAI **engines are Rust**. TypeScript **presents**. Python legacy is **temporary
compatibility**. Shell **orchestrates**. Docs **explain**. E2E **proves**. **External operators
remain free to use any technology** — this policy binds only the official implementations maintained
by BANZA/BanzAI.

## What is an "engine" (must be Rust)

Any algorithmic / computational component:

- conformance runner (PASS/FAIL, conformance profiles L0–L4)
- crypto: ed25519 signing/verification, canonical JSON, hashing
- trust: certificate chain, key manifest, BRL / revocation, trust assertions
- invariant checking, ledger / integer-money math, settlement / netting
- BanzAI retrieval, indexing, scoring, normalization, evidence-bundle generation
- guards (authority, boundary, operator-neutrality, provider mode), eval runners
- provider / task-profile routing, fail-closed gates
- semantic schema / manifest validation with BANZA meaning

## What may stay non-Rust

| Language | Allowed for | Not allowed for |
|---|---|---|
| TypeScript / JS | UI, React/Next.js, rendering, navigation, HTTP route wrappers, thin adapters that call Rust artifacts/binaries/WASM | intent routing, matching, scoring, retrieval, validation, guards, evals |
| Python | temporary legacy/compat wrapper during migration | the canonical engine once a Rust version exists |
| Bash / Makefile | orchestration, invoking Rust binaries, CI/deploy glue, simple wrappers | inline normative algorithms (crypto, scoring, matching) |
| JSON / YAML / Markdown / SVG | data, spec, docs, assets | — |

## How the guard decides

`engines/rust-rule-guard` scans code files (`.ts .tsx .js .mjs .py .sh`) and classifies each:

1. **Carries the `RUST_WRAPPER_ONLY` marker** → allowed (`rust-wrapper-only`); a thin wrapper that
   only calls a Rust binary/WASM engine. No allowlist entry needed.
2. **A test file** (`*.test.*` / `*.spec.*` / `__tests__/`) that names an engine symbol → allowed
   (`test`); tests are permitted by the rule and reported transparently, never as pending migration.
3. **In the legacy allowlist** (`docs/governance/rust-first-legacy-allowlist.json`) → allowed, reported as *pending migration*.
4. **No strong engine marker** → allowed (`not-engine`). Generic domain words (e.g. "conformance",
   "double-entry") are deliberately **not** markers, so data/prose is never a false positive.
5. **`.tsx` (React) with a marker** → allowed (`ui`).
6. **Otherwise** (a `.ts/.js/.mjs/.py/.sh` engine outside the allowlist) → **BLOCKED**.

As of **R10 the BANZA allowlist is empty**: zero engines pending migration, zero blockers. Every
official engine *and* every official gate is Rust; the remaining shell/TS files are wrappers, tests,
UI, or non-engine glue.

Strong markers are code-specific tokens (`.nfd(`, `tokenize`, `scoreEntry`, `ed25519`,
`verify_signature`, `selectRoute`, `openssl dgst`, …). Real crypto is caught by verb markers, not by
nouns like `key_manifest` (which appear in JSON-serving routes).

## Running it

```bash
make rust-rule-check          # enforce the policy on the whole repo
make no-new-ts-engine-check   # alias
make rust-engine-check        # cargo test every crate under engines/
cd engines/rust-rule-guard && cargo test   # guard's own fixtures
# scan only changed files (e.g. in a PR):
engines/rust-rule-guard/target/release/rust-rule-guard check --files a.ts b.py
```

CI runs `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, and the repo scan on every
push and PR (`.github/workflows/rust-rule-guard.yml`).

## Adding an exception

If a file is genuinely UI/glue but trips a marker, add a short, justified entry to
`docs/governance/rust-first-legacy-allowlist.json`:

```json
{ "path": "…", "repo": "banza", "classification": "…", "migration_phase": "…",
  "reason": "why it is allowed / when it migrates", "owner": "…", "removal": "…" }
```

Entries ending in `/**` are directory globs; `dir/*.suffix` matches a suffix within a directory.
Every legacy entry must name the migration phase (R2–R6) and its removal condition.

## Migration phases

R1 policy + guard (this) → R2 Rust BanzAI evidence engine → R3 guards/evals + BanzAI Rust core →
R4 `banza-conformance-rs` → R5 `banza-trust` (crypto/BRL) → R6 legacy wrappers + first tightening →
R7 TEST-ONLY signing → R8 `banza-simb` federation/live conformance → R9 Python removal →
**R10 zero non-Rust official gates**: the repository-hygiene gates (purity, operator contamination,
invariant registry, OpenAPI compatibility) become the Rust crate `engines/banza-repo-guards`, their
shell scripts are thin `RUST_WRAPPER_ONLY` wrappers, and the allowlist is emptied.

Reports: `PHASE_R0_…`, `PHASE_R2_…` … ,
.
