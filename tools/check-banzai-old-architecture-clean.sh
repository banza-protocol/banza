#!/usr/bin/env bash
#
# BanzAI old-architecture clean-slate guard (M2.18B.6).
#
# After the migration to Rust-First Grounded Synthesis, the ACTIVE runtime must read as if it were designed
# single-pass from the start: no name, symbol, import, env var, trace field, gate or comment from the
# retired two-pass / input-interpreter architecture survives in the code the service actually runs. This
# guard scans those surfaces (engine + service source, tests, guard scripts, infra) for the forbidden old
# names and fails on any hit. It complements banzai-grounded-synthesis-architecture-check (which proves the
# NEW architecture is present); this one proves the OLD one is GONE.
#
# Scope: engines/banzai-api-kb/src, services/banzai-api/src, services/banzai-api/test,
# services/banzai-api/eval, tools/, infra/banza-network. The M2.18B.6 eval harness + dataset were migrated
# to the single Grounded-Synthesis contract (the retired two-pass interpreter eval + its dataset are gone),
# so eval/ is now in scope. Not yet in scope (migrated in the docs/website/SVG phase, which then extends
# this guard): the website, the public diagrams and the docs corpus. Generated WASM glue (src/rustkb) and
# node_modules are excluded. Historical phase reports and the migration artifacts are records of what WAS
# and are never scanned.
#
# set -eu (house style). Self-tests its detector. Exit 1 on any surviving old name, exit 2 on self-test fail.

set -eu
cd "$(dirname "$0")/.."

# The retired-architecture names. Whole set is case-sensitive except the two-pass spelling variants.
PATTERN='[Tt]wo[-_ ]?[Pp]ass|TWO_PASS|IntentEnvelope|IntentEntry|runEntryPass|entry_pass|intent_interpreter|interpreter_status|interpreter_model|interpreter_latency|interpretQuestion|refine_intent|refineIntent|BANZAI_UNIFIED_TWO_PASS|BANZAI_INTENT_INTERPRETER|BANZAI_SINGLE_PASS|twoPassGate|interpreterGate|createInterpreterGate'

# Files that are ALLOWED to name the retired terms because their whole job is to assert those terms are
# absent (this guard + the architecture guard + the single-pipeline guard, which forbids the old tiers).
# Files ALLOWED to name the retired terms:
#  - the three assert-absence guards (their whole job is to name the terms they forbid);
#  - the canonical-vocabulary generator (gen-banzai-vocabulary.mjs) — its HISTORICAL_TERMS list NAMES the
#    retired terms ("two-pass", "workbench", "banza ca") for the sole purpose of REJECTING them from the
#    canonical vocabulary; same assert-absence category as the guards above, not surviving architecture;
#  - the GENERATED retrieval indexes (doc-index.json / entries-index.json). These are build artifacts
#    produced by banzai-doc-indexer from the canonical docs; ADR-042 (Rust-First Grounded Synthesis)
#    legitimately NAMES the retired "two-pass" architecture it supersedes, so its indexed chunks carry
#    the term as history — same category as the generated WASM glue (src/rustkb), which is already excluded.
ALLOW='tools/check-banzai-old-architecture-clean.sh|tools/check-banzai-grounded-synthesis-architecture.sh|tools/check-banzai-single-production-pipeline.sh|tools/gen-banzai-vocabulary.mjs|engines/banzai-query-core/src/doc-index.json|engines/banzai-query-core/src/entries-index.json'

SCOPE="engines/banzai-api-kb/src services/banzai-api/src services/banzai-api/test services/banzai-api/eval tools infra/banza-network"

echo "== banzai-old-architecture-clean-check (M2.18B.6) =="

# shellcheck disable=SC2086
hits="$(grep -REn --exclude-dir=rustkb "$PATTERN" $SCOPE 2>/dev/null | grep -vE "^($ALLOW):" || true)"

if [ -n "$hits" ]; then
  echo "FAIL: retired two-pass / input-interpreter names survive in active code:" >&2
  echo "$hits" | sed 's/^/  /' >&2
  echo "" >&2
  echo "banzai-old-architecture-clean-check: NEEDS_FIX" >&2
  exit 1
fi

# ── self-test: the detector must fire on a planted old name ────────────────────────────────────────
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
printf 'const t = { two_pass_called: true };\n' > "$tmp/neg.js"
if ! grep -REn "$PATTERN" "$tmp" >/dev/null 2>&1; then
  echo "GUARD SELF-TEST FAILED: detector did not fire on a planted old name" >&2
  exit 2
fi

echo "banzai-old-architecture-clean-check: OK (no retired names in active code)"
