#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §4.10/§28/§31) — Certification Readiness vs Status language guard (§37, invariant 16).
#
# Certification Readiness (READY | BLOCKED) is DISTINCT from Certification Status (always NOT_CERTIFIED).
# The readiness aggregates verdicts; it is NEVER a Certification Record and never returns CERTIFIED. The
# UI must not conflate the two, and must never use the misleading "9/9 · Bloqueado" phrasing (which reads
# like a score/certification outcome rather than a readiness gate).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

VALIDATE=services/banzai-api/src/validate.js
MODE=website/components/banzai/BanzaiValidationMode.tsx
JOURNEY=website/components/banzai/validationJourney.tsx
RECEIPT=website/lib/operationReceipt.ts

echo "== banzai-certification-readiness-language-check (M2.19G.1 / ADR-068 §4.10) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'certification_status: "NOT_CERTIFIED"' | grep -q 'NOT_CERTIFIED' || { echo "SELF-TEST BROKEN" >&2; st=1; }
printf '%s\n' '9/9 · Bloqueado' | grep -qE '9/9' || { echo "SELF-TEST BROKEN: 9/9 detector did not fire" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. The served receipt keeps readiness distinct from status, never CERTIFIED.
if [ -f "$VALIDATE" ]; then
  grep -qE 'certification_readiness:' "$VALIDATE"                 && ok "journey receipt has certification_readiness"           || fl "$VALIDATE must set certification_readiness"
  grep -qE 'certification_status: "NOT_CERTIFIED"' "$VALIDATE"    && ok "certification_status is NOT_CERTIFIED"                  || fl "$VALIDATE must set certification_status NOT_CERTIFIED"
  grep -qE 'certified: false' "$VALIDATE"                         && ok "certified: false"                                      || fl "$VALIDATE must set certified: false"
  bad=$(grep -nE '"CERTIFIED"' "$VALIDATE" | grep -viE 'NOT_CERTIFIED|never|nunca|Registo de Certificação' || true)
  [ -z "$bad" ] && ok "readiness never returns CERTIFIED" || { fl "$VALIDATE must never return CERTIFIED:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$VALIDATE not found"
fi

# 2. The type keeps them distinct.
if [ -f "$RECEIPT" ]; then
  grep -qE 'certification_readiness: "READY" \| "BLOCKED"' "$RECEIPT" && ok "readiness typed READY|BLOCKED" || fl "$RECEIPT readiness must be typed READY|BLOCKED"
  grep -qE 'certification_status: "NOT_CERTIFIED"' "$RECEIPT"          && ok "status typed NOT_CERTIFIED"    || fl "$RECEIPT status must be typed NOT_CERTIFIED"
fi

# 3. The UI shows both as distinct labels.
if [ -f "$MODE" ]; then
  grep -qE 'Prontidão de Certificação' "$MODE" && ok "UI shows Prontidão de Certificação (readiness)" || fl "$MODE must show Prontidão de Certificação"
  grep -qE 'Estado de Certificação'    "$MODE" && ok "UI shows Estado de Certificação (status)"        || fl "$MODE must show Estado de Certificação"
fi

# 4. No "9/9 · Bloqueado" (or "N/N · Bloqueado") score-style phrasing anywhere in the validation surface.
bad=$(grep -rnE '[0-9]/[0-9][[:space:]]*·[[:space:]]*Bloquead' "$MODE" "$JOURNEY" "$VALIDATE" 2>/dev/null || true)
[ -z "$bad" ] && ok 'no "N/N · Bloqueado" score-style phrasing' || { fl 'must not phrase readiness as "N/N · Bloqueado":'; printf '%s\n' "$bad" | sed 's/^/      /'; }

echo
if [ "$fail" -ne 0 ]; then echo "banzai-certification-readiness-language-check: FAIL"; exit 1; fi
echo "banzai-certification-readiness-language-check: ✓ readiness (BLOCKED) distinct from status (NOT_CERTIFIED) (ADR-068 §4.10)"
