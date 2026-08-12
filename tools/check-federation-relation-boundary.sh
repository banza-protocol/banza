#!/usr/bin/env bash
#
# BANZA Federation Relation-Boundary Guard (Ch10 "Federação").
#
# Chapter 10's risk is the sharpest in the reference: turning a bounded, verifiable TECHNICAL RELATION
# into a "BANZA network", a membership, an institutional authority, a scheme, a settlement, or a
# regulatory authorization. The canon (ADR-040 Federation Trust Evaluation · FEDERATION_INVARIANTS
# INV-FEDEVAL/INV-FED · ADR-061 non-propagation · ADR-079 Model A) fixes federation as:
#
#   - a per-pair, per-INTERACTION relation between operators, decided LOCALLY by each party over public
#     material, producing exactly one result: ROUTING_ALLOWED / FAIL_CLOSED — never a conferred status;
#   - the L3 conformance PROFILE is a pre-condition, NECESSARY but never SUFFICIENT (never "L3 = federated"),
#     and L3 (a profile) is not Camada 3 (a scheme);
#   - NOT symmetric automatically, NOT transitive; a determination does not propagate to scheme admission,
#     settlement, or regulatory authorization;
#   - BANZA is not in the trust path nor the funds path, does not choose peers, and obliges no one to route.
#
# This guard keeps §10 faithful to that. POSITIVE anchors assert the boundary is stated. FORBIDDEN
# collapses (federation-as-network/membership/status, "operador federado", scheme/settlement/authorization
# by federation) are checked per line and skipped when a negation cue is on the line — so the correct
# negated prose passes. One HARD check forbids re-embedding the retired money-flow figure. Section-scoped
# to §10 only. Not written to a regex — it asserts the canonical boundary. Exit 1 on violation; exit 2 on
# broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §10 (from "## 10. " up to the next "## 11. ").
section() { awk '/^## 10\. /{f=1} /^## 11\. /{f=0} f' "$1"; }

# Positive canonical anchors — the boundary is stated, not merely implied.
# The primary definition is the EVALUATION (local, per-interaction), not a persistent relation/status:
# "avaliação técnica" leads the opening; "não obriga a encaminhar" pins ROUTING_ALLOWED ≠ mandatory routing.
POSITIVE=(
  "avaliação técnica"
  "ROUTING_ALLOWED"
  "FAIL_CLOSED"
  "não obriga a encaminhar"
  "não é automaticamente simétrica"
  "não é transitiva"
  "necessário mas nunca suficiente"
  "não movimenta fundos e não executa liquidação"
  "admissão a um esquema operacional"
  "não decide com quem um operador se relaciona"
  "não se propaga automaticamente"
  "não está no caminho da confiança nem no caminho dos fundos"
  "banza-controlled-federation-gate-v1.svg"
  "banza-federation-non-propagation-v1.svg"
)

# Affirmative collapses — checked per line, skipped when the line carries a negation cue.
FORBIDDEN_RE=(
  "rede BANZA"                 # BANZA-as-network institution
  "operadores? federad"        # "operador federado" as a conferred status
  "torna-se federad"           # becomes federated (status)
  "entrar? na rede"            # joining the network (membership)
  "membros? da federação"      # federation membership list
  "federação automática"       # automatic federation
  "routing obrigatório"        # ROUTING_ALLOWED must never read as mandatory routing
  "encaminhamento obrigatório" # idem, in Portuguese
)
NEG='não|nao|nunca|nem|sem|nenhum|nenhuma|«|»|≠|deixa de'

# HARD (not negation-aware): "L2" must never designate Camada 2. The institutional Camada-2 certification
# is "certificação técnica da Camada 2"; "L2" is reserved for the L0–L4 conformance profile ("perfil L2").
# These ambiguous forms are ALWAYS wrong in §10 (which legitimately carries no bare L2 token).
L2_AMBIGUOUS_RE='certifica(ç[ãa]o|do) L2|L2 certification|certification L2'

check() {
  local ref="$1" bad=0 s10 phrase line
  s10="$(section "$ref")"

  echo "$s10" | grep -qE '^## 10\. Federação$' \
    || { echo "  ✗ §10 title is not 'Federação'"; bad=1; }

  for phrase in "${POSITIVE[@]}"; do
    echo "$s10" | grep -qF "$phrase" \
      || { echo "  ✗ §10 is missing canonical anchor: \"$phrase\""; bad=1; }
  done

  # HARD: the retired money-flow figure must not be re-embedded in §10.
  if echo "$s10" | grep -qF "banza-federation-v1.svg"; then
    echo "  ✗ §10 re-embeds the retired money-flow figure banza-federation-v1.svg (SVG-P-038) — use SVG-P-054 + SVG-P-110"
    bad=1
  fi

  # HARD: "L2" must never designate Camada 2 (write "certificação técnica da Camada 2"; L2 = perfil).
  if echo "$s10" | grep -qiE "$L2_AMBIGUOUS_RE"; then
    echo "  ✗ §10 uses an ambiguous \"certificação L2\" form — L2 is a conformance profile; the institutional layer is Camada 2 (write \"certificação técnica da Camada 2\")"
    bad=1
  fi

  # affirmative collapses (negation-aware, per line)
  while IFS= read -r line || [ -n "$line" ]; do
    for phrase in "${FORBIDDEN_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "$line" | grep -qiE "$NEG" && continue
        echo "  ✗ §10 affirmative collapse (federation as network/membership/status): \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
  done <<< "$s10"

  return $bad
}

# ── self-test ──
GOOD_BODY='## 10. Federação
No BANZA, federação é a avaliação técnica, local e por interacção, das condições necessárias para interoperabilidade entre dois operadores; o BANZA não está no caminho da confiança nem no caminho dos fundos.
O resultado é ROUTING_ALLOWED ou FAIL_CLOSED; um ROUTING_ALLOWED não obriga a encaminhar. Não é uma rede central nem uma lista de membros da federação.
A certificação técnica da Camada 2 é distinta dos perfis L0–L4.
L3 é uma pré-condição, necessário mas nunca suficiente; não significa que a implementação esteja federada.
A federação não é automaticamente simétrica e não é transitiva.
A federação não movimenta fundos e não executa liquidação. Federação técnica ≠ admissão a um esquema operacional. A federação não substitui contratos.
O BANZA não decide com quem um operador se relaciona. Uma determinação técnica de federação não se propaga automaticamente.
![fig](/diagrams/protocol/banza-controlled-federation-gate-v1.svg)
![fig](/diagrams/protocol/banza-federation-non-propagation-v1.svg)
## 11. Governança'

selftest() {
  local d st=0 g b1 b2 b3 b4
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/collapse.md"; b2="$d/missing.md"; b3="$d/figure.md"; b4="$d/l2.md"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: an affirmative collapse (federation-as-network, non-negated)
  printf '%s\n' "$GOOD_BODY" | sed 's/^A federação não é automaticamente simétrica.*/Cada operador que entra na rede BANZA torna-se federado./' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL collapse (rede BANZA / federado) accepted"; st=1; }

  # must FAIL: non-propagation anchor missing
  printf '%s\n' "$GOOD_BODY" | grep -v 'não se propaga automaticamente' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing-non-propagation-anchor accepted"; st=1; }

  # must FAIL: the retired money-flow figure re-embedded
  printf '%s\n' "$GOOD_BODY" | sed 's#banza-federation-non-propagation-v1.svg#banza-federation-v1.svg#' > "$b3"
  check "$b3" >/dev/null 2>&1 && { echo "SELFTEST_FAIL retired-figure re-embed accepted"; st=1; }

  # must FAIL: an ambiguous "certificação L2" form (L2 used to mean Camada 2)
  printf '%s\n' "$GOOD_BODY" | sed 's/^A certificação técnica da Camada 2.*/A certificação L2 é distinta dos perfis L0–L4./' > "$b4"
  check "$b4" >/dev/null 2>&1 && { echo "SELFTEST_FAIL ambiguous 'certificação L2' accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ Federation relation-boundary guard self-test broken"; exit 2; fi

echo "Federation relation-boundary guard — §10 keeps federation a bounded, local, per-interaction technical relation (ADR-040/061/079), never a network/membership/authority/scheme/settlement/authorization"
if check "$REF"; then
  echo "Result: ✓ §10 keeps federation a bounded verifiable relation: local per-interaction (ROUTING_ALLOWED/FAIL_CLOSED), L3 necessary-not-sufficient, non-symmetric, non-transitive, non-propagating; BANZA not in the trust or funds path"
else
  echo "Result: ✗ §10 lets federation drift into a network/membership/authority/scheme/settlement/authorization (see decisions/adr/ADR-040, ADR-061, ADR-079)"
  exit 1
fi
