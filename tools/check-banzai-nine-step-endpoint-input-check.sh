#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §21) — nine-step endpoint-input spine guard (§37, invariant 10).
#
# The journey has exactly NINE steps (discovery, manifest, keys, conformance, interoperability, trust,
# federation, evidence, certification). Each technical step maps to an endpoint fetch in the served
# STEP_SPEC (validate.js); the ninth (certification) aggregates the eight technical verdicts. The UI
# STEP_ORDER / VALIDATION_STEP_IDS must carry the same nine ids.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

VALIDATE=services/banzai-api/src/validate.js
UILIB=website/lib/banzaiValidation.ts

STEPS="discovery manifest keys conformance interoperability trust federation evidence certification"

echo "== banzai-nine-step-endpoint-input-check (M2.19G.1 / ADR-068 §21) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
n=$(printf '%s\n' $STEPS | grep -c .)
[ "$n" = "9" ] || { echo "SELF-TEST BROKEN: expected 9 steps, counted $n" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. validate.js STEP_ORDER has exactly the 9 ids.
if [ -f "$VALIDATE" ]; then
  order=$(awk '/STEP_ORDER = \[/{c=1} c{print} c&&/\];/{exit}' "$VALIDATE" | grep -oE '"[a-z]+"' | sed 's/"//g' | tr '\n' ' ' | sed 's/ *$//')
  cnt=$(printf '%s\n' $order | grep -c .)
  [ "$cnt" = "9" ] && ok "validate.js STEP_ORDER has 9 steps" || fl "validate.js STEP_ORDER must have 9 steps (found $cnt)"
  for s in $STEPS; do printf '%s\n' $order | grep -qx "$s" && : || fl "validate.js STEP_ORDER missing step: $s"; done
  [ "$fail" -eq 0 ] && ok "validate.js STEP_ORDER carries the canonical nine" || true

  # 2. Each technical step maps to an endpoint fetch (STEP_SPEC endpoints non-empty; certification empty/aggregate).
  grep -qE 'const STEP_SPEC' "$VALIDATE" && ok "STEP_SPEC step→endpoint map present" || fl "$VALIDATE must define STEP_SPEC"
  for s in discovery manifest keys conformance interoperability trust federation evidence; do
    line=$(grep -nE "^[[:space:]]*$s:[[:space:]]*\{" "$VALIDATE" | head -1 || true)
    if [ -n "$line" ] && printf '%s\n' "$line" | grep -qE 'endpoints:[[:space:]]*\[[^]]+\]'; then
      ok "step '$s' maps to an endpoint fetch"
    else
      fl "step '$s' must map to a non-empty endpoints[] in STEP_SPEC"
    fi
  done
  grep -qE '^[[:space:]]*certification:[[:space:]]*\{.*engine: "banza-target-registry", endpoints: \[\]' "$VALIDATE" \
    && ok "certification step aggregates (no direct fetch)" \
    || fl "certification step must aggregate (endpoints: [])"
else
  fl "$VALIDATE not found"
fi

# 3. The UI carries the same nine ids.
if [ -f "$UILIB" ]; then
  uicnt=$(awk '/VALIDATION_STEP_IDS = \[/{c=1} c{print} c&&/\][[:space:]]*as const/{exit}' "$UILIB" | grep -oE '"[a-z]+"' | sort -u | grep -c .)
  [ "$uicnt" = "9" ] && ok "UI VALIDATION_STEP_IDS has 9 ids" || fl "UI VALIDATION_STEP_IDS must have 9 ids (found $uicnt)"
else
  fl "$UILIB not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-nine-step-endpoint-input-check: FAIL"; exit 1; fi
echo "banzai-nine-step-endpoint-input-check: ✓ exactly 9 steps, each technical step endpoint-fetched (ADR-068 §21)"
