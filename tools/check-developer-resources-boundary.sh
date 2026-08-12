#!/usr/bin/env bash
#
# BANZA Developer-Resources Boundary Guard (Ch13 "Recursos para Programadores").
#
# Chapter 13's risk is turning TOOLS, SDKs, reference code or CURRENT-IMPLEMENTATION choices into
# PROTOCOL REQUIREMENTS. The canon (CLAUDE.md operator technology-neutrality · ADR-005 protocol-first ·
# ADR-037 Rust-first for OFFICIAL engines only · ADR-042/Ch05 PostgreSQL = reference-implementation
# persistence · ADR-052/Ch09 Operador Zero = reference impl ≠ spec · ADR-054/§12 BanzAI orienta/não
# decide · contracts/invariants.json = single machine-readable source of truth) fixes:
#
#   - the ARTEFACTOS NORMATIVOS (contracts, invariants, conformance vectors) define the rules; TOOLS help
#     implement/test/understand them and never become normative by being maintained by the project;
#   - a BANZA implementation may be built in ANY language, database and runtime that satisfies the
#     contracts/invariants/vectors — Rust is the language of the reference ENGINES, not an operator
#     requirement; PostgreSQL/Docker/etc. are implementation choices, not protocol requirements;
#   - an SDK is a convenience, not the protocol; OpenAPI describes specific HTTP interfaces, not the whole
#     spec; the Operador Zero is a reference implementation and test target, not a spec to copy; the BanzAI
#     orients/explains and does not decide conformance; implementing/validating is not certifying/admitting/
#     authorizing.
#
# POSITIVE anchors assert the boundary is stated. FORBIDDEN affirmative collapses (Rust/PostgreSQL/Docker/
# SDK required of operators; OpenAPI = whole spec; Operador Zero to copy/normative; BanzAI/Workbench
# certifies/decides; main = production) are checked per line and skipped when a negation cue is present. One
# HARD check forbids re-citing the STALE mirror docs/reference/pt/completa.md in §13. Section-scoped to §13.
# Not written to a regex — it asserts the canonical boundary. Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §13 (from "## 13. " up to the next "## 14. ").
section() { awk '/^## 13\. /{f=1} /^## 14\. /{f=0} f' "$1"; }

# Positive canonical anchors — the boundary is stated, not merely implied.
POSITIVE=(
  "os artefactos normativos — contratos, invariantes e vectores de conformidade — definem as regras aplicáveis"  # norm vs tool
  "não se torna normativa por ser mantida pelo projecto"                                                          # tool ≠ authority
  "qualquer linguagem, com qualquer base de dados e qualquer ambiente de execução"                                # stack neutrality
  "Rust é a linguagem dos motores oficiais de referência; não é um requisito para os operadores"                  # Rust boundary
  "a base de dados de uma implementação (PostgreSQL, ou outra) não faz parte do protocolo"                        # DB boundary
  "O BANZA não apresenta actualmente um SDK público como recurso de integração"                                    # SDK availability (current public state)
  "OpenAPI descrevem interfaces HTTP específicas"                                                                   # OpenAPI ≠ whole spec
  "não é uma especificação nem uma implementação a copiar"                                                          # Operador Zero boundary
  "O BanzAI orienta, localiza regras e explica; não decide conformidade"                                           # BanzAI boundary
  "não significa automaticamente"                                                                                   # validar ≠ certificar/admitir/autorizar
  "banza-developer-resource-authority-v1.svg"
  "banza-developer-flow-v1.svg"
)

# Affirmative collapses — checked per line, skipped when the line carries a negation cue.
FORBIDDEN_RE=(
  "deve[m]? usar rust"              # Rust required of operators
  "rust é obrigatóri"
  "obrigatóri[oa] .*rust|rust .*obrigatóri"
  "postgresql é obrigatóri|requer postgresql|instalar postgresql|obrigat[óo]ri[oa] .*postgresql"
  "docker é obrigatóri|requer docker"
  "sdk oficial|sdk obrigatóri|sdk recomendado"     # (negated "não existe SDK oficial" passes)
  "openapi é (a especificação|o protocolo)"        # OpenAPI = whole spec
  "cop(iar|ie|iando) o operador zero|clonar o operador zero|comece.*operador zero"
  "workbench certifica"
  "banzai certifica|banzai decide"
  "use .*main.* em produção|main.*é.*release"       # main = production/release
)
NEG='não|nao|nunca|nem|sem|nenhum|nenhuma|opcional|opcionais|substituível|substituíveis|não é|não existe'

# HARD (not negation-aware): the STALE mirror must not be cited as a resource/normative source in §13.
STALE_MIRROR="docs/reference/pt/completa.md"

# HARD (figure file, not negation-aware): the authority figure must not present an SDK (or CLI) as an
# AVAILABLE resource while no public SDK exists. There is no public, versioned, documented BANZA SDK today
# (conformance/sdk is a conformance test-suite spec describing what an SDK MUST satisfy; the engines' pkg/
# dirs are internal wasm-pack builds). This check matches the CURRENT PUBLIC STATE and MUST be revised — here
# and in §13 — if/when a real public SDK is introduced. It is a hard check because "opcional" is a NEG cue,
# so a negation-aware scan cannot catch a "SDKs (opcionais)" box label.
AUTHORITY_SVG="website/public/diagrams/protocol/banza-developer-resource-authority-v1.svg"
SVG_FORBIDDEN_RE='SDKs? \(opcion|SDKs? opcion|SDK BANZA disponível|Use o SDK'

# The figure must not present an SDK/CLI box as an available tool (current public state — see note above).
check_svg() {
  local f="$1"
  [ -f "$f" ] || { echo "  ✗ authority figure missing: $f"; return 1; }
  if grep -qiE "$SVG_FORBIDDEN_RE" "$f"; then
    echo "  ✗ SVG-P-112 presents an SDK as an available resource — no public BANZA SDK exists (revise this check and §13 only when one does)"
    return 1
  fi
  return 0
}

check() {
  local ref="$1" bad=0 s13 phrase line
  s13="$(section "$ref")"

  echo "$s13" | grep -qE '^## 13\. Recursos para Programadores$' \
    || { echo "  ✗ §13 title is not 'Recursos para Programadores'"; bad=1; }

  for phrase in "${POSITIVE[@]}"; do
    echo "$s13" | grep -qF "$phrase" \
      || { echo "  ✗ §13 is missing canonical anchor: \"$phrase\""; bad=1; }
  done

  # HARD: the stale mirror must not reappear as a §13 resource (norm-hierarchy regression).
  if echo "$s13" | grep -qF "$STALE_MIRROR"; then
    echo "  ✗ §13 cites the stale mirror \"$STALE_MIRROR\" — the canonical sources are the invariants, contracts, vectors and the live Reference; never completa.md"
    bad=1
  fi

  # affirmative collapses (negation-aware, per line)
  while IFS= read -r line || [ -n "$line" ]; do
    for phrase in "${FORBIDDEN_RE[@]}"; do
      if echo "$line" | grep -qiE "$phrase"; then
        echo "$line" | grep -qiE "$NEG" && continue
        echo "  ✗ §13 affirmative collapse (tool/implementation-choice as a protocol requirement): \"$phrase\""
        echo "      line: $line"
        bad=1
      fi
    done
  done <<< "$s13"

  return $bad
}

# ── self-test ──
GOOD_BODY='## 13. Recursos para Programadores
Uma distinção governa o capítulo: os artefactos normativos — contratos, invariantes e vectores de conformidade — definem as regras aplicáveis; as ferramentas ajudam. Uma ferramenta não se torna normativa por ser mantida pelo projecto.
Uma implementação BANZA pode ser construída em qualquer linguagem, com qualquer base de dados e qualquer ambiente de execução, desde que satisfaça os contratos.
Rust é a linguagem dos motores oficiais de referência; não é um requisito para os operadores.
Na persistência, a base de dados de uma implementação (PostgreSQL, ou outra) não faz parte do protocolo.
O BANZA não apresenta actualmente um SDK público como recurso de integração; as implementações externas baseiam-se nos artefactos normativos. Nenhuma biblioteca específica é necessária para implementar o protocolo.
As especificações OpenAPI descrevem interfaces HTTP específicas — não substituem os invariantes.
O Operador Zero serve como alvo de teste; não é uma especificação nem uma implementação a copiar.
O BanzAI orienta, localiza regras e explica; não decide conformidade nem emite certificação.
Implementar e validar uma implementação não significa automaticamente certificação, admissão nem autorização.
![fig](/diagrams/protocol/banza-developer-resource-authority-v1.svg)
![fig](/diagrams/protocol/banza-developer-flow-v1.svg)
## 14. Evolução do Protocolo'

selftest() {
  local d st=0 g b1 b2 b3 b4 sg sb
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/rust.md"; b2="$d/mirror.md"; b3="$d/sdk.md"; b4="$d/missing.md"
  sg="$d/good.svg"; sb="$d/bad.svg"

  printf '%s\n' "$GOOD_BODY" > "$g"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }

  # must FAIL: Rust required of operators (non-negated)
  printf '%s\n' "$GOOD_BODY" | sed 's/^Rust é a linguagem.*/Para ser conforme, o operador deve usar Rust./' > "$b1"
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL rust-required accepted"; st=1; }

  # must FAIL: stale mirror cited
  printf '%s\n' "$GOOD_BODY" | sed 's#^As especificações OpenAPI.*#Consultar docs/reference/pt/completa.md como referência.#' > "$b2"
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL stale-mirror accepted"; st=1; }

  # must FAIL: official SDK affirmed (no negation cue)
  printf '%s\n' "$GOOD_BODY" | sed 's/^O BANZA não apresenta.*/Instale o SDK oficial do BANZA para integrar./' > "$b3"
  check "$b3" >/dev/null 2>&1 && { echo "SELFTEST_FAIL official-SDK accepted"; st=1; }

  # must FAIL: a canonical anchor missing (stack neutrality)
  printf '%s\n' "$GOOD_BODY" | grep -v 'qualquer linguagem, com qualquer base de dados' > "$b4"
  check "$b4" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing stack-neutrality anchor accepted"; st=1; }

  # figure check: a figure with only real tools passes; one presenting an SDK box fails
  printf '%s\n' '<svg><text>Motores determinísticos — verificam</text><text>BanzAI — orienta e explica</text></svg>' > "$sg"
  check_svg "$sg" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good-figure rejected"; st=1; }
  printf '%s\n' '<svg><text>Motores determinísticos</text><text>SDKs (opcionais)</text></svg>' > "$sb"
  check_svg "$sb" >/dev/null 2>&1 && { echo "SELFTEST_FAIL sdk-figure accepted"; st=1; }

  return $st
}

if ! selftest; then echo "Result: ✗ Developer-resources boundary guard self-test broken"; exit 2; fi

echo "Developer-resources boundary guard — §13 keeps normative artefacts (contracts/invariants/vectors) as what DEFINES the protocol and tools/SDKs/reference code/stack as what merely helps (CLAUDE.md · ADR-005/037/042/052/054)"
svg_bad=0
check_svg "$AUTHORITY_SVG" || svg_bad=1
if check "$REF" && [ "$svg_bad" -eq 0 ]; then
  echo "Result: ✓ §13 keeps norm vs tool distinct: artefacts define; tools implement/verify; references exemplify; any language/DB/runtime; Rust is the reference engines' language not an operator requirement; SDK≠protocol; OpenAPI≠whole spec; Operador Zero not to copy; BanzAI does not certify; validate ≠ certify/admit/authorize; the stale mirror is not cited"
else
  echo "Result: ✗ §13 lets a tool or implementation choice read as a protocol requirement (see CLAUDE.md operator neutrality, ADR-037/042/052/054, and the stale-mirror rule)"
  exit 1
fi
