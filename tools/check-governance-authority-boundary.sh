#!/usr/bin/env bash
#
# BANZA Governance Authority-Boundary Guard (Ch11 "Governança").
#
# Chapter 11's two sharpest risks: turning protocol governance into a REGULATOR/ADMINISTRATOR of the
# operators, or turning the TRUST ROOT into the government of the whole protocol. The canon (GOVERNANCE.md ·
# ADR-045 current-only ADR tree · ADR-027 Model A · ADR-004/066 the verdict/admission owners) fixes
# governance as:
#
#   - a PUBLIC PROCESS by which the protocol's RULES evolve, conducted by the ACTIVE MAINTAINERS — not a
#     constituted institution, not a company, not a regulator of operators;
#   - humans govern the RULES; the deterministic engines apply them to concrete cases — governance never
#     produces the conformance verdict (motor determinístico da Camada 2), never admits to a scheme
#     (Camada 3, independent), never issues the regulatory authorisation (autoridades competentes), and
#     never decides the commercial relationship (the operator);
#   - no silent mutation (a published version is not rewritten) and no retroactivity (a new version creates
#     a new subject, it does not rewrite prior evidence); an editorial change is not a version bump;
#   - the Trust Root signs ONLY the Key Manifest and does NOT govern the protocol (Model A); custody is by
#     threshold (number-free); BanzAI explains but does not vote/approve/promulgate;
#   - open governance = public proposal/process/artifacts/history — NOT that anyone edits the protocol
#     directly; the origin creator (the initial institutional maintainer) confers no authority over
#     operators — attribution, not private control — and a formal governance entity is a FUTURE step,
#     not a present constituted organ.
#
# POSITIVE anchors assert the boundary is stated. FORBIDDEN affirmative collapses (governance regulating/
# administering/certifying/admitting/authorising operators; anything "governing the protocol"; the root
# governing) are checked per line and skipped when a negation cue is on the line — so the correct negated
# prose passes. One HARD check forbids the retired constituted-organ name "Entidade de Governação".
# Section-scoped to §11 only. Not written to a regex — it asserts the canonical boundary. Exit 1 on
# violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §11 (from "## 11. " up to the next "## 12. ").
section() { awk '/^## 11\. /{f=1} /^## 12\. /{f=0} f' "$1"; }

# Positive canonical anchors — the boundary is stated, not merely implied.
POSITIVE=(
  "processo público pelo qual as regras do protocolo evoluem"  # governance = public process over rules
  "maintainers activos"                                        # the actors (not a company/institution)
  "não decide quem implementa o protocolo"                     # not a regulator of who implements
  "não administra os operadores"                               # maintains the protocol, not the operators
  "os humanos governam as regras"                              # humans govern rules; engines apply to cases
  "motor determinístico da Camada 2"                           # the verdict is not a governance decision
  "Camada 3, que permanece institucionalmente independente"   # admission is the scheme's (Camada 3)
  "autorização regulatória"                                    # authorisation is the competent authorities'
  "não é alterada silenciosamente"                             # no silent mutation
  "não reescreve a evidência"                                  # no retroactivity
  "novo sujeito de avaliação"                                  # a new version creates a new subject
  "não constituem uma nova versão do protocolo"               # editorial change ≠ version bump
  "Raiz de Confiança assina apenas o Manifesto de Chaves"      # Model A signing scope
  "não governa o protocolo"                                    # the root is an anchor, not government
  "repartida por limiar"                                       # threshold custody (number-free)
  "não vota, não aprova, não promulga"                         # BanzAI is not in the governance authority
  "banza-normative-hierarchy-n1-n5-v1.svg"
  "banza-governance-authority-boundaries-v1.svg"
  "banza-governance-v1.svg"
)

# Affirmative collapses — checked per line, skipped when the line carries a negation cue.
FORBIDDEN_RE=(
  "regula (os |as )?operadores"       # governance as a regulator of operators
  "administra (os |as )?operadores"   # governance as an administrator of operators
  "certifica (os |as )?operadores"    # governance issuing operator certification
  "admite (os |as )?operadores"       # governance admitting operators
  "autoriza (os |as )?operadores"     # governance authorising operators
  "governa o protocolo"               # anything (incl. the root) "governing the protocol" as a ruler
  "raiz de confiança governa"         # the Trust Root as the government
  "governança certifica"              # governance producing the conformance verdict/certificate
)
NEG='não|nao|nunca|nem|sem|nenhum|nenhuma|«|»|≠|deixa de|não é'

# HARD (not negation-aware): the retired constituted-organ name must not reappear as a present body.
# The chapter frames a formal governance entity as a FUTURE step ("entidade de governança formal … é um
# passo futuro"); the old capitalised present-organ name "Entidade de Governação" is always wrong in §11.
RETIRED_ORGAN="Entidade de Governação"

check() {
  local ref="$1" bad=0 s11 phrase line
  s11="$(section "$ref")"

  echo "$s11" | grep -qE '^## 11\. Governança$' \
    || { echo "  ✗ §11 title is not 'Governança'"; bad=1; }

  for phrase in "${POSITIVE[@]}"; do
    echo "$s11" | grep -qF "$phrase" \
      || { echo "  ✗ §11 is missing canonical anchor: \"$phrase\""; bad=1; }
  done

  # HARD: the retired constituted-organ name must not present a governing institution as existing.
  if echo "$s11" | grep -qF "$RETIRED_ORGAN"; then
    echo "  ✗ §11 names the retired constituted organ \"$RETIRED_ORGAN\" — governance is a public process of the maintainers; a formal entity is a FUTURE step"
    bad=1
  fi

  # affirmative collapses (negation-aware, per line)
  while IFS= read -r line || [ -n "$line" ]; do
    for phrase in "${FORBIDDEN_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "$line" | grep -qiE "$NEG" && continue
        echo "  ✗ §11 affirmative collapse (governance as regulator/administrator of operators, or the root governing): \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
  done <<< "$s11"

  return $bad
}

# ── self-test ──
GOOD_BODY='## 11. Governança
A governança do BANZA é o processo público pelo qual as regras do protocolo evoluem, conduzido pelos maintainers activos. A governança não decide quem implementa o protocolo; mantém e evolui o protocolo — não administra os operadores que o usam.
Uma distinção governa o capítulo: os humanos governam as regras; os motores determinísticos aplicam-nas a casos concretos.
O veredicto é produzido pelo motor determinístico da Camada 2. A admissão é decisão do esquema, na Camada 3, que permanece institucionalmente independente. Não substitui a autorização regulatória.
Uma versão publicada não é alterada silenciosamente. Uma nova versão não reescreve a evidência; cria um novo sujeito de avaliação. Correcções editoriais não constituem uma nova versão do protocolo.
A Raiz de Confiança assina apenas o Manifesto de Chaves; não governa o protocolo. A custódia é repartida por limiar.
O BanzAI não vota, não aprova, não promulga.
![fig](/diagrams/protocol/banza-normative-hierarchy-n1-n5-v1.svg)
![fig](/diagrams/protocol/banza-governance-authority-boundaries-v1.svg)
![fig](/diagrams/protocol/banza-governance-v1.svg)
## 12. BanzAI'

selftest() {
  local d st=0 g b1 b2 b3 b4
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/collapse.md"; b2="$d/missing.md"; b3="$d/organ.md"; b4="$d/rootgov.md"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: an affirmative collapse (governance regulating operators, non-negated)
  printf '%s\n' "$GOOD_BODY" | sed 's/^Uma distinção governa o capítulo.*/A governança regula os operadores e admite os operadores./' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL collapse (regula/admite operadores) accepted"; st=1; }

  # must FAIL: a canonical anchor missing (no-retroactivity)
  printf '%s\n' "$GOOD_BODY" | grep -v 'não reescreve a evidência' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing no-retroactivity anchor accepted"; st=1; }

  # must FAIL: the retired constituted-organ name reappears as a present body
  printf '%s\n' "$GOOD_BODY" | sed 's/^A governança do BANZA é o processo público/A Entidade de Governação BANZA decide as regras: o processo público/' > "$b3"
  check "$b3" >/dev/null 2>&1 && { echo "SELFTEST_FAIL retired-organ name accepted"; st=1; }

  # must FAIL: the root (or anyone) "governing the protocol" affirmatively
  printf '%s\n' "$GOOD_BODY" | sed 's/^A Raiz de Confiança assina apenas o Manifesto de Chaves; não governa o protocolo./A Raiz de Confiança governa o protocolo./' > "$b4"
  check "$b4" >/dev/null 2>&1 && { echo "SELFTEST_FAIL 'governa o protocolo' affirmative accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ Governance authority-boundary guard self-test broken"; exit 2; fi

echo "Governance authority-boundary guard — §11 keeps governance a public process of the maintainers over the RULES (GOVERNANCE.md · ADR-045/061/066/079), never a regulator/administrator of operators and never the Trust Root governing the protocol"
if check "$REF"; then
  echo "Result: ✓ §11 keeps governance a public process over the rules: maintainers decide, the verdict/admission/authorisation/relationship each have another owner, no silent mutation, no retroactivity, and the Trust Root is an anchor — not the government"
else
  echo "Result: ✗ §11 lets governance drift into a regulator/administrator of operators, or the Trust Root into the government (see GOVERNANCE.md, decisions/adr/ADR-045, ADR-004, ADR-035, ADR-027)"
  exit 1
fi
