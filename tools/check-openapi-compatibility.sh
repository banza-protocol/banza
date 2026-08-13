#!/usr/bin/env bash
# check-openapi-compatibility.sh — RUST_WRAPPER_ONLY (ADR-043, R10)
#
# Compares two OpenAPI specs and reports breaking changes. The diff LOGIC lives in Rust:
#   engines/banza-repo-guards  (bin `banza-repo-guards`, subcommand `openapi NEW OLD`).
# This is a thin wrapper — it builds the Rust binary if needed and forwards the arguments
# unchanged (positional NEW OLD, exit 0/1/2). It contains no diff logic of its own.
# It does NOT cd, so caller-relative spec paths resolve exactly as before.
#
# Usage: tools/check-openapi-compatibility.sh NEW_SPEC OLD_SPEC

set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,9p' "$0" | sed 's/^# //'
  exit 0
fi
if [[ $# -lt 2 ]]; then
  echo "Usage: $0 NEW_SPEC OLD_SPEC" >&2
  exit 2
fi

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
CRATE="$REPO_ROOT/engines/banza-repo-guards"
BIN="$CRATE/target/release/banza-repo-guards"
if [[ ! -x "$BIN" ]]; then
  echo "banza-repo-guards: building Rust gate binary (first run)…" >&2
  cargo build --release --manifest-path "$CRATE/Cargo.toml" >&2
fi

exec "$BIN" openapi "$@"
