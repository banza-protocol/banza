# PHASE R10 — Zero Non-Rust Official Gates (BANZA)

**Date:** 2026-07-15 · **Policy:** ADR-037 (Rust-first for official engines) ·
**Scope:** BANZA protocol repository (`~/banza`). At the time of this report the BanzAI engines were
tracked in a separate repository; they have since been consolidated into this monorepo
(services/banzai-api + engines/banzai-*, ADR-075) — there is no longer a separate BanzAI repository.
**Pre-production throughout:** `/operators = []`, `production_certificates = false`, mock provider,
`llm_calls = 0`. No deploy (this change touches only gates, CI and docs).

---

## Objective

Remove the last footnote from the R7–R9 closure. After R9, every official *engine* was Rust, but a
set of official **gates** were still shell/Python scripts carrying their algorithm inline:

- `tools/check-repository-purity.sh` — repository purity (forbidden dirs/terms/docs/ADR range)
- `tools/check-operator-contamination.sh` — operator-brand neutrality
- `tools/check-invariants.sh` — invariant-registry integrity (inline `python3`)
- `tools/check-openapi-compatibility.sh` — OpenAPI breaking-change diff (inline `python3`)

R10 moves the **gate logic** to Rust, turns the shells into thin `RUST_WRAPPER_ONLY` wrappers,
and empties the legacy allowlist.

---

## What shipped

### 1. New Rust crate `engines/banza-repo-guards`

The Rust owner of the repository-hygiene gate logic. `git` is used only as a data source
(`git ls-files`); every decision is Rust.

| Subcommand | Replaces | Logic |
|---|---|---|
| `purity` | `check-repository-purity.sh` | forbidden dirs, build artifacts, forbidden implementation terminology (self/report-excluded), forbidden docs dirs, operator-era root artifacts, stray phase reports, ADR range `001..037` |
| `contamination` | `check-operator-contamination.sh` | operator-brand denylist (built from parts to avoid self-match) in names + contents; commercial payment brands in the normative surface (`contracts/`, `conformance/`); governance-claim patterns as advisory warnings |
| `invariants` | `check-invariants.sh` | loads `contracts/invariants.json`; every `INV-*/MON-*` id cited under `contracts/`+`conformance/` must resolve to a canonical id or alias |
| `openapi NEW OLD` | `check-openapi-compatibility.sh` | breaking-change diff: removed endpoints, removed methods, removed required request fields, removed response fields; exit `0`/`1`/`2` |

The crate **self-excludes its own source** (`engines/banza-repo-guards/`) from content scans — it
contains the forbidden-term and brand literals, exactly as the shells excluded themselves.

### 2. Shells → thin wrappers

The four scripts (+ a shared `tools/_run-repo-guard.sh` launcher) now carry the `RUST_WRAPPER_ONLY`
marker and only build/exec the Rust binary. They contain no gate logic. Their Make/CI call sites are
unchanged, so `make identity-check` / `purity-check` / `invariant-check` and the
`repository-purity`, `identity-guard`, `conformance` (invariants + openapi) workflows keep working.

### 3. Guard hardening + empty allowlist

- `engines/rust-rule-guard` gained a transparent **`TestAllowed`** class: a `*.test.*` / `*.spec.*` /
  `__tests__/` file that names an engine symbol is a permitted test, reported (not hidden) and **not**
  counted as pending migration. The exemption does **not** leak to non-test files (covered by a test).
- `website/components/home/banzaiKb.ts` (the R2 WASM adapter, 66 lines, no algorithm) now carries
  `RUST_WRAPPER_ONLY` — an honest classification, so it needs no allowlist entry.
- The four gate wrappers are `WrapperMarked`; the four non-marker infra/SVG smoke scripts carry no
  engine marker, so once de-allowlisted they are `NotEngine`.
- **`docs/governance/rust-first-legacy-allowlist.json` is now empty** (`entries: []`). The former
  banzai cross-repo entries were tracked in the then-separate BanzAI repo's own allowlist, not here;
  that repository has since been consolidated into this monorepo (ADR-075).

Guard result on this repo:

```
rust-rule-guard (ADR-037) — scanned 78 code files
  allowlist entries loaded: 0
  legacy engines pending migration: 0
  UI surfaces referencing engines (allowed): 4
  test files exercising engines (allowed): 1
    · services/banzai-api/test/pipeline.test.js  [allowed:test]

✓ PASS — no new non-Rust engine; zero legacy pending migration.
```

### 4. CI + Make

- `.github/workflows/rust-engines.yml`: new `banza-repo-guards` job (fmt / clippy `-D warnings` /
  test / `-- all` on the repo).
- `Makefile`: `repo-guards-rs-check` and `repo-guards-rs-test` targets; identity/purity/invariant
  targets documented as Rust-backed wrappers.

---

## Equivalence evidence (Rust == the scripts it replaces)

The migration is behaviour-preserving. Each gate was verified against the script it replaces:

- **Real repo, positive:** all four Rust gates return the **same PASS** as the original scripts on
  the current tree (`purity`, `contamination`, `invariants` PASS; `openapi` identical-spec → exit 0
  with the same operation counts).
- **Real repo, negative:** in a throwaway git repo with planted violations, each gate **fails on
  exactly** the planted issue and passes the valid neighbours (forbidden dir / forbidden term / bad
  ADR number; brand in content; commercial brand in the normative surface; an unresolved `INV-` id —
  while a resolvable id is *not* flagged).
- **OpenAPI, byte-for-byte:** Python vs Rust produce **identical stdout and exit codes** across all
  four breaking-change branches (removed endpoint, removed method, removed required request field,
  removed response field), the identical-spec path (exit 0), and the parse/usage-error path (exit 2).
  The wrapper forwards `NEW OLD` positionally, preserving the exact CI wiring.

---

## Constraints honoured

No provider / Qwen / DeepSeek / GPU / external API; no secrets; no `.env`; no `VERSION` change; no
M2/M3; no operator added; no certificate issued; `/operators=[]` and `production_certificates=false`
untouched; Postgres / DNS / Cloudflare / TLS untouched. **No deploy** — this change is gates, CI and
docs only, with no live surface affected.

---

## Scope boundary (honest)

This report covers the **BANZA repository**. The R10 program also has a **banzai** half (its bash
guards `check-authority`/`check-provider`/`check-boundaries`/`check-diagrams` +
`scripts/check-operator-contamination.sh`, and the deprecated `src/api` dev/local TS duplicates whose
logic already lived in the BanzAI engine at the time). That work was tracked in the then-separate
BanzAI repository's own R10 report and allowlist; BanzAI has since been consolidated into this
monorepo (services/banzai-api + engines/banzai-*, ADR-075). The BANZA side is, on its own terms,
**complete**: zero P0/P1 active
legacy, zero blockers, zero pending migration, an empty allowlist, and every official gate Rust.

**Verdict (BANZA):** `BANZA R10 ZERO NON-RUST OFFICIAL GATES COMPLETE`.
