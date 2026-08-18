#!/usr/bin/env bash
# The BanzAI properties that must be able to BLOCK A MERGE.
#
# Audited at 21bb77c against the actual branch protection for `main`, which requires seven contexts. Every
# one of them ran document guards, a whitepaper build, or the website. Not one could turn red because the
# critical benchmark regressed, because a settled fact started needing a model, because an internal-only
# source became citable, or because the vendored WASM stopped matching its Rust source. Those suites all
# existed and all passed; none of them was merge-blocking.
#
# A test that cannot block a merge is a test the next change is free to break. So this battery is one
# command, wired into the EXISTING required context (`Public technical claims — executable evidence gate`)
# rather than a new one — branch protection is unchanged, and the reachability is what changed.
#
# It is also the exact command a developer runs locally, so "what CI checks" and "what I can reproduce"
# are the same list rather than two lists that drift.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "== banzai-critical-battery =="
fail=0
step() {
  local label="$1"; shift
  printf '  %-46s ' "$label"
  local out; out="$("$@" 2>&1)"; local code=$?
  if [ $code -eq 0 ]; then
    echo "ok"
  else
    echo "FAILED (exit $code)"
    printf '%s\n' "$out" | tail -25 | sed 's/^/      /'
    fail=1
  fi
}

# `step` prints "ok" and swallows the rest, which is right for a guard whose only interesting state is
# pass/fail. It is wrong for the one property this battery exists to prove. The required job's log showed
# seven lines of "ok" — from which a reader cannot tell whether the model-call canary ran at all, how many
# cases it covered, or whether the file was even picked up. "It is executed" and "it is observable" are
# different claims, and after a milestone spent on tests that passed for reasons nobody could see, the
# second one has to be met explicitly.
step_measured() {
  local label="$1"; shift
  printf '  %-46s ' "$label"
  local out; out="$("$@" 2>&1)"; local code=$?
  if [ $code -eq 0 ]; then
    echo "ok"
    printf '%s\n' "$out" | sed 's/^/      /'
  else
    echo "FAILED (exit $code)"
    printf '%s\n' "$out" | tail -25 | sed 's/^/      /'
    fail=1
  fi
}

# ── The semantic contract: what BanzAI may state, and on whose authority ──────────────────────────
step_measured "BanzAI test suite" bash -c '
  cd services/banzai-api
  out="$(node --test 2>&1)"; code=$?
  printf "%s\n" "$out" | grep -E " (tests|pass|fail) [0-9]+$" | sed "s/^[^a-z]*//" | tr "\n" " "
  echo
  exit $code'
# The production-equivalent canary, named and counted in the log. It runs inside the suite above as well;
# a second sub-second run is cheap, and what it buys is a reader of the required job being able to see
# that the model-call property was measured rather than having to trust that a file was collected.
step_measured "critical settlement is model-free (canary)" bash -c '
  cd services/banzai-api
  out="$(node --test test/critical-settlement.test.js 2>&1)"; code=$?
  printf "%s\n" "$out" | grep -E " (tests|pass|fail) [0-9]+$" | sed "s/^[^a-z]*//" | tr "\n" " "
  echo
  exit $code'
# The multi-turn property. It is NOT folded into the critical benchmark: that benchmark is 75 single-query
# cases and its denominators mean something, so a two-turn interaction does not belong among them.
step_measured "source follow-up binds to prior structured evidence" bash -c '
  cd services/banzai-api
  out="$(node --test test/source-followup.test.js 2>&1)"; code=$?
  printf "%s\n" "$out" | grep -E " (tests|pass|fail) [0-9]+$" | sed "s/^[^a-z]*//" | tr "\n" " "
  echo
  exit $code'
# --check is NOT optional decoration. The evaluator has two modes and the DEFAULT one, `matrix`, ends its
# reporting path in an unconditional process.exit(0): it prints real measurements — 66/66, zero model
# dependency, zero false support — and then exits 0 whatever those measurements say. Every invocation of
# this benchmark, in this milestone and before it, ran that mode. The numbers were true; the gate was not a
# gate. `--check` is the mode that builds the problem list and fails on it.
step "critical benchmark (model unavailable)" bash -c 'cd services/banzai-api && node eval/critical-coverage.mjs --check'

# ── The artifacts those answers are decided by ────────────────────────────────────────────────────
# A stale index or a stale binary means production resolves questions differently from every test above,
# which is the failure mode that makes a green suite meaningless.
step "entries index is fresh" make -s banzai-entries-index-check
step "vendored WASM matches its Rust source" make -s banzai-wasm-source-bound-check
step "answer policy is declared, never inferred" make -s banzai-answer-policy-check
step "cited source paths resolve" make -s banzai-source-paths-check

# ── The engines themselves ────────────────────────────────────────────────────────────────────────
step "Rust engine tests" make -s rust-engine-check

if [ "$fail" -ne 0 ]; then
  echo "banzai-critical-battery: FAILED"
  exit 1
fi
echo "banzai-critical-battery: OK"
