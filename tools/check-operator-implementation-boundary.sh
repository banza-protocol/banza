#!/usr/bin/env bash
#
# BANZA Operator/Implementation Boundary Guard (Ch08 "Operadores").
#
# Chapter 08's central invariant: the OPERATOR is the organizational entity; the IMPLEMENTATION is the
# technical subject that is observed, evaluated and eventually certified (ADR-034 §4.2/§4.3). A property
# demonstrated by a build — conformidade, certificação, perfil de conformidade, veredicto de confiança,
# revogação — belongs to that build, in the scope and window in which it was shown; it does NOT become a
# global status of the company that publishes it. This guard keeps §8 of the Reference faithful to that:
#
#   1. §8 is titled "Operadores".
#   2. Entity ≠ implementation is stated as the chapter's thesis, with consequences (no property climbs
#      from the implementation to the entity, nor crosses between implementations of the same operator).
#   3. Cardinality: one operator, many implementations ("um operador, muitas implementações").
#   4. Validating an operator means evaluating one of its published implementations, never the abstract
#      entity ("validar um operador significa avaliar uma das suas implementações").
#   5. Open Trust Evaluation yields a per-interaction local decision, never a status conferred on the
#      operator ("nunca um estatuto conferido ao operador").
#   6. Registry presence ≠ authorization, absence ≠ prohibition.
#   7. ADR-034 (operator/implementation model + endpoint-originated validation) is cited.
#
# Scoped to §8 ONLY: the entity-state idioms below ("operador conforme", "operador L3", …) are legitimate
# federation shorthand elsewhere in the corpus (§10, §14, FAQ) — they are forbidden here because Ch08 is
# where the operator≠implementation distinction is taught and must not be collapsed. This is NOT written
# to a regex: it asserts the canonical semantic boundary of the operator-role chapter.
# Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="docs/reference/pt/BANZA_REFERENCIA.md"

# Extract §8 (from "## 8. " up to the next "## 9. ").
section() { awk '/^## 8\. /{f=1} /^## 9\. /{f=0} f' "$1"; }

# Positive canonical anchors — the boundary is stated, not merely implied.
POSITIVE=(
  "o operador é a entidade organizacional; a implementação é o sistema técnico"
  "um operador, muitas implementações"
  "validar um operador significa avaliar uma das suas implementações"
  "as propriedades técnicas não sobem da implementação para a entidade"
  "nunca um estatuto conferido ao operador"
  "a presença nunca significa autorização, e a ausência nunca significa proibição"
  "ADR-034"
)

# Forbidden entity-state collapses (regex) — a technical property bound to the entity as a global state.
FORBIDDEN_RE=(
  "operador(es)? conforme"          # conformance → entity
  "operador (em )?L[0-4]"           # conformance profile → entity
  "operador(es)? certificad"        # certification → entity (also M2.9D, reinforced here)
  "certificado de operador"         # certification → entity
  "operador(es)? trusted"           # trust verdict → entity
  "operador de confiança"           # trust verdict → entity
  "motor de crescimento"            # promotional register
  "co-construtor"                   # promotional register
  "efeito de rede dos operadores"   # promotional register
)
# Forbidden literals (runtime current-state belongs to §5/§14, not the operator-role chapter).
FORBIDDEN_F=(
  '/operators = []'
  'production_certificates'
  '**Estado actual:**'
)

check() {
  local ref="$1" bad=0 s8 phrase
  s8="$(section "$ref")"

  # 1. canonical title
  echo "$s8" | grep -qE '^## 8\. Operadores$' \
    || { echo "  ✗ §8 title is not 'Operadores'"; bad=1; }

  # 2..7 positive anchors
  for phrase in "${POSITIVE[@]}"; do
    echo "$s8" | grep -qF "$phrase" \
      || { echo "  ✗ §8 is missing canonical anchor: \"$phrase\""; bad=1; }
  done

  # forbidden entity-state collapses (regex)
  for phrase in "${FORBIDDEN_RE[@]}"; do
    if echo "$s8" | grep -qiE "$phrase"; then
      echo "  ✗ §8 entity-state collapse (regex): \"$phrase\""; bad=1
    fi
  done
  # forbidden literals
  for phrase in "${FORBIDDEN_F[@]}"; do
    if echo "$s8" | grep -qF "$phrase"; then
      echo "  ✗ §8 runtime-current-state leak (belongs in §5/§14): \"$phrase\""; bad=1
    fi
  done

  return $bad
}

# ── self-test ──
GOOD_BODY='## 8. Operadores
Este capítulo mantém separados dois sujeitos: **o operador é a entidade organizacional; a implementação é o sistema técnico observado, avaliado e eventualmente certificado.**
A cardinalidade é deliberada: **um operador, muitas implementações** (ADR-034 §4.2). Daqui decorre que as propriedades técnicas não sobem da implementação para a entidade, nem atravessam entre implementações.
Por isso, validar um operador significa avaliar uma das suas implementações publicadas — nunca a entidade em abstracto.
A avaliação é uma decisão local — nunca um estatuto conferido ao operador avaliado.
Não é uma lista de operadores licenciados: a presença nunca significa autorização, e a ausência nunca significa proibição.
## 9. Operador Zero'

selftest() {
  local d st=0 g b1 b2
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/collapse.md"; b2="$d/missing.md"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: an entity-state collapse present
  printf '%s\n' "$GOOD_BODY" | sed 's/decisão local/decisão local; cada operador conforme federa/' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL collapse (operador conforme) accepted"; st=1; }

  # must FAIL: the distinction anchor missing
  printf '%s\n' "$GOOD_BODY" | grep -v 'entidade organizacional; a implementação é o sistema técnico' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing-distinction-anchor accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ operator/implementation boundary guard self-test broken"; exit 2; fi

echo "Operator/implementation boundary guard — §8 keeps operator (entity) distinct from implementation (evaluated technical subject) (ADR-034 §4.2/§4.3, ADR-005)"
if check "$REF"; then
  echo "Result: ✓ §8 keeps the boundary: one operator → many implementations; validation targets an implementation; no property climbs to the entity as a global state"
else
  echo "Result: ✗ §8 collapses a property of an implementation into a global state of the operator (see decisions/adr/ADR-034, ADR-005)"
  exit 1
fi
