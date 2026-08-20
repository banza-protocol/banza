#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §4.8 / Consequences) — no Qwen decision guard (§37, invariant 23).
#
# Rust decides every verdict; Qwen only explains; TypeScript never decides. In the served validate path
# there is NO model call: qwen_calls and external_model_calls are 0 on every receipt, and validate.js
# imports/invokes no provider/model/generate. Qwen is invoked only by the "Explicar este resultado"
# affordance, which explains an already-computed verdict and never changes it.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

# Block E2 moved these sentences into the bilingual catalogues, so grepping the component for them
# stopped proving anything. They are read from the resolved copy instead, which also makes the English
# clause expressible — a guard grepping a Portuguese literal never could.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

VALIDATE=services/banzai-api/src/validate.js
MODE=website/components/banzai/BanzaiValidationMode.tsx

echo "== banzai-no-qwen-decision-check (M2.19G.1 / ADR-034 §4.8) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'qwen_calls: 0,' | grep -qE 'qwen_calls:[[:space:]]*0' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

if [ -f "$VALIDATE" ]; then
  # 1. Receipts pin qwen_calls / external_model_calls to 0 (both the step and the journey receipt).
  n1=$(grep -cE 'qwen_calls:[[:space:]]*0' "$VALIDATE" | tr -d ' ')
  n2=$(grep -cE 'external_model_calls:[[:space:]]*0' "$VALIDATE" | tr -d ' ')
  [ "$n1" -ge 2 ] && ok "qwen_calls: 0 in step + journey receipts ($n1)" || fl "$VALIDATE must set qwen_calls: 0 in both receipts"
  [ "$n2" -ge 2 ] && ok "external_model_calls: 0 in step + journey receipts ($n2)" || fl "$VALIDATE must set external_model_calls: 0 in both receipts"
  # A nonzero qwen_calls must never be assigned in the served path.
  bad=$(grep -nE 'qwen_calls:[[:space:]]*[1-9]|external_model_calls:[[:space:]]*[1-9]' "$VALIDATE" || true)
  [ -z "$bad" ] && ok "no nonzero qwen/external model count in the served path" || { fl "$VALIDATE assigns a nonzero model count:"; printf '%s\n' "$bad" | sed 's/^/      /'; }

  # 2. No provider/model/generate call in the served path (Rust decides).
  bad=$(grep -nE 'from "\./provider|callProvider|callModel|generate\(|runQwen|inferenc|llama' "$VALIDATE" | grep -vE '^[0-9]+:[[:space:]]*//' || true)
  [ -z "$bad" ] && ok "no provider/model/generate call in validate.js" || { fl "$VALIDATE must not call a model:"; printf '%s\n' "$bad" | sed 's/^/      /'; }

  # 3. Verdict comes from Rust.
  grep -qE 'registry_step_status_json|registry_certification_readiness_json' "$VALIDATE" \
    && ok "verdict + readiness decided in Rust" \
    || fl "$VALIDATE verdict/readiness must be decided in Rust"
else
  fl "$VALIDATE not found"
fi

# 4. The UI's "Explicar este resultado" prompt explicitly states Qwen only explains, never decides.
if [ -f "$MODE" ]; then
  copy_presented "$MODE" validation explain.closing pt "apenas explica" \
    && ok "explain affordance states Qwen only explains (never decides)" \
    || fl "$MODE explain prompt must state Qwen only explains, never decides"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-no-qwen-decision-check: FAIL"; exit 1; fi
echo "banzai-no-qwen-decision-check: ✓ Rust decides; Qwen only explains; 0 model calls in receipts (ADR-034 §4.8)"
