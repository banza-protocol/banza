#!/usr/bin/env bash
# Thin wrapper — only invokes the Rust binary. Allowed.
set -euo pipefail
exec cargo run --quiet -p banza-conformance -- run "$@"
