#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §29) — no orphan tabs guard (§37, invariant 13).
#
# Every renderable panel must correspond to a tab that is present in the sidebar navigation. The shell's
# renderPanel() switch may only render panels for tabs listed in TABS (guia · rfc · programadores ·
# resultados) — no orphan trust/simb/manifest panel that has no sidebar entry.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

SHELL_TSX=website/components/banzai/BanzaiAgent.tsx
AGENT=website/components/banzai/banzai-agent.ts

echo "== banzai-no-orphan-tabs-check (M2.19G.1 / ADR-034 §29) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'case "trust": return <TrustPanel/>;' | grep -qE 'case "[a-z]+"' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$SHELL_TSX" ] || { fl "$SHELL_TSX not found"; echo "banzai-no-orphan-tabs-check: FAIL"; exit 1; }
[ -f "$AGENT" ]     || { fl "$AGENT not found"; echo "banzai-no-orphan-tabs-check: FAIL"; exit 1; }

# The set of sidebar tab keys (the only renderable, non-orphan panels) + the ask workspace.
SIDEBAR="$(grep -oE 'key:[[:space:]]*"[a-z]+"' "$AGENT" | sed -E 's/.*"([a-z]+)"/\1/' | sort -u) assistente"

# Isolate the renderPanel() switch body and extract its case labels.
panel=$(awk '/renderPanel = \(\)/{c=1} c{print} c&&/^  };/{exit}' "$SHELL_TSX")
cases=$(printf '%s\n' "$panel" | grep -oE 'case "[a-z]+"' | sed -E 's/case "([a-z]+)"/\1/' | sort -u)

if [ -z "$cases" ]; then
  fl "could not extract renderPanel cases — shell layout changed"
else
  for c in $cases; do
    if printf '%s\n' $SIDEBAR | grep -qx "$c"; then
      ok "panel '$c' has a sidebar entry"
    else
      fl "orphan panel '$c' has no sidebar tab"
    fi
  done
fi

# No renderable panel for a retired analyser (trust/simb/manifest/conformidade/evidence/traces/receipts).
orphan=$(printf '%s\n' "$panel" | grep -oE 'case "(trust|simb|manifest|conformidade|conformance|evidence|traces|receipts)"' || true)
[ -z "$orphan" ] && ok "no retired-analyser orphan panel" || { fl "orphan analyser panel found:"; printf '%s\n' "$orphan" | sed 's/^/      /'; }

echo
if [ "$fail" -ne 0 ]; then echo "banzai-no-orphan-tabs-check: FAIL"; exit 1; fi
echo "banzai-no-orphan-tabs-check: ✓ every renderable panel is in the sidebar; no orphans (ADR-034 §29)"
