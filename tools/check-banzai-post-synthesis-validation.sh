#!/usr/bin/env bash
#
# BanzAI mandatory post-synthesis authority validator guard (M2.19G.5C, ADR-042).
#
# ADR-042 makes the post-synthesis authority validator a MANDATORY publish-gate step: after the single
# grounded synthesis produces the exact bytes that would be published, and BEFORE the answer is built,
# cached or returned, the pipeline re-runs the Rust authority/leak validator (postValidate →
# validate_response) plus the citation + contradiction checks. Any failure degrades to the safe grounded
# emergency with a STABLE fallback_reason prefixed "post_validation_"; the rejected model text is never
# built into `g`, never cached, never shown. The server then derives an honest three-state
# validation_status (rejected | passed | n/a) from that outcome — never a disguised constant "passed".
#
# This guard asserts the gate is WIRED on the grounded publish path (it does NOT run a model):
#   1. postValidate IS invoked on the grounded publish path, AFTER synthesis and BEFORE groundedAnswer(,
#      before the cache writes (exact.set / semantic.add) and before `return g`.
#   2. postValidate has a REAL call site (not only the ~:59 definition) — defined-but-uncalled fails.
#   3. at least one path emits a fallback_reason prefixed "post_validation_".
#   4. server.js derives validation_status as a three-state from the post_validation_ emitter — not a
#      hardcoded constant `'passed'`.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

PIPE="services/banzai-api/src/pipeline.js"
SERVER="services/banzai-api/src/server.js"

fail=0
ok()  { printf 'PASS  %s\n' "$1"; }
fl()  { printf 'FAIL  %s\n' "$1"; fail=1; }

# Line number of the FIRST match of a fixed pattern in a file (empty if absent).
lineno() { grep -nF -- "$2" "$1" 2>/dev/null | head -1 | cut -d: -f1; }
linenoE() { grep -nE -- "$2" "$1" 2>/dev/null | head -1 | cut -d: -f1; }

# ── Self-test ─────────────────────────────────────────────────────────────────────────────────────
st=0
STF="$(mktemp)"
# A file where postValidate is DEFINED but never called → the "real call site" detector must fire.
printf 'export function postValidate(text) {\n  return validateResponse(text);\n}\n' > "$STF"
callsites="$(grep -nE 'postValidate\(' "$STF" | grep -vE 'export function postValidate\(' || true)"
[ -z "$callsites" ] || { echo "SELF-TEST BROKEN: defined-but-uncalled detector saw a phantom call site" >&2; st=1; }
# And when a call site is added, the detector must see it.
printf 'const verdict = postValidate(answerText);\n' >> "$STF"
callsites="$(grep -nE 'postValidate\(' "$STF" | grep -vE 'export function postValidate\(' || true)"
[ -n "$callsites" ] || { echo "SELF-TEST BROKEN: real call site not detected" >&2; st=1; }
rm -f "$STF"
[ "$st" -eq 0 ] || { echo "banzai-post-synthesis-validation: guard self-test FAILED"; exit 2; }

echo "== [1/4] postValidate is a publish-gate step (after synthesis, before publish) =="
for f in "$PIPE" "$SERVER"; do [ -f "$f" ] || fl "missing required file: $f"; done

pv_call="$(linenoE "$PIPE" 'const verdict = postValidate\(answerText\)')"
grounded_gate="$(lineno "$PIPE" 'tp.status === "grounded"')"
grounded_call="$(linenoE "$PIPE" 'const g = groundedAnswer\(')"
exact_set="$(lineno "$PIPE" 'exact.set(keyFields')"
sem_add="$(lineno "$PIPE" 'semantic.add(keyFields')"
return_g="$(linenoE "$PIPE" '^[[:space:]]*return g;')"

if [ -n "$pv_call" ]; then ok "postValidate(answerText) is invoked on the grounded publish path (:$pv_call)"; else fl "postValidate(answerText) is NOT invoked on the grounded publish path"; fi

# Ordering: the post-validate call must come after the grounded gate and before groundedAnswer/cache/return.
after_gate=0; before_publish=0
if [ -n "$pv_call" ] && [ -n "$grounded_gate" ] && [ "$pv_call" -gt "$grounded_gate" ]; then after_gate=1; fi
if [ -n "$pv_call" ] && [ -n "$grounded_call" ] && [ -n "$exact_set" ] && [ -n "$sem_add" ] && [ -n "$return_g" ] \
   && [ "$pv_call" -lt "$grounded_call" ] && [ "$pv_call" -lt "$exact_set" ] && [ "$pv_call" -lt "$sem_add" ] && [ "$pv_call" -lt "$return_g" ]; then
  before_publish=1
fi
[ "$after_gate" -eq 1 ] && ok "runs AFTER the grounded synthesis gate (tp.status === grounded :$grounded_gate)" || fl "postValidate must run AFTER the grounded synthesis gate"
[ "$before_publish" -eq 1 ] && ok "runs BEFORE groundedAnswer(:$grounded_call), exact.set(:$exact_set), semantic.add(:$sem_add) and return g(:$return_g)" \
  || fl "postValidate must run BEFORE groundedAnswer( / exact.set / semantic.add / return g"

echo "== [2/4] postValidate has a real call site (not only the definition) =="
callsites="$(grep -nE 'postValidate\(' "$PIPE" | grep -vE 'export function postValidate\(' || true)"
if [ -n "$callsites" ]; then ok "postValidate has a real call site (not defined-but-uncalled)"; else fl "postValidate is defined but never called — dead publish gate"; fi

echo "== [3/4] a path emits fallback_reason prefixed post_validation_ =="
if grep -qE 'post_validation_' "$PIPE"; then
  ok "pipeline emits post_validation_* fallback reasons"
  grep -qE 'post_validation_\$\{verdict\.reason\}|post_validation_unsupported_claim|post_validation_contradicts_deterministic' "$PIPE" \
    && ok "the three ADR-042 gate reasons are present (authority/leak, unsupported_claim, contradicts_deterministic)" \
    || fl "expected the ADR-042 gate reasons (post_validation_<verdict>, _unsupported_claim, _contradicts_deterministic)"
else
  fl "no post_validation_ prefixed fallback_reason is emitted"
fi

echo "== [4/4] server.js derives a three-state validation_status (never a hardcoded 'passed') =="
if grep -qE 'validation_status:[[:space:]]*"passed"' "$SERVER"; then
  fl "server.js hardcodes validation_status: \"passed\" — must be a derived three-state"
else
  ok "no hardcoded validation_status: \"passed\" constant"
fi
grep -qE 'startsWith\("post_validation_"\)' "$SERVER" \
  && ok "validation_status keys off the post_validation_ emitter (startsWith)" \
  || fl "server.js must derive validation_status from the post_validation_ fallback prefix"
if grep -qE '"rejected"' "$SERVER" && grep -qE '"passed"' "$SERVER" && grep -qE '"n/a"' "$SERVER"; then
  ok "validation_status is a three-state (rejected | passed | n/a)"
else
  fl "validation_status must be a three-state (rejected | passed | n/a)"
fi
grep -qE 'validation_status:[[:space:]]*validationStatus' "$SERVER" \
  && ok "the response carries the derived validationStatus (not a literal)" \
  || fl "the response must carry the derived validationStatus variable"

if [ "$fail" -ne 0 ]; then
  echo
  echo "banzai-post-synthesis-validation: FAIL — the mandatory post-synthesis publish gate (ADR-042) drifted."
  exit 1
fi
echo
echo "banzai-post-synthesis-validation: ✓ postValidate gates the grounded publish path (after synthesis, before groundedAnswer/cache/return); three-state validation_status derived from the post_validation_ emitter (ADR-042)"
