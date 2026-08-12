#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §4.9) — Operador Zero no-bypass guard (§37, invariant 18).
#
# OZ receives NO shortcut, official fixture, pre-computed result or bypass in the SERVED validate path.
# There is no `if operator-zero` branch, no precomputed/hardcoded verdict, and no fixture substitution
# for keys/trust/any artifact — every OZ verdict comes from a real fetch + a real Rust engine run.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

VALIDATE=services/banzai-api/src/validate.js
FCLIENT=services/banzai-api/src/fetcherClient.js

# Bypass smells in the served path.
BYPASS='if[[:space:]]*\([^)]*operator[_-]zero|precomputed|hardcoded|hard-coded|bypass|shortcut|stub[Vv]erdict|fake[Vv]erdict|canned'

echo "== banzai-operator-zero-no-bypass-check (M2.19G.1 / ADR-068 §4.9) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'if (operator_id === "operator-zero") return PRECOMPUTED;' | grep -qE "$BYPASS" || { echo "SELF-TEST BROKEN: bypass detector did not fire" >&2; st=1; }
printf '%s\n' 'const target = resolveTarget(operatorId, implementationId);' | grep -qE "$BYPASS" && { echo "SELF-TEST BROKEN: bypass detector over-fired" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

for f in "$VALIDATE" "$FCLIENT"; do
  if [ ! -f "$f" ]; then fl "$f not found"; continue; fi
  # Ignore comment lines (the ADR's negation prose lives in comments).
  hits=$(grep -niE "$BYPASS" "$f" | grep -vE '^[0-9]+:[[:space:]]*//|^[0-9]+:[[:space:]]*\*' || true)
  if [ -z "$hits" ]; then
    ok "$f — no OZ shortcut/precomputed/bypass"
  else
    fl "$f — an OZ shortcut/precomputed/bypass appeared:"; printf '%s\n' "$hits" | sed 's/^/      /'
  fi
done

# The verdict must always come from a real engine run on fetched content (positive assertion).
if [ -f "$VALIDATE" ]; then
  grep -qE 'runEngine\(step, target, fetched' "$VALIDATE" && ok "verdicts come from runEngine on fetched content" || fl "$VALIDATE must derive verdicts from runEngine(...fetched...)"
  grep -qE 'registry_step_status_json' "$VALIDATE" && ok "step status decided in Rust (registry_step_status_json)" || fl "$VALIDATE must decide step status in Rust"
  # No fixture substitution for keys/trust: the trust input is assembled from fetched artifacts only.
  # SIGPIPE-safe: capture the function body, then substring-test without a pipe (grep -q closing a
  # pipe early under pipefail made this check flaky).
  _ati_body="$(awk '/function assembleTrustInput/{c=1} c{print} c&&/^}/{exit}' "$VALIDATE")"
  if [ -n "$_ati_body" ] && case "$_ati_body" in *"fetched."*) true;; *) false;; esac; then
    ok "trust input assembled from fetched artifacts (no fixture substitution)"
  else
    fl "$VALIDATE trust input must be assembled from fetched artifacts"
  fi
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-operator-zero-no-bypass-check: FAIL"; exit 1; fi
echo "banzai-operator-zero-no-bypass-check: ✓ no OZ shortcut/fixture/precomputed verdict in the served path (ADR-068 §4.9)"
