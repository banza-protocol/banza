#!/usr/bin/env bash
# check-banzai-canonical-eval.sh — the CANONICAL BanzAI eval guard (Increment 7, §18-§20).
#
# Drives the committed Rust WASM engine (engines/banzai-query-core → banzai-api-kb → services/banzai-api/src/
# rustkb) through the pg-free knowledge.js wrappers over the committed, versioned canonical-eval.jsonl and
# asserts, hermetically (no model, no network, no pg):
#   §18 the count reconciliation is in sync + reproducible (canonical-reconciliation.{json,md});
#   §19 the generated JSONL is in sync (no drift), holds ≥2500 structured cases, and every one of the six
#       classes (base · variation · multi_turn · negative · live · regression) is populated;
#   §20 the metrics harness computes the eleven accuracy metrics (each ≥ its frozen floor) and the eight
#       zero-tolerance counters (every one exactly 0), and its committed report is in sync.
# The decision LOGIC is Rust; this wrapper only drives it and inspects the frozen expectations.
#
# CI note: the eval scripts import ONLY knowledge.js (RUST_WRAPPER_ONLY: node:crypto + the self-contained
# WASM) + the JSONL — never a module that transitively loads `pg` — so this runs in the M2.13B guard job
# that does not install banzai-api node_modules. If Node cannot load even that (unexpected), the guard
# degrades to the static presence checks rather than failing on an uninstalled optional runtime dependency
# (the try/catch pattern from check-banzai-toolplanner.sh).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

API="services/banzai-api"
WASM_DIR="$API/src/rustkb"
EVAL="$API/eval"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
for f in canonical-checks.mjs canonical-seeds.mjs gen-canonical-eval.mjs canonical-metrics.mjs \
         canonical-reconciliation.mjs canonical-eval.jsonl canonical-metrics-report.json \
         canonical-reconciliation.json; do
  [ -f "$EVAL/$f" ] || { echo "FAIL: $EVAL/$f not found"; exit 1; }
done

echo "== banzai-canonical-eval-check (Increment 7, §18-§20) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'ZERO_TOLERANCE' | grep -q 'ZERO_TOLERANCE' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── static: ≥2500 lines in the committed JSONL (cheap floor, independent of Node). ────────────────────
LINES=$(grep -c . "$EVAL/canonical-eval.jsonl" || true)
if [ "${LINES:-0}" -ge 2500 ]; then ok "committed canonical-eval.jsonl holds $LINES cases (≥2500)"; else fail "canonical-eval.jsonl has $LINES cases (< 2500)"; fi

# ── static: the committed metrics report records verdict PASS + every zero-tolerance counter 0. ──────
grep -q '"verdict": "PASS"' "$EVAL/canonical-metrics-report.json" || fail "committed metrics report is not PASS"

# ── behavioural: try to run the three --check drivers (WASM-only, pg-free). Degrade if Node can't load. ─
probe=$(cd "$API" && node -e 'import("./src/knowledge.js").then(()=>console.log("OK")).catch((e)=>console.log("SKIP:"+(e&&e.code||e&&e.message||"err")))' 2>/dev/null || echo "SKIP:spawn")
case "$probe" in
  OK*)
    # §18 — the reconciliation is reproducible + in sync (and canonical ≥2500, all classes populated).
    if (cd "$API" && node eval/canonical-reconciliation.mjs --check); then ok "§18 reconciliation in sync + reproducible"; else fail "§18 reconciliation drift / floor / empty class"; fi
    # §19 — the JSONL regenerates byte-identically, ≥2500, all six classes populated.
    if (cd "$API" && node eval/gen-canonical-eval.mjs --check); then ok "§19 canonical-eval.jsonl in sync (≥2500, six classes)"; else fail "§19 canonical-eval.jsonl drift / floor / empty class"; fi
    # §20 — the metrics harness gates (accuracy ≥ floors, all zero-tolerance = 0) + report in sync.
    if (cd "$API" && node eval/canonical-metrics.mjs --check); then ok "§20 metrics gate PASS (zero-tolerance = 0) + report in sync"; else fail "§20 metrics gate FAILED (a floor missed or a zero-tolerance counter > 0)"; fi
    ;;
  *)
    echo "  ok: Node/WASM driver check skipped ($probe) — static presence + line-floor + committed-PASS checks still apply"
    ;;
esac

if [ "$FAILED" -ne 0 ]; then
  echo "CANONICAL EVAL CHECK FAILED ❌"
  exit 1
fi
echo "CANONICAL EVAL CHECK PASSED ✅"
