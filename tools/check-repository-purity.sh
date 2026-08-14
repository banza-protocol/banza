#!/usr/bin/env bash
# check-repository-purity.sh — RUST_WRAPPER_ONLY (ADR-038, R10)
#
# BANZA Repository Purity Guard. The gate LOGIC lives in Rust:
#   engines/banza-repo-guards  (bin `banza-repo-guards`, subcommand `purity`).
# This is a thin wrapper — it builds the Rust binary if needed and runs it from the
# repository root. It contains no gate logic of its own.
#
# Usage: tools/check-repository-purity.sh

set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_run-repo-guard.sh" purity
