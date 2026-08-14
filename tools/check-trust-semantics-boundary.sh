#!/usr/bin/env bash
#
# BANZA Trust-Semantics Boundary Guard (Ch06 "Confiança").
#
# Chapter 06 defines trust as a BOUNDED, VERIFIABLE technical property — never a general approval of an
# entity. The canonical trust model (ADR-025 "Open Protocol Trust Model Without CA", ADR-025, ADR-025,
# ADR-005) turns a small set of claims into verifiable properties and keeps them strictly separate from
# authority, conformance, certification and regulatory authorisation. This guard keeps §6 of the
# Reference faithful to that boundary:
#
#   1. §6 is titled "Confiança".
#   2. The Trust Root's scope is stated exactly: it signs ONLY the Key Manifest and does NOT authorise
#      operators/payments, and it is NOT a certificate authority over operators (ADR-025 / INV-ROOT-004).
#   3. The chapter carries the non-conflation boundary: a dedicated "O que a confiança não prova" movement
#      and the ADR-005 non-propagation statement ("Estas fronteiras não se propagam").
#   4. The evaluation is fail-closed.
#   5. §6 never uses framings that collapse the model — "trustless" (BANZA does not eliminate trust) or a
#      whole-entity "trusted/confiável operator/implementation" label.
#
# This is NOT written to a regex: it asserts the canonical semantic boundary. The forbidden tokens never
# appear in correct prose, and "autoridade certificadora" is deliberately NOT forbidden because §6 uses it
# only in the negation "não é uma autoridade certificadora". Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §6 (from "## 6. " up to the next "## 7. ").
section() { awk '/^## 6\. /{f=1} /^## 7\. /{f=0} f' "$1"; }

check() {
  local ref="$1" bad=0 s6
  s6="$(section "$ref")"

  # 1. canonical title
  echo "$s6" | grep -qE '^## 6\. Confiança$' \
    || { echo "  ✗ §6 title is not 'Confiança'"; bad=1; }

  # 2. Trust Root scope + boundary (root signs only the Key Manifest; not a CA over operators)
  echo "$s6" | grep -qF "assina apenas o Manifesto de Chaves" \
    || { echo "  ✗ §6 does not state the Trust Root signs only the Key Manifest"; bad=1; }
  echo "$s6" | grep -qF "não autoriza operadores" \
    || { echo "  ✗ §6 does not state the Trust Root does not authorise operators"; bad=1; }
  echo "$s6" | grep -qF "não é uma autoridade certificadora" \
    || { echo "  ✗ §6 does not state the Trust Root is not a certificate authority over operators"; bad=1; }

  # 3. non-conflation boundary: dedicated movement + ADR-005 non-propagation
  echo "$s6" | grep -qF "### O que a confiança não prova" \
    || { echo "  ✗ §6 is missing the 'O que a confiança não prova' boundary movement"; bad=1; }
  echo "$s6" | grep -qF "não se propagam" \
    || { echo "  ✗ §6 is missing the non-propagation boundary (trust ≠ certification ≠ admission ≠ authorisation)"; bad=1; }

  # 4. fail-closed
  echo "$s6" | grep -qiE 'falha fechada|falhando fechado|falha fechad' \
    || { echo "  ✗ §6 does not state the evaluation fails closed"; bad=1; }

  # 5. forbidden collapse framings (never appear in correct prose; NOT negation-dependent)
  if echo "$s6" | grep -qiE 'trustless|confiança zero'; then
    echo "  ✗ §6 uses a 'trustless'/'confiança zero' framing (BANZA does not eliminate trust)"; bad=1
  fi
  if echo "$s6" | grep -qiE 'operador[es]* confiáve|trusted operator|trusted implementation'; then
    echo "  ✗ §6 applies a whole-entity 'trusted/confiável' label to an operator/implementation"; bad=1
  fi

  return $bad
}

# ── self-test ──
selftest() {
  local d st=0 g b1 b2
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/no-scope.md"; b2="$d/trustless.md"
  cat > "$g" <<'EOF'
## 6. Confiança
A Raiz de Confiança assina apenas o Manifesto de Chaves e não autoriza operadores nem pagamentos.
A Raiz de Confiança não é uma autoridade certificadora sobre operadores.
A avaliação falha fechada em qualquer caso duvidoso.
### O que a confiança não prova
Estas fronteiras não se propagam umas para as outras.
## 7. Conformidade e Certificação
EOF
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }
  # must FAIL: root scope statement missing
  cat > "$b1" <<'EOF'
## 6. Confiança
A Raiz de Confiança assina metadata, revogações e evidência directamente.
### O que a confiança não prova
Estas fronteiras não se propagam.
## 7. Conformidade e Certificação
EOF
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing-scope accepted"; st=1; }
  # must FAIL: trustless framing
  cat > "$b2" <<'EOF'
## 6. Confiança
O BANZA é trustless: assina apenas o Manifesto de Chaves e não autoriza operadores.
A Raiz de Confiança não é uma autoridade certificadora sobre operadores.
A avaliação falha fechada.
### O que a confiança não prova
Estas fronteiras não se propagam.
## 7. Conformidade e Certificação
EOF
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL trustless accepted"; st=1; }
  return $st
}

if ! selftest; then echo "Result: ✗ trust-semantics boundary guard self-test broken"; exit 2; fi

echo "Trust-semantics boundary guard — §6 keeps confiança bounded and verifiable (ADR-025/040/058/061)"
if check "$REF"; then
  echo "Result: ✓ §6 keeps the trust boundary: root signs only the Key Manifest, not a CA over operators; trust ≠ certification ≠ admission ≠ authorisation"
else
  echo "Result: ✗ §6 weakens or conflates the trust boundary (see decisions/adr/ADR-025, ADR-005)"
  exit 1
fi
