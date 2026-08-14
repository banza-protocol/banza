#!/usr/bin/env bash
# _run-repo-guard.sh — RUST_WRAPPER_ONLY (ADR-038, R10)
#
# Shared launcher for the Rust repository-hygiene gates. The gate LOGIC lives in Rust
# (engines/banza-repo-guards, bin `banza-repo-guards`). This wrapper only:
#   1. cd's to the repository root (the gate reads `git ls-files` from cwd),
#   2. builds the release binary if it is missing,
#   3. execs it with the requested subcommand (purity | contamination | invariants | all).
# No gate logic lives here.

set -euo pipefail

SUBCMD="${1:-all}"
REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CRATE="engines/banza-repo-guards"
BIN="$CRATE/target/release/banza-repo-guards"

if [[ ! -x "$BIN" ]]; then
  echo "banza-repo-guards: building Rust gate binary (first run)…" >&2
  cargo build --release --manifest-path "$CRATE/Cargo.toml" >&2
fi

exec "$BIN" "$SUBCMD"
