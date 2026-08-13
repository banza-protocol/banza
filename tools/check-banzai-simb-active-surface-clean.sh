#!/usr/bin/env bash
#
# BanzAI SimB active-surface clean guard (M2.19G.5C, ADR-042).
#
# ADR-042 retires SimB (banza-simb) from every ACTIVE public/agent surface. SimB survives ONLY in the
# isolated draft-validation libs, the frozen engine crate, and history (ADRs / reports / governance). This
# guard fails on any `SimB` / `banza-simb` token in the enumerated active surfaces:
#   website/components/banzai/banzai-agent.ts, website/lib/operadorZeroStatus.ts,
#   website/components/banzai/validationJourney.tsx, website/app/** (public pages), spec/overview.md,
#   the served SVGs under website/public/diagrams/ and docs/reference/diagrams/protocol/,
#   docs/reference/BANZA_SVG_REGISTRY.md, docs/reference/pt/completa.md,
#   website/content/BANZA_REFERENCIA.md.
#
# EXPLICIT allowlist (exempt — never scanned): website/lib/banzaEvidenceBundle.ts,
# website/lib/banzaSimb.ts and its generated WASM, the engines/banza-simb crate, decisions/adr/**, and
# closed-milestone history.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN='SimB|banza-simb'
ALLOW='website/lib/banzaEvidenceBundle|website/lib/banzaSimb|engines/banza-simb|decisions/adr/|docs/reports/|docs/governance/|\.wasm$|banza_simb'

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# ── Self-test ─────────────────────────────────────────────────────────────────────────────────────
st=0
echo 'export const X = "SimB analyser";' | grep -qE "$TOKEN" || { echo "SELF-TEST BROKEN: SimB detector did not fire" >&2; st=1; }
echo 'a frozen banza-simb crate' | grep -qE "$TOKEN" || { echo "SELF-TEST BROKEN: banza-simb detector did not fire" >&2; st=1; }
echo 'website/lib/banzaSimb.ts' | grep -qE "$ALLOW" || { echo "SELF-TEST BROKEN: allowlist did not exempt banzaSimb.ts" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "banzai-simb-active-surface-clean: guard self-test FAILED"; exit 2; }

# Build the explicit active-surface file list (only files that exist).
FILES=()
add() { [ -f "$1" ] && FILES+=("$1") || true; }
add website/components/banzai/banzai-agent.ts
add website/lib/operadorZeroStatus.ts
add website/components/banzai/validationJourney.tsx
add spec/overview.md
add docs/reference/BANZA_SVG_REGISTRY.md
add docs/reference/pt/completa.md
add website/content/BANZA_REFERENCIA.md
# website/app public pages (ts/tsx)
while IFS= read -r f; do add "$f"; done < <(find website/app -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null)
# served SVGs
while IFS= read -r f; do add "$f"; done < <(find website/public/diagrams docs/reference/diagrams/protocol -type f -name '*.svg' 2>/dev/null)

echo "== SimB / banza-simb absence across ${#FILES[@]} active surfaces =="
scanned=0
for f in "${FILES[@]}"; do
  # Defensive: never scan an allowlisted path even if a glob captured it.
  printf '%s\n' "$f" | grep -qE "$ALLOW" && continue
  scanned=$((scanned + 1))
  hits="$(grep -nE "$TOKEN" "$f" 2>/dev/null || true)"
  if [ -n "$hits" ]; then fl "SimB/banza-simb in an active surface: $f"; echo "$hits" | sed 's/^/      /'; fi
done
[ "$fail" -eq 0 ] && ok "no SimB / banza-simb token in any of the $scanned active surfaces scanned"

if [ "$fail" -ne 0 ]; then
  echo
  echo "banzai-simb-active-surface-clean: FAIL — SimB re-entered an active surface (ADR-042). Move it to the isolated draft-validation libs / history, or remove it."
  exit 1
fi
echo
echo "banzai-simb-active-surface-clean: ✓ SimB retired from all active surfaces; survives only in the isolated draft libs, the frozen crate and history (ADR-042)"
