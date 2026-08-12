#!/usr/bin/env bash
#
# banzai-query-core-contract-check (M2.18B.7 H) — proves the SINGLE-AUTHORITY architecture holds:
# the query logic lives once, in engines/banzai-query-core, and banzai-api-kb is only the WASM shim.
#
#   A. banzai-query-core is a pure rlib — NO wasm-bindgen (that authority stays in api-kb).
#   B. banzai-api-kb depends on banzai-query-core by path; the reverse dependency does NOT exist (no cycle).
#   C. banzai-api-kb/src holds ONLY lib.rs — no business modules (no duplicated authority / mirror modules).
#   D. banzai-query-core owns the 24 query modules + the scenario library + the canonical corpus.
#   E. api-kb/src/lib.rs re-exports the core (`pub use banzai_query_core::*`) and declares NO `pub mod`
#      business module of its own.
#   F. a behavioral smoke: the compiled WASM loads and the core's exported functions execute.
#
# set -eu; exit 1 on any violation.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-52s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }

CORE="engines/banzai-query-core"
APIKB="engines/banzai-api-kb"

echo "BanzAI Query Core single-authority contract (M2.18B.7 H)"

# A. core has no wasm-bindgen: no dependency line, and no attribute/use in any .rs (doc-comment
#    mentions and embedded index-data content are not usage, so match real forms only).
if grep -qE '(^|[^A-Za-z-])wasm-bindgen[[:space:]]*=' "$CORE/Cargo.toml" \
   || grep -rlnE '^[[:space:]]*(#\[wasm_bindgen\]|use[[:space:]]+wasm_bindgen)' "$CORE/src" --include='*.rs' | grep -q .; then
  report "A core is wasm-free" "banzai-query-core must not use wasm-bindgen (that authority stays in api-kb)"
else ok "A banzai-query-core is a pure rlib (no wasm-bindgen usage)"; fi

# B. api-kb depends on core; core does NOT depend on api-kb (acyclic). Match a real dependency line
#    (crate name at column 0 followed by '='), never the Cargo.toml description prose.
grep -qE '^banzai-query-core[[:space:]]*=' "$APIKB/Cargo.toml" && ok "B api-kb depends on banzai-query-core (path)" \
  || report "B api-kb->core path dep" "missing path dependency"
if grep -qE '^banzai-api-kb[[:space:]]*=' "$CORE/Cargo.toml"; then
  report "B no dependency cycle" "banzai-query-core must NOT depend on banzai-api-kb"
else ok "B no cycle (core does not depend on api-kb)"; fi

# C. api-kb/src holds ONLY lib.rs (no business modules migrated back / duplicated).
extra=$(find "$APIKB/src" -maxdepth 1 -name '*.rs' ! -name 'lib.rs' | wc -l | tr -d ' ')
if [ "$extra" != "0" ]; then
  report "C api-kb is the shim" "api-kb/src has $extra business .rs modules (must be only lib.rs)"
else ok "C api-kb/src is only lib.rs (the WASM shim)"; fi

# D. the query modules + scenario library + canonical corpus live in core.
for m in route boundary resolve retrieval answerplan factpack synth factcheck relation catalogue docref \
         concept coverage attribute reason glossary intent fuzzy prompt queue_policy source_policy \
         terminal validate scenarios; do
  [ -f "$CORE/src/$m.rs" ] || report "D core owns $m" "missing $CORE/src/$m.rs"
done
for d in entries-index.json doc-index.json repoindex/banzai-repo-index.json; do
  [ -f "$CORE/src/$d" ] || report "D core owns the corpus" "missing $CORE/src/$d"
done
[ "$fail" -eq 0 ] && ok "D banzai-query-core owns the 24 query modules + scenarios + canonical corpus" || true

# E. api-kb re-exports core and declares no business `pub mod`.
grep -q 'pub use banzai_query_core::\*' "$APIKB/src/lib.rs" && ok "E api-kb re-exports the core (pub use banzai_query_core::*)" \
  || report "E api-kb re-export" "lib.rs must `pub use banzai_query_core::*`"
if grep -qE '^pub mod ' "$APIKB/src/lib.rs"; then
  report "E no mirror modules" "api-kb/src/lib.rs must not declare its own `pub mod` business modules"
else ok "E api-kb declares no mirror modules"; fi

# F. behavioral smoke — the compiled WASM the service loads actually executes the core.
KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
if [ -f "$KB" ]; then
  if node -e "
    const kb=require('./$KB');
    const s=JSON.parse(kb.scenarios_json()); if(!Array.isArray(s)||!s.length) process.exit(3);
    const r=JSON.parse(kb.route_question_json('o que é o BANZA?')); if(!r||!r.action) process.exit(4);
    JSON.parse(kb.boundary_evaluate_json('transfere 100 kwanzas para a conta 123'));
  " 2>/dev/null; then ok "F compiled WASM loads + core functions execute"; else report "F WASM smoke" "core WASM did not execute cleanly"; fi
else report "F WASM present" "missing $KB (run wasm-pack)"; fi

if [ "$fail" -eq 0 ]; then
  echo "banzai-query-core-contract-check: OK"
else
  echo "banzai-query-core-contract-check: NEEDS_FIX" >&2; exit 1
fi
