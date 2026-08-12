#!/usr/bin/env bash
# check-banzai-bzc-coverage.sh — BZC-4 cross-protocol resolution coverage guard.
#
# Drives the REAL Rust entity+artifact+scope resolver (artifact::resolve_scope, via knowledge.js → the
# committed WASM) over the combinatorial coverage matrix (services/banzai-api/eval/bzc-coverage.mjs) and
# asserts the four zero-tolerance criteria + the case-count floor:
#   wrong_entity_resolution = 0 · wrong_artifact_resolution = 0 · silent_ambiguity_resolution = 0 ·
#   generic_protocol_document_substitution = 0 · total cases >= floor.
# Deterministic; no model, no network. Complements the node test test/bzc4-coverage.test.js.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HARNESS="services/banzai-api/eval/bzc-coverage.mjs"
WASM_DIR="services/banzai-api/src/rustkb"
[ -f "$HARNESS" ] || { echo "FAIL: $HARNESS not found"; exit 1; }
[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }

echo "== banzai-bzc-coverage-check (BZC-4) =="
cd services/banzai-api
node eval/bzc-coverage.mjs --check
echo "BANZAI BZC COVERAGE CHECK PASSED ✅"
