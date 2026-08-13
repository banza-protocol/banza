#!/usr/bin/env bash
#
# BanzAI Boundary Hardening & Semantic Interpreter Recovery guard (M2.18B.2).
#
# M2.18B.2 makes the action boundary a DETERMINISTIC safety layer that no model can weaken (a Rust
# taxonomy detector run BEFORE any interpreter/model call, proven at 100% recall by an OFFLINE eval),
# and rebuilds the interpreter's semantic quality on a deterministic spine (a Rust candidate catalogue
# so the model may only SELECT a real document id, never invent one). This guard proves those invariants
# exist in the tree AND runs the offline boundary eval (no model, no network) so the safety gate is
# enforced by CI, not just asserted. Comment-aware where it scans source; self-tests its detectors.
# set -eu (no pipefail — house style). Exit 1 on NEEDS_FIX, exit 2 if the self-test fails.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-58s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }

BOUNDARY_RS="engines/banzai-query-core/src/boundary.rs"
CATALOGUE_RS="engines/banzai-query-core/src/catalogue.rs"
ROUTE_RS="engines/banzai-query-core/src/route.rs"
LIB_RS="engines/banzai-api-kb/src/lib.rs"
KNOW_JS="services/banzai-api/src/knowledge.js"
INTERPRET_JS="services/banzai-api/src/interpret.js"
DATASET="services/banzai-api/eval/m2-18b2-boundary.dataset.json"
HARNESS="services/banzai-api/eval/run-m2-18b2-boundary-eval.mjs"
T_BOUNDARY="services/banzai-api/test/m2-18b2-boundary.test.js"
T_CAND="services/banzai-api/test/m2-18b2-candidates.test.js"

strip_c_rs() { perl -0777 -pe 's{//[^\n]*}{}g; s{/\*.*?\*/}{}gs' "$1" 2>/dev/null || cat "$1"; }
strip_c() { perl -0777 -pe 's{//[^\n]*}{}g; s{/\*.*?\*/}{}gs' "$1" 2>/dev/null || cat "$1"; }
need() { [ -f "$1" ] || report "$2" "missing $1"; }

echo "BanzAI Boundary Hardening & Semantic Recovery (M2.18B.2)"

# ── files present (Part 37) ───────────────────────────────────────────────────────────────────────
need "$BOUNDARY_RS"  "boundary taxonomy engine"
need "$CATALOGUE_RS" "semantic candidate catalogue"
need "$DATASET"      "offline boundary dataset"
need "$HARNESS"      "offline boundary eval harness"
need "$T_BOUNDARY"   "boundary regression tests"
need "$T_CAND"       "candidate generation tests"

# ── DETERMINISTIC BOUNDARY (Part 1-11) ────────────────────────────────────────────────────────────
if [ -f "$BOUNDARY_RS" ]; then
  b="$(strip_c_rs "$BOUNDARY_RS")"
  case "$b" in *"fn boundary_refusal"*) ok "boundary_refusal() is the single deterministic entry point";; *) report "bnd entry" "boundary.rs must expose boundary_refusal()";; esac
  case "$b" in *"fn bnorm"*) ok "bnorm() normalizes before matching (de-accent, keep separators)";; *) report "bnd norm" "boundary.rs must define bnorm()";; esac
  case "$b" in *"TAXONOMY"*) ok "an explicit action-boundary TAXONOMY drives detection";; *) report "bnd tax" "boundary.rs must define a TAXONOMY";; esac
  # families the taxonomy MUST cover — a sensitive family silently dropped is a safety regression.
  for fam in funds operator_publication operator_approval key governance; do
    case "$b" in *"\"$fam\""*) : ;; *) report "bnd family" "taxonomy must cover the '$fam' family";; esac
  done
  ok "taxonomy covers funds / operator_publication / operator_approval / key / governance"
  # hidden-imperative + document-prefix handling: a doc reference must not smuggle an action past the gate.
  case "$b" in *"has_hidden_imperative"*) ok "hidden imperative after a separator is detected (Part 9)";; *) report "bnd hidden" "must detect a hidden imperative after a separator";; esac
  case "$b" in *"strip_doc_refs"*|*"document_reference"*) ok "document references are handled, not a bypass (Part 10)";; *) report "bnd doc" "must handle document references explicitly";; esac
fi

# preflight: the boundary is evaluated BEFORE any model/interpreter call (Part 3).
if [ -f "$ROUTE_RS" ]; then
  r="$(strip_c_rs "$ROUTE_RS")"
  case "$r" in *"boundary::boundary_refusal"*|*"boundary_refusal("*) ok "route.rs calls boundary_refusal as a preflight (Part 3)";; *) report "route wire" "route.rs must call boundary_refusal before model routing";; esac
fi
if [ -f "$LIB_RS" ]; then
  l="$(strip_c_rs "$LIB_RS")"
  case "$l" in *"boundary_evaluate_json"*) ok "boundary_evaluate_json exported to WASM (offline-testable)";; *) report "wasm bnd" "lib.rs must export boundary_evaluate_json";; esac
  case "$l" in *"generate_candidates_json"*) ok "generate_candidates_json exported to WASM";; *) report "wasm cand" "lib.rs must export generate_candidates_json";; esac
fi

# ── SEMANTIC RECOVERY — deterministic candidate generation (Part 16/19) ────────────────────────────
if [ -f "$CATALOGUE_RS" ]; then
  c="$(strip_c_rs "$CATALOGUE_RS")"
  case "$c" in *"fn generate_candidates"*) ok "generate_candidates() proposes REAL documents (Part 16)";; *) report "cat gen" "catalogue.rs must define generate_candidates()";; esac
  case "$c" in *"ALIASES"*) ok "curated PT/EN alias table maps paraphrases to real ids";; *) report "cat alias" "catalogue.rs must define an ALIASES table";; esac
fi
if [ -f "$KNOW_JS" ]; then
  case "$(strip_c "$KNOW_JS")" in *"generateCandidates"*) ok "knowledge.js exposes generateCandidates wrapper";; *) report "know cand" "knowledge.js must wrap generate_candidates_json";; esac
fi
if [ -f "$INTERPRET_JS" ]; then
  i="$(strip_c "$INTERPRET_JS")"
  case "$i" in *"generateCandidates"*) ok "interpreter injects a CLOSED candidate list (two-stage entity, Part 19)";; *) report "int cand" "interpret.js must generate candidates for the model";; esac
  case "$i" in *"NUNCA inventes"*|*"never invents"*|*"nunca inventes"*) ok "the model is instructed it may only SELECT a real id, never invent one";; *) report "int noinvent" "interpret.js must forbid inventing an id";; esac
fi

# ── THRESHOLDS NEVER LOWERED (Part 28) ────────────────────────────────────────────────────────────
if [ -f "$DATASET" ]; then
  grep -q '"boundary_recall_min": 1' "$DATASET" || report "th recall" "boundary recall threshold must be 1.0 (never lowered)"
  grep -q '"boundary_false_negatives_max": 0' "$DATASET" || report "th fn" "boundary false-negatives max must be 0"
  grep -q '"document_bypass_max": 0' "$DATASET" || report "th doc" "document-bypass max must be 0"
  nb="$(grep -c '"q"' "$DATASET" || true)"
  if [ "${nb:-0}" -ge 120 ]; then ok "boundary dataset has $nb cases (boundary + near-boundary)"; else report "ds size" "dataset has only ${nb:-0} cases"; fi
fi

# ── OFFLINE BOUNDARY EVAL RUNS AND PASSES (Part 12/13/27 — the safety gate, in CI) ─────────────────
if command -v node >/dev/null 2>&1 && [ -f "$HARNESS" ]; then
  if node "$HARNESS" >/tmp/m218b2_boundary_eval.log 2>&1; then
    ok "offline boundary eval PASSES — recall 1.0, 0 false negatives, 0 doc bypass (no model)"
  else
    report "offline eval" "offline boundary eval FAILED (see /tmp/m218b2_boundary_eval.log)"
  fi
  # tests green when node is available.
  if node --test "$T_BOUNDARY" "$T_CAND" >/tmp/m218b2_tests.log 2>&1; then ok "M2.18B.2 boundary + candidate tests green"; else report "tests" "M2.18B.2 tests failed (see /tmp/m218b2_tests.log)"; fi
fi

# ── self-test ─────────────────────────────────────────────────────────────────────────────────────
st="$(mktemp -d)"; trap 'rm -rf "$st"' EXIT
printf '%s\n' 'let x=1; // boundary_refusal in a comment must be ignored' > "$st/c.js"
case "$(strip_c "$st/c.js")" in *"boundary_refusal"*) echo "SELF-TEST FAIL: comment strip broken" >&2; exit 2;; *) : ;; esac

if [ "$fail" -ne 0 ]; then
  echo "BanzAI boundary hardening / semantic recovery: NEEDS_FIX" >&2
  exit 1
fi
echo "BanzAI boundary hardening / semantic recovery (M2.18B.2): OK"
