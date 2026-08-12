#!/usr/bin/env bash
#
# BANZA Reference roadmap-durability guard (Ch14 "Evolução do Protocolo").
#
# Chapter 14's risk is a roadmap that ages: turning current state, internal milestones, dates or project
# plans into apparent protocol commitments. The chapter was reframed from a milestone roadmap ("Roteiro de
# Maturidade", M1–M6, dates, first-operator/first-certification, production commitments) into a durable
# "Evolução do Protocolo" that states only DIRECTIONS of evolution (as possibilities, not promises), what
# stays invariant, and what is NOT a commitment — with current state delegated to §5 and the change process
# to §11. This guard keeps §14 durable: it must survive being read in 2030 without maintenance.
#
# It does NOT ban the grammatical future or the word "SDK"/"produção" globally — it targets project-status,
# date and commitment PATTERNS. Architecture-invention terms (L5, Camada 4, CA central, rede BANZA) are
# negation-aware, because the chapter mentions them precisely to say they are NOT presupposed. Section-scoped
# to §14. Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §14 (from "## 14. " up to the next "## 15. ").
section() { awk '/^## 14\. /{f=1} /^## 15\. /{f=0} f' "$1"; }

# Positive canonical anchors — the durability/non-commitment framing is stated, not merely implied.
POSITIVE=(
  "não de um calendário de funcionalidades"                                                        # temporality
  "Não é um calendário, uma promessa de entrega nem um plano de produto"                           # function
  "estado actual"                                                                                   # state → §5
  "adoptada, versionada e publicada"                                                                # authority/versioning
  "não se pressupõe um L5"                                                                          # no future profile
  "não se pressupõe uma Camada 4"                                                                   # no future layer
  "não introduz uma CA central"                                                                     # no future CA
  "ferramentas que ainda não existam não são apresentados como entregáveis futuros"                 # no promised SDK/CLI
  "permanecer correcto mesmo que as prioridades internas, o calendário ou a implementação"          # durability
)

# HARD-forbidden (not negation-aware): pure project-status / date / commitment tokens have no place in §14.
FORBIDDEN_HARD_RE=(
  "\bM[1-6]\b"                                   # milestone codes M1..M6
  "\bQ[1-4]\b"                                   # quarters
  "\b20[2-9][0-9]\b"                             # roadmap years (2026, 2027, …)
  "em breve"
  "roadmap"
  "\bmilestones?\b"
  "marcos? +M[0-9]"                              # "marco M2" (bare "marco" as a boundary word is allowed)
  "pré-produção|pre-production|PRE_PRODUCTION"   # current state → §5
  "/operators *= *\[\]|production_certificates"  # state flags → §5
  "primeiro operador|primeira certificação|primeira implementação certificada"
  "vamos +[a-zç]+r\b|iremos +[a-zç]+r\b|pretendemos|planeamos|lançaremos"   # "nós vamos" commitments
  "será +lançad|serão +lançad|vai +ser +lançad"  # delivery promises
  "próxim[oa] +(fase|marco|milestone|passo|cerimónia)|próxima +cerimónia"    # project "next"
  "✅|⏳|🚧|❌"                                   # status checkboxes / progress markers
)

# Negation-aware forbidden: architecture-invention terms are allowed ONLY when negated (the chapter says
# these are NOT presupposed). A line asserting them affirmatively is a violation.
FORBIDDEN_NEG_RE=(
  "\bL5\b"
  "Camada 4"
  "CA central|autoridade certificadora central|nova CA"
  "rede BANZA"
)
NEG='não|nao|nunca|nem|sem|nenhum|nenhuma|pressupõe|introduz|inventa|cria uma'

check() {
  local ref="$1" bad=0 s14 phrase line
  s14="$(section "$ref")"

  echo "$s14" | grep -qE '^## 14\. Evolução do Protocolo$' \
    || { echo "  ✗ §14 title is not 'Evolução do Protocolo'"; bad=1; }

  for phrase in "${POSITIVE[@]}"; do
    echo "$s14" | grep -qF "$phrase" \
      || { echo "  ✗ §14 is missing durability anchor: \"$phrase\""; bad=1; }
  done

  # hard-forbidden tokens
  while IFS= read -r line || [ -n "$line" ]; do
    for phrase in "${FORBIDDEN_HARD_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "  ✗ §14 contains a project-status/date/commitment token (roadmap that ages): \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
    # architecture-invention terms — only a problem when NOT negated
    for phrase in "${FORBIDDEN_NEG_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "$line" | grep -qiE "$NEG" && continue
        echo "  ✗ §14 asserts a future architecture not adopted through the applicable process: \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
  done <<< "$s14"

  return $bad
}

# ── self-test ──
GOOD_BODY='## 14. Evolução do Protocolo
O BANZA evolui através de regras versionadas e publicadas pelo processo aplicável, não de um calendário de funcionalidades. Não é um calendário, uma promessa de entrega nem um plano de produto; foi escrito para permanecer correcto mesmo que as prioridades internas, o calendário ou a implementação do projecto mudem.
O estado actual está no §5 Estado Protocolar; este capítulo não o repete.
Só quando a mudança é adoptada, versionada e publicada pelo processo aplicável passa a integrar o protocolo.
A evolução não se pressupõe um L5, não se pressupõe uma Camada 4 e não introduz uma CA central.
SDKs, CLIs ou outras ferramentas que ainda não existam não são apresentados como entregáveis futuros.
## 15. Perguntas Frequentes'

selftest() {
  local d st=0 g b1 b2 b3 b4 b5
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/m.md"; b2="$d/date.md"; b3="$d/soon.md"; b4="$d/first.md"; b5="$d/l5.md"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: milestone code
  printf '%s\n' "$GOOD_BODY" | sed 's/^O estado actual.*/No M2 a confiança entra em produção./' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL milestone accepted"; st=1; }

  # must FAIL: roadmap date
  printf '%s\n' "$GOOD_BODY" | sed 's/^O estado actual.*/A liquidação transfronteiriça chega em 2027./' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL date accepted"; st=1; }

  # must FAIL: "em breve"
  printf '%s\n' "$GOOD_BODY" | sed 's/^O estado actual.*/O SDK oficial chega em breve./' > "$b3"
  check "$b3" >/dev/null 2>&1 && { echo "SELFTEST_FAIL em-breve accepted"; st=1; }

  # must FAIL: first operator/certification promise
  printf '%s\n' "$GOOD_BODY" | sed 's/^O estado actual.*/O primeiro operador será certificado no lançamento./' > "$b4"
  check "$b4" >/dev/null 2>&1 && { echo "SELFTEST_FAIL first-operator accepted"; st=1; }

  # must FAIL: affirmative future architecture (non-negated L5)
  printf '%s\n' "$GOOD_BODY" | sed 's/^A evolução não se pressupõe.*/A próxima versão adiciona um perfil L5 e uma Camada 4./' > "$b5"
  check "$b5" >/dev/null 2>&1 && { echo "SELFTEST_FAIL affirmative-L5 accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ Reference roadmap-durability guard self-test broken"; exit 2; fi

echo "Reference roadmap-durability guard — §14 states only durable directions of evolution (possibilities, not promises), delegates current state to §5 and the change process to §11, and carries no milestone/date/commitment tokens (survives a 2030 read)"
if check "$REF"; then
  echo "Result: ✓ §14 is durable: no M1–M6/dates/em-breve/first-operator/roadmap tokens; no unadopted future architecture (L5/Camada 4/CA) asserted; state→§5, process→§11; possibility ≠ commitment"
else
  echo "Result: ✗ §14 lets a plan, date, milestone or unadopted architecture read as a protocol commitment (see the Ch14 durability invariants)"
  exit 1
fi
