#!/usr/bin/env bash
#
# BANZA Operador Zero Reference-Boundary Guard (Ch09 "Operador Zero").
#
# Chapter 09's risk: a reference IMPLEMENTATION drifting into looking like a privileged operator, a
# "first"/"official" operator, an authority, or a disguised normative specification. The canon (ADR-035
# read-only canonical reference implementation · ADR-035/053 demo policy · ADR-034 endpoint-originated
# validation · ADR-006/061 separation) fixes it as a non-normative, non-production, no-real-funds,
# NOT_CERTIFIED reference implementation. This guard keeps §9 of the Reference faithful to that:
#
#   1. §9 is titled "Operador Zero".
#   2. It is a reference implementation, and the norm lives in the contracts/specs, not the implementation
#      ("a norma continua nos contratos"; "não define o protocolo").
#   3. It is substitutable and the protocol works without it ("É substituível"; "O protocolo funciona sem ele").
#   4. "Zero" (the name) is distinct from L0 (a conformance profile).
#   5. It moves no real funds; its certification state is NOT_CERTIFIED = absence of a formal certification,
#      not a conformance failure.
#   6. Registry presence confers nothing (no authorization/admission/certification).
#
# The FORBIDDEN list below are AFFIRMATIVE collapses (first/official operator, golden implementation, OZ is
# production/normative, OZ moves real funds/defines the protocol). They are checked per-line and skipped when
# a negation cue is on the line — so the correct negated prose ("não é um operador de produção", "não define
# o protocolo", "não movimenta dinheiro real", "Nada … é normativo") passes. Section-scoped to §9 only,
# because "operador de produção" etc. are legitimate elsewhere. Not written to a regex — it asserts the
# canonical boundary. Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §9 (from "## 9. " up to the next "## 10. ").
section() { awk '/^## 9\. /{f=1} /^## 10\. /{f=0} f' "$1"; }

# Positive canonical anchors — the boundary is stated, not merely implied.
POSITIVE=(
  "implementação de referência"
  "As regras normativas do BANZA vivem nos contratos"
  "protocolo funciona sem ele"
  "É substituível"
  "L0 é um perfil de conformidade"
  "não movimenta dinheiro real"
  "ausência de uma certificação formal"
  "não significa autorização, admissão nem certificação"
)

# Affirmative collapses — checked per line, skipped when the line carries a negation cue.
FORBIDDEN_RE=(
  "primeiro operador"                 # first operator
  "operador oficial"                  # official operator
  "golden implementation"             # normative-by-execution
  "implementação golden"
  "operador de produção"             # OZ as production (negated form is fine)
  "define o protocolo"               # OZ as normative (negated form is fine)
  "é normativ"                        # OZ is normative
  "movimenta dinheiro real"          # OZ moves real funds (negated form is fine)
  "implementação obrigatória"        # mandatory to copy
)
NEG='não|nao|nunca|nem|sem|nada|nenhum|nenhuma|«|»|exemplo'

check() {
  local ref="$1" bad=0 s9 phrase line
  s9="$(section "$ref")"

  echo "$s9" | grep -qE '^## 9\. Operador Zero$' \
    || { echo "  ✗ §9 title is not 'Operador Zero'"; bad=1; }

  for phrase in "${POSITIVE[@]}"; do
    echo "$s9" | grep -qF "$phrase" \
      || { echo "  ✗ §9 is missing canonical anchor: \"$phrase\""; bad=1; }
  done

  # affirmative collapses (negation-aware, per line)
  while IFS= read -r line || [ -n "$line" ]; do
    for phrase in "${FORBIDDEN_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "$line" | grep -qiE "$NEG" && continue
        echo "  ✗ §9 affirmative collapse (Operador Zero as privileged/normative/production): \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
  done <<< "$s9"

  return $bad
}

# ── self-test ──
GOOD_BODY='## 9. Operador Zero
O Operador Zero é a implementação de referência, só de leitura. Não é um operador de produção e não movimenta dinheiro real.
As regras normativas do BANZA vivem nos contratos e nas especificações públicas — não define o protocolo.
É substituível. O protocolo funciona sem ele. Nada do que faz é normativo por o fazer.
«Zero» é o nome; L0 é um perfil de conformidade. O seu estado é a ausência de uma certificação formal, não uma reprovação.
A presença no Registo não significa autorização, admissão nem certificação.
## 10. Federação'

selftest() {
  local d st=0 g b1 b2
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/collapse.md"; b2="$d/missing.md"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: an affirmative collapse (non-negated)
  printf '%s\n' "$GOOD_BODY" | sed 's/^É substituível.*/O Operador Zero é o primeiro operador oficial do BANZA./' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL collapse (primeiro operador) accepted"; st=1; }

  # must FAIL: normativity anchor missing
  printf '%s\n' "$GOOD_BODY" | grep -v 'As regras normativas do BANZA vivem nos contratos' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing-normativity-anchor accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ Operador Zero reference-boundary guard self-test broken"; exit 2; fi

echo "Operador Zero reference-boundary guard — §9 keeps a reference implementation from drifting into a privileged/normative/production operator (ADR-035/052/053/068)"
if check "$REF"; then
  echo "Result: ✓ §9 keeps Operador Zero as a reference implementation: non-normative, non-production, no real funds, NOT_CERTIFIED, substitutable; the norm lives in the contracts"
else
  echo "Result: ✗ §9 lets Operador Zero drift into a privileged/normative/production operator (see decisions/adr/ADR-035, ADR-035)"
  exit 1
fi
