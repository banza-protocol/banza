#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §29) — no duplicate navigation tabs guard (§37, invariant 12).
#
# The per-analyser tabs (Manifest / Conformidade / Trust / SimB / Evidence / Traces / Receipts) were
# RETIRED as persistent sidebar entries: their outputs live inside the single Resultados area. So no step
# may ALSO appear as a persistent sidebar tab. The WbTab union + TAB_META + TABS must be limited to
# { assistente, guia, rfc, programadores, resultados }.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

AGENT=website/components/banzai/banzai-agent.ts

# Retired per-analyser sidebar tab keys that must NOT reappear as persistent tabs.
RETIRED='manifest|conformidade|conformance|trust|simb|evidence|traces|receipts'

echo "== banzai-no-duplicate-tabs-check (M2.19G.1 / ADR-068 §29) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '{ key: "trust", group: "resultados" }' | grep -qE "key:[[:space:]]*\"($RETIRED)\"" || { echo "SELF-TEST BROKEN: retired-tab detector did not fire" >&2; st=1; }
printf '%s\n' '{ key: "resultados", group: "resultados" }' | grep -qE "key:[[:space:]]*\"($RETIRED)\"" && { echo "SELF-TEST BROKEN: detector over-fired on resultados" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$AGENT" ] || { fl "$AGENT not found"; echo "banzai-no-duplicate-tabs-check: FAIL"; exit 1; }

# 1. The WbTab union has no retired analyser tab.
union=$(awk '/export type WbTab/{c=1} c{print} c&&/;/{exit}' "$AGENT")
bad=$(printf '%s\n' "$union" | grep -oE '"[a-z]+"' | grep -oE "\"($RETIRED)\"" || true)
[ -z "$bad" ] && ok "WbTab union has no retired analyser tab" || { fl "WbTab union still lists a retired tab: $(printf '%s ' $bad)"; }

# 2. TABS[] declares no retired analyser tab (no step-as-persistent-tab).
bad=$(grep -nE "key:[[:space:]]*\"($RETIRED)\"" "$AGENT" || true)
[ -z "$bad" ] && ok "TABS/TAB_META declare no retired analyser tab" || { fl "a retired analyser tab reappeared as a persistent tab:"; printf '%s\n' "$bad" | sed 's/^/      /'; }

# 3. The current tab set is exactly the five allowed keys.
keys=$(grep -oE 'key:[[:space:]]*"[a-z]+"' "$AGENT" | sed -E 's/.*"([a-z]+)"/\1/' | sort -u | tr '\n' ' ')
for k in $keys; do
  case "$k" in
    resultados|guia|rfc|programadores) : ;;
    *) fl "unexpected persistent tab key: $k" ;;
  esac
done
[ "$fail" -eq 0 ] && ok "persistent tab keys ⊆ { resultados, guia, rfc, programadores }" || true

echo
if [ "$fail" -ne 0 ]; then echo "banzai-no-duplicate-tabs-check: FAIL"; exit 1; fi
echo "banzai-no-duplicate-tabs-check: ✓ no step duplicated as a persistent tab (ADR-068 §29)"
