#!/usr/bin/env bash
# check-operator-contamination.sh — RUST_WRAPPER_ONLY (ADR-038, R10)
#
# Operator Neutrality Guard for the BANZA protocol repository. The gate LOGIC lives in Rust:
#   engines/banza-repo-guards  (bin `banza-repo-guards`, subcommand `contamination`).
# This is a thin wrapper — it builds the Rust binary if needed and runs it from the
# repository root. It contains no gate logic of its own.
#
# Usage: tools/check-operator-contamination.sh

set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_run-repo-guard.sh" contamination
