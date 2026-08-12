#!/usr/bin/env bash
#
# BANZA License / Notice / Trademark / Open-Governance Guard (M2.7M).
#
# Keeps the repository's license, attribution, trademark and governance story coherent and open:
#  - the required files exist and the README links them;
#  - NOTICE attributes the origin to Banzami and states BANZA is an open protocol;
#  - GOVERNANCE states governance is OPEN TODAY through the public GitHub repository (not a future
#    promise);
#  - TRADEMARKS states the open-source license does not automatically grant trademark rights;
#  - no active surface presents closed/permanent private control, governance as a future promise, or the
#    license as granting trademark rights.
#
# BANZA is an open financial protocol, originally created by BANZAMI - TECNOLOGIA E SERVIÇOS, LDA. and
# governed through public repository processes. Attribution and trademark protection do not close it.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

fail=0
err() { echo "  ✗ $*"; fail=1; }

# ── presence ──
check_presence() {
  local f
  for f in LICENSE NOTICE GOVERNANCE.md TRADEMARKS.md CONTRIBUTING.md MAINTAINERS.md; do
    [ -f "$f" ] || err "missing required file: $f"
  done
  # README links the governance/legal files
  for f in LICENSE NOTICE TRADEMARKS.md GOVERNANCE.md MAINTAINERS.md CONTRIBUTING.md; do
    grep -q "$f" README.md || err "README.md does not link $f"
  done
}

# ── required wording ──
check_wording() {
  grep -qi "original creator" NOTICE || err "NOTICE must name Banzami as the original creator"
  grep -qi "Banzami" NOTICE || err "NOTICE must attribute Banzami"
  grep -qi "open financial protocol" NOTICE || err "NOTICE must state BANZA is an open (financial) protocol"
  grep -qi "governance is open today through the public GitHub repository" GOVERNANCE.md \
    || err "GOVERNANCE.md must state governance is open TODAY through the public GitHub repository"
  grep -qi "does not grant.*trademark\|does not.*grant any right to use the BANZA" TRADEMARKS.md \
    || err "TRADEMARKS.md must state the open-source license does not grant trademark rights"
  # FAQ must carry the Banzami / license / trademark questions
  local ref="website/content/BANZA_REFERENCIA.md"
  grep -qi "A Banzami controla o protocolo" "$ref" || err "reference FAQ missing the Banzami-origin question"
  grep -qi "o nome e o logótipo BANZA" "$ref" || err "reference FAQ missing the trademark question"
  grep -qi "Posso usar o código" "$ref" || err "reference FAQ missing the license question"
}

# ── forbidden phrasings (closed control / future-promise governance / license-grants-trademark) ──
# Scanned across the legal/governance surfaces + README + the two public pages. Composed as fragments.
CLOSED='governance may evolve to include open|may become open|future open governance|Banzami controls the protocol forever|permission from Banzami is required to use the protocol|Apache License grants trademark rights|Apache-2.0 grants trademark'
SURFACES=(LICENSE NOTICE GOVERNANCE.md TRADEMARKS.md MAINTAINERS.md CONTRIBUTING.md README.md website/app/governanca website/app/licenca)
check_forbidden() {
  local hits
  hits="$(grep -rniE "$CLOSED" "${SURFACES[@]}" 2>/dev/null || true)"
  [ -z "$hits" ] || { err "closed-control / future-promise / license-grants-trademark phrasing:"; echo "$hits" | sed 's/^/      /'; }
  # certified-operator / central-CA as ACTIVE copy on these surfaces. TRADEMARKS.md is excluded because it
  # enumerates these as PROHIBITED phrases (naming them to ban them).
  local cert
  cert="$(grep -rniE 'certified (banza )?operator|approved by BANZA|licensed by BANZA|BANZA CA\b|Certificate Authority' \
        LICENSE NOTICE GOVERNANCE.md MAINTAINERS.md CONTRIBUTING.md README.md website/app/governanca website/app/licenca 2>/dev/null || true)"
  [ -z "$cert" ] || { err "certified-operator / central-CA language on a legal/governance surface:"; echo "$cert" | sed 's/^/      /'; }
}

# ── self-test ──
selftest() {
  local st=0 d; d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  # forbidden phrasings must match
  printf 'governance may become open in the future\n' | grep -qiE "$CLOSED" || { echo "SELFTEST_FAIL future-promise not caught"; st=1; }
  printf 'The Apache License grants trademark rights to logos\n' | grep -qiE "$CLOSED" || { echo "SELFTEST_FAIL apache-grants-trademark not caught"; st=1; }
  printf 'Banzami controls the protocol forever\n' | grep -qiE "$CLOSED" || { echo "SELFTEST_FAIL permanent-control not caught"; st=1; }
  # allowed phrasings must NOT match
  printf 'Governance is open today through the public GitHub repository.\n' | grep -qiE "$CLOSED" && { echo "SELFTEST_FAIL open-today wrongly caught"; st=1; }
  printf 'Banzami is the original creator and initial institutional maintainer.\n' | grep -qiE "$CLOSED" && { echo "SELFTEST_FAIL original-creator wrongly caught"; st=1; }
  printf 'Trademark rights are governed separately from the Apache License 2.0.\n' | grep -qiE "$CLOSED" && { echo "SELFTEST_FAIL trademark-separate wrongly caught"; st=1; }
  # presence self-test: a synthetic tree missing NOTICE/TRADEMARKS must be detectable
  ( cd "$d" && : > LICENSE ) ; [ ! -f "$d/NOTICE" ] || { echo "SELFTEST_FAIL presence probe"; st=1; }
  return $st
}
if ! selftest; then echo "license-notice-governance: guard self-test FAILED"; exit 2; fi

printf "\n══════════════════════════════════════════════════════════════════════\n"
printf "BANZA License / Notice / Trademark / Open-Governance Guard (M2.7M)\n"
printf "══════════════════════════════════════════════════════════════════════\n"
check_presence
check_wording
check_forbidden
if [ "$fail" -eq 0 ]; then
  printf "Result: ✓ Apache-2.0 canonical; Banzami attribution; open governance today; trademarks separate\n\n"
else
  printf "\nResult: ✗ license/notice/trademark/governance issues (see above)\n\n" >&2
  exit 1
fi
