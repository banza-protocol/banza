#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §29) — single "Resultados" area guard (§37, invariant 11).
#
# There is exactly ONE "Resultados" sidebar entry, whose sub-views (Resumo · Receipts · Relatórios ·
# Artefactos · Traces · Evidence Bundle) are IN-AREA tabs, not separate persistent sidebar entries.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

AGENT=website/components/banzai/banzai-agent.ts
MODE=website/components/banzai/BanzaiValidationMode.tsx

echo "== banzai-single-results-area-check (M2.19G.1 / ADR-034 §29) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'group: "resultados"' | grep -q 'resultados' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. Exactly one sidebar entry in the "resultados" group.
if [ -f "$AGENT" ]; then
  n=$(grep -oE 'group:[[:space:]]*"resultados"' "$AGENT" | wc -l | tr -d ' ')
  [ "$n" = "1" ] && ok "exactly one Resultados sidebar entry (group=resultados)" || fl "there must be exactly one Resultados sidebar entry (found $n)"
  grep -qE 'key:[[:space:]]*"resultados"' "$AGENT" && ok "the Resultados tab key exists" || fl "$AGENT must define a resultados tab"
else
  fl "$AGENT not found"
fi

# 2. The sub-views live IN the results area (RESULTS_VIEWS), not as sidebar entries.
if [ -f "$MODE" ]; then
  grep -qE 'RESULTS_VIEWS' "$MODE" && ok "RESULTS_VIEWS (in-area sub-views) present" || fl "$MODE must define RESULTS_VIEWS"
  for v in resumo receipts relatorios artefactos traces evidence; do
    grep -qE "id:[[:space:]]*\"$v\"" "$MODE" && ok "sub-view present: $v" || fl "RESULTS_VIEWS must include sub-view: $v"
  done
  grep -qiE 'in-area (tabs|sub-views)|NOT sidebar entries|NOT separate sidebar' "$MODE" \
    && ok "sub-views documented as in-area (not sidebar entries)" \
    || fl "$MODE must document the sub-views as in-area, not sidebar entries"
else
  fl "$MODE not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-single-results-area-check: FAIL"; exit 1; fi
echo "banzai-single-results-area-check: ✓ one Resultados area with in-area sub-views (ADR-034 §29)"
