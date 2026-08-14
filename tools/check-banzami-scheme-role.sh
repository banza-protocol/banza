#!/usr/bin/env bash
#
# BANZA Banzami Scheme-Role Guard (M2.19C, ADR-006).
#
# ADR-006 designates Banzami — Tecnologia e Serviços, Lda. as the OPERATOR of the first BANZA-based
# operational scheme (Layer 3), and docs/governance/BANZAMI_OPERATIONAL_SCHEME.md is its readable
# canonical form. This guard keeps both present and keeps Banzami named ONLY in its designated
# institutional role:
#   - designated scheme operator (operadora designada) and creator / initial maintainer;
#   - BANZA ≠ Banzami (the protocol + certification are neutral, not Banzami's property);
#   - Banzami is NEVER presented as a BANZA payment operator, and is NOT added to the protocol's
#     normative payment brands (NORMATIVE_BRANDS — payment-operator brands stay blocked everywhere).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

ADR060=$(ls decisions/adr/ADR-006-*.md 2>/dev/null | head -1)
BOS="docs/governance/BANZAMI_OPERATIONAL_SCHEME.md"

fail=0
# The forbidden PAYMENT-OPERATOR framing of the designated operator, distance-bounded (PT). Negations
# ("não é apresentada como operador de pagamentos do BANZA") and the ADR-006 NORMATIVE_BRANDS statement
# ("is never presented as a BANZA payment operator") are cleared by NEG.
BZM_PAYOP_PT='banzami[^.]{0,30}operador de pagament'
BZM_ISA_PT='banzami (é|será|sera)[^.]{0,20}(psp|banco|prestador de servi|payment operator)'
BZM_PAYOP_EN='banzami[^.]{0,30}(is|as) (a |the )?(banza )?payment operator'
NEG='não|nao|nunca|never|\bnot\b|\bnem\b|neither|nor|\bsem\b|não é|does not|doesn'"'"'?t|isn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|\?'

# Public-rendered surfaces + the M2.19C canonical governance/ADR docs (which state the role and its
# negations). banzai-agent.ts lists forbidden phrases verbatim; tests too.
SURFACES=(website/content website/app website/components docs/reference README.md "$BOS" "$ADR060")
GREP_EXCL=(--exclude='banzai-agent.ts' --exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts')

need() { # file regex label
  if [ -f "$1" ] && grep -qiE "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected /$2/ in $1"; fail=1; fi
}

# ── Self-test: prove the payment-operator detector fires and is cleared by a negation ───────────────
st=0
BAD='A Banzami é o operador de pagamentos do BANZA.'
GOOD='A Banzami não é apresentada como operador de pagamentos do BANZA.'
echo "$BAD"  | grep -qiE "$BZM_PAYOP_PT" || { echo "SELF-TEST BROKEN: Banzami-as-payment-operator not detected" >&2; st=1; }
echo "$BAD"  | grep -qiE "$NEG" && { echo "SELF-TEST BROKEN: bad line wrongly carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation marker not detected on a negated boundary line" >&2; st=1; }
echo 'Banzami is the BANZA payment operator.' | grep -qiE "$BZM_PAYOP_EN" || { echo "SELF-TEST BROKEN: EN payment-operator not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "banzami-scheme-role: guard self-test FAILED"; exit 2; }

# ── [1/4] required canonical documents present ─────────────────────────────────────────────────────
echo "== [1/4] ADR-006 + BANZAMI_OPERATIONAL_SCHEME.md present =="
for f in "$ADR060" "$BOS"; do
  if [ -f "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing required document: $f"; fail=1; fi
done

# ── [2/4] Banzami named as designated scheme operator + creator/maintainer ──────────────────────────
echo "== [2/4] Banzami = designated scheme operator / creator-maintainer =="
need "$BOS"    'operador(a)? designad'                    'BOS names Banzami the designated (scheme) operator'
need "$BOS"    'banzami operational scheme'               'BOS names the Banzami Operational Scheme'
need "$BOS"    'criador'                                  'BOS names Banzami as creator'
need "$BOS"    'mantenedor'                               'BOS names Banzami as maintainer'
need "$ADR060" 'designated operator'                      'ADR-006 designated operator'
need NOTICE     'creator and initial institutional'       'NOTICE carries the creator attribution'

# ── [3/4] BANZA ≠ Banzami stated ────────────────────────────────────────────────────────────────────
echo "== [3/4] BANZA ≠ Banzami stated =="
# The record explains WHY; it is not an authority for canonical wording (ADR-010). Each property
# below is asserted against the document that owns it, and the duplicate assertion against the
# decision record was removed rather than restated in a second place.
need "$BOS"    'banza ≠ banzami'                          'BOS states BANZA ≠ Banzami'

# ── [4/4] Banzami never a BANZA payment operator; not added to normative payment brands ─────────────
echo "== [4/4] Banzami is NOT a BANZA payment operator / normative payment brand =="
need "$BOS"    'não[^.]{0,15}apresentada como operador de pagament' 'BOS: Banzami NOT presented as a BANZA payment operator'
need "$BOS"    'marcas normativas'                        'BOS: normative payment-brands boundary present'
present=(); for s in "${SURFACES[@]}"; do [ -e "$s" ] && present+=("$s"); done
viol=0
for pat in "$BZM_PAYOP_PT" "$BZM_ISA_PT" "$BZM_PAYOP_EN"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${present[@]}" 2>/dev/null | grep -viE "$NEG" || true)"
  if [ -n "$hits" ]; then
    echo "FAIL  Banzami framed as a BANZA payment operator matching /$pat/:"
    echo "$hits" | sed 's/^/    /'
    viol=1; fail=1
  fi
done
[ "$viol" -eq 0 ] && echo "PASS  Banzami is never affirmed to be a BANZA payment operator on any scanned surface"

if [ "$fail" -ne 0 ]; then
  echo
  echo "banzami-scheme-role: FAIL — see ADR-006 and docs/governance/BANZAMI_OPERATIONAL_SCHEME.md."
  exit 1
fi
echo
echo "banzami-scheme-role: ✓ Banzami = designated scheme operator / creator-maintainer only; BANZA ≠ Banzami; never a BANZA payment operator (M2.19C / ADR-006)"
