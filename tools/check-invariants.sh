#!/usr/bin/env bash
# check-invariants.sh — RUST_WRAPPER_ONLY (ADR-043, R10)
#
# Invariant Registry Guard for the BANZA protocol repository. The gate LOGIC lives in Rust:
#   engines/banza-repo-guards  (bin `banza-repo-guards`, subcommand `invariants`).
# It verifies that every INV-*/MON-* ID cited under contracts/ or conformance/ resolves to a
# canonical id (or alias) in contracts/invariants.json. This is a thin wrapper — it builds the
# Rust binary if needed and runs it from the repository root. No gate logic lives here.
#
# Usage: tools/check-invariants.sh

set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_run-repo-guard.sh" invariants
