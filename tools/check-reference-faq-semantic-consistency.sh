#!/usr/bin/env bash
#
# BANZA Reference FAQ semantic-consistency guard (Ch15 "Perguntas Frequentes").
#
# The FAQ is the final coherence test of the whole Reference: it compresses complex concepts into short
# answers, and that is exactly where shorthand the earlier chapters removed can creep back — "operador
# certificado" in the abstract, "rede BANZA" / "membro BANZA", federation-as-membership, "operador L3" as a
# status, Trust Root as an institution, Operator Zero as the first operator, BanzAI as a decider, readiness
# as certification, or a roadmap as a promise. This guard keeps §15 a FAITHFUL COMPRESSION LAYER: it asserts
# the canonical boundaries are stated, and forbids the roadmap/current-state/dangerous-shorthand tokens.
#
# Two rule classes:
#   • HARD-forbidden — roadmap/current-state/cadence tokens + the M2.9D bigram + retired-SimB + membership
#     shorthand + profile-as-status. Never valid in §15, in a question OR an answer.
#   • NEG-aware — wrong-premise terms (primeiro operador, L5, Camada 4, autoridade certificadora, federado)
#     are allowed only when NEGATED, and never checked inside a bold QUESTION line: the whole point of the
#     FAQ is that a question may carry the reader's wrong premise, which the answer's first sentence corrects.
#
# Section-scoped to §15. Exit 1 on violation; exit 2 on broken self-test. Written to assert the canonical
# boundary, not to a regex: a short answer must never be semantically less correct than the chapter it sums.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="docs/reference/pt/BANZA_REFERENCIA.md"

# Extract §15 (from "## 15. " up to the terminal "## Referências").
section() { awk '/^## 15\. /{f=1} /^## Referências/{f=0} f' "$1"; }

# A bold FAQ question line, e.g. "**O que é o Operador Zero? É o primeiro operador?**".
is_question() { printf '%s' "$1" | grep -qE '^\*\*.*\?\*\*[[:space:]]*$'; }

# Positive canonical anchors — the compression must state the boundaries, not merely imply them.
POSITIVE=(
  "não é uma segunda especificação nem uma fonte normativa"     # function: not a spec/source
  "não os substituem"                                           # authority: summarise, not substitute
  "Federação é a avaliação técnica, local e por interacção"     # §10 reconciled definition
  "não obriga a encaminhar"                                     # ROUTING_ALLOWED ≠ order (echoes §10)
  "assina apenas o Manifesto de Chaves"                         # Trust Root ≠ governance (§6/§11)
  "O BanzAI orienta"                                            # BanzAI ≠ authority (§12)
  "nenhuma decorre automaticamente da outra"                    # non-propagation (§7/ADR-005)
  "não é o primeiro operador"                                   # Operador Zero premise corrected (§9)
  "adoptada, versionada e publicada"                            # evolution ≠ availability (§14)
  "a FAQ não duplica esses valores"                             # current state → §5, not duplicated
)

# HARD-forbidden (question OR answer): pure roadmap / current-state / cadence / retired tokens, the M2.9D
# unconditional bigram, membership shorthand, and profile-as-status.
FORBIDDEN_HARD_RE=(
  "\bM[1-6]\b"                                   # milestone codes
  "\bQ[1-4]\b"                                   # quarters
  "\b20[2-9][0-9]\b"                             # roadmap years
  "pré-produção|pre-production|PRE_PRODUCTION"   # current state → §5
  "condições de produção"                        # roadmap gating → §5/§14
  "/operators *= *\[\]|production_certificates"  # volatile state flags → §5
  "\bem breve\b|\broadmap\b|\bmilestones?\b"     # roadmap language (PT "roteiro" as a plain word is allowed)
  "primeira certificação|primeira implementação certificada"
  "seis em seis horas|de 6 em 6 horas"           # operational cadence number
  "✅|⏳|🚧|❌"                                   # status/progress markers
  "operador certificado|operadores certificados|certificado de operador"   # M2.9D unconditional bigram
  "resultados de simulação"                      # retired SimB
  "rede BANZA|membro BANZA|participante BANZA"    # network-membership shorthand
  "operador L[0-4]|operadores L[0-4]"            # profile-as-status
  "apto a federar"                               # federation-as-capability shorthand
)

# NEG-aware forbidden (answers only): wrong-premise terms allowed ONLY when negated on the same line.
FORBIDDEN_NEG_RE=(
  "primeiro operador"
  "\bL5\b"
  "Camada 4"
  "autoridade certificadora"
  "\bfederado\b|estado federado|operador federado"
)
NEG='não|nao|nunca|nem|sem|nenhum|nenhuma|ninguém|ninguem|deixam de|deixa de'

check() {
  local ref="$1" bad=0 s15 phrase line
  s15="$(section "$ref")"

  echo "$s15" | grep -qE '^## 15\. Perguntas Frequentes$' \
    || { echo "  ✗ §15 title is not 'Perguntas Frequentes'"; bad=1; }

  for phrase in "${POSITIVE[@]}"; do
    echo "$s15" | grep -qF "$phrase" \
      || { echo "  ✗ §15 is missing a canonical boundary anchor: \"$phrase\""; bad=1; }
  done

  while IFS= read -r line || [ -n "$line" ]; do
    # HARD-forbidden — everywhere (questions included: a roadmap question is still a roadmap).
    for phrase in "${FORBIDDEN_HARD_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "  ✗ §15 contains a roadmap/current-state/shorthand token (compression must not re-introduce it): \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
    # NEG-aware — answers only; a bold question may carry the wrong premise by design.
    if ! is_question "$line"; then
      for phrase in "${FORBIDDEN_NEG_RE[@]}"; do
        if echo "$line" | grep -qiE "$phrase"; then
          echo "$line" | grep -qiE "$NEG" && continue
          echo "  ✗ §15 answer states a wrong-premise term without correcting it: \"$phrase\""
          echo "      line: $line"
          bad=1
        fi
      done
    fi
  done <<< "$s15"

  return $bad
}

# ── self-test ──
GOOD_BODY='## 15. Perguntas Frequentes
A FAQ existe para orientar e comprimir a Referência; não é uma segunda especificação nem uma fonte normativa. As respostas resumem a Referência; não os substituem.
**O que é a federação no BANZA?**
Federação é a avaliação técnica, local e por interacção das condições para dois operadores interoperarem; não é uma rede nem um estatuto.
**`ROUTING_ALLOWED` obriga a encaminhar?**
Um `ROUTING_ALLOWED` significa apenas que as condições foram satisfeitas naquela interacção; não obriga a encaminhar.
**O perfil L3 significa que um operador está federado?**
Não. O perfil L3 não cria, por si só, um estado federado nem uma admissão.
**Para que serve a Raiz de Confiança?**
A Raiz de Confiança assina apenas o Manifesto de Chaves. Não é uma autoridade certificadora sobre operadores.
**Uma certificação técnica autoriza a operar?**
São determinações distintas e nenhuma decorre automaticamente da outra.
**O BanzAI decide alguma coisa?**
O BanzAI orienta; os motores determinísticos verificam.
**O que é o Operador Zero? É o primeiro operador?**
O Operador Zero é a implementação de referência; não é o primeiro operador.
**Como é que o protocolo evolui? Existe um roteiro?**
Uma possibilidade futura só integra o protocolo quando é adoptada, versionada e publicada.
**Como sei o estado actual do protocolo?**
O estado actual está no §5; a FAQ não duplica esses valores.
## Referências'

selftest() {
  local d st=0 g b1 b2 b3 b4 b5 b6
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/m.md"; b2="$d/state.md"; b3="$d/cert.md"; b4="$d/l3.md"; b5="$d/rede.md"; b6="$d/root.md"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: milestone token in an answer
  printf '%s\n' "$GOOD_BODY" | sed 's/^O estado actual está.*/No M3 o primeiro operador entra em produção./' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL milestone accepted"; st=1; }

  # must FAIL: current-state flag duplicated
  printf '%s\n' "$GOOD_BODY" | sed 's|^O estado actual está.*|O Registo devolve /operators = [] em pré-produção.|' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL current-state accepted"; st=1; }

  # must FAIL: M2.9D bigram (even though phrased plausibly)
  printf '%s\n' "$GOOD_BODY" | sed 's/^São determinações distintas.*/Um operador certificado pode operar./' > "$b3"
  check "$b3" >/dev/null 2>&1 && { echo "SELFTEST_FAIL operador-certificado accepted"; st=1; }

  # must FAIL: profile-as-status in an answer
  printf '%s\n' "$GOOD_BODY" | sed 's/^Não. O perfil L3.*/Um operador L3 está federado./' > "$b4"
  check "$b4" >/dev/null 2>&1 && { echo "SELFTEST_FAIL operador-L3 accepted"; st=1; }

  # must FAIL: network-membership shorthand
  printf '%s\n' "$GOOD_BODY" | sed 's/^Federação é a avaliação.*/Entrar na rede BANZA exige ser membro BANZA./' > "$b5"
  check "$b5" >/dev/null 2>&1 && { echo "SELFTEST_FAIL rede-BANZA accepted"; st=1; }

  # must FAIL: affirmative wrong-premise (Trust Root governs), non-negated
  printf '%s\n' "$GOOD_BODY" | sed 's/^A Raiz de Confiança assina.*/A Raiz de Confiança é a autoridade certificadora do protocolo./' > "$b6"
  check "$b6" >/dev/null 2>&1 && { echo "SELFTEST_FAIL affirmative-authority accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ Reference FAQ semantic-consistency guard self-test broken"; exit 2; fi

echo "Reference FAQ semantic-consistency guard — §15 is a faithful compression layer: states the canonical boundaries (federation/routing/trust/BanzAI/non-propagation/Operador Zero/evolution/state→§5) and carries no roadmap, current-state or dangerous-shorthand tokens; wrong-premise terms appear only in questions or negated in answers"
if check "$REF"; then
  echo "Result: ✓ §15 preserves the architectural distinctions of §1–§14: no roadmap/current-state/membership/profile-as-status shorthand; boundaries stated; a short answer is never less correct than the chapter it sums"
else
  echo "Result: ✗ §15 lets a shorthand re-introduce a distinction the earlier chapters removed (see the Ch15 FAQ invariants)"
  exit 1
fi
