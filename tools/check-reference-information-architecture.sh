#!/usr/bin/env bash
#
# BANZA Reference Information-Architecture Guard (M2.7L).
#
# Locks the public information architecture of the Reference: the canonical chapter order, Estado Protocolar as
# chapter 05 (protocol state, after Architecture), FAQ last (15 since M2.12B), the stable public routes, clean public
# card copy, and the removal of the tool-list "anti-path" narrative from the active repository. The
# communication model is positive and architectural: BanzAI guides; the engines verify; the evidence
# proves.
#
# The old tool-list narrative is detected by FRAGMENT CO-OCCURRENCE (three build-tool tokens on one line),
# never by storing the retired sentence — so this guard file does not carry the old formulation.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"
DEFS="website/lib/reference.ts"

# Canonical order: position -> slug (public route, stable) and the markdown heading title.
# M2.12B — Operador Zero inserted at 09, between Operadores (08) and Federação (10), shifting the
# former 09..14 to 10..15. The POSITION is enforced separately and in detail by
# `make reference-chapter-order-check`; this list keeps M2.7L's whole-order check honest.
EXPECT_SLUG=(o-que-e porque-existe principios arquitectura estado-protocolar confianca certificacao operadores operador-zero federacao governacao banzai programadores roteiro faq)
EXPECT_TITLE=("O Que É o BANZA" "Por Que o BANZA Existe" "Propriedades Estruturais do Protocolo" "Arquitectura do Protocolo" "Estado Protocolar" "Confiança" "Conformidade e Certificação" "Operadores" "Operador Zero" "Federação" "Governança" "BanzAI — Agente do Protocolo" "Recursos para Programadores" "Evolução do Protocolo" "Perguntas Frequentes")

fail=0
err() { echo "  ✗ $*"; fail=1; }

# ── 1. CHAPTER_DEFS order (num + slug) matches the canonical order ──
check_defs_order() {
  local got; got="$(grep -oE '\{ num: [0-9]+, slug: "[a-z-]+"' "$DEFS" | sed -E 's/.*num: ([0-9]+), slug: "([a-z-]+)"/\1:\2/')"
  local i=1 line
  local want=""
  for s in "${EXPECT_SLUG[@]}"; do want+="$i:$s"$'\n'; i=$((i+1)); done
  if [ "$got"$'\n' != "$want" ]; then
    err "CHAPTER_DEFS order != canonical (expected 01..15 with Estado Protocolar=05, Operador Zero=09, FAQ=15)"; echo "$got" | sed 's/^/      got: /'
  fi
}

# ── 2. Markdown headings match order + numbers + titles; FAQ last; Estado Protocolar=05 ──
check_md_order() {
  local n=1 t s
  while IFS= read -r line; do
    n="${line%%:*}"; t="${line#*: }"
    :
  done < <(grep -nE '^## [0-9]+\. ' "$REF")
  local idx=0
  while IFS= read -r h; do
    idx=$((idx+1))
    local num="${h%%.*}"; num="${num##*# }"
    local title; title="$(echo "$h" | sed -E 's/^## [0-9]+\. //')"
    local want="${EXPECT_TITLE[$((idx-1))]:-}"
    if [ "$idx" -le 15 ] && [ "$title" != "$want" ]; then err "chapter $idx title '$title' != '$want'"; fi
    if [ "$idx" -ne "$num" ]; then err "chapter position $idx has heading number $num (must match)"; fi
  done < <(grep -E '^## [0-9]+\. ' "$REF")
  [ "$idx" -eq 15 ] || err "expected 15 numbered chapters, found $idx"
  grep -qE '^## 5\. Estado Protocolar' "$REF" || err "Estado Protocolar is not chapter 05"
  grep -qE '^## 15\. Perguntas Frequentes' "$REF" || err "FAQ is not chapter 15 (last)"
  if grep -qE '^## (1[6-9]|[2-9][0-9])\. ' "$REF"; then err "a chapter numbered 16+ exists (must be 15 chapters)"; fi
}

# ── 3. Public card copy (CHAPTER_DEFS summaries) is clean ──
FORBIDDEN_CARD='M[0-9]/M[0-9]|M1–M6|M1-M6|especificação congelada|produção dependente de|marcos? M[0-9]|operador[es]* certificad|certificado de operador|certificados de produção|BANZA CA|Certificate Authority|BanzAI Workbench|\bWorkbench\b|/banzai/chat|BanzAI Chat|sistema adjacente|Protocol Knowledge System|livro-razão de partidas dobradas|compensação bilateral'
check_card_copy() {
  local hits
  hits="$(grep -E '^\s*\{ num: [0-9]+, slug:' "$DEFS" | grep -iE "$FORBIDDEN_CARD" || true)"
  [ -z "$hits" ] || { err "forbidden language in reference cards:"; echo "$hits" | sed 's/^/      /'; }
}

# ── 4. Routes / files exist ──
check_routes() {
  [ -d website/app/referencia ] || err "missing website/app/referencia"
  [ -e "website/app/referencia/[capitulo]/page.tsx" ] || err "missing chapter route [capitulo]"
  [ -e website/app/referencia/completa/page.tsx ] || err "missing /referencia/completa"
  [ -e website/app/referencia/racional/page.tsx ] || err "missing /referencia/racional redirect"
  grep -q 'slug: "estado-protocolar"' "$DEFS" || err "estado-protocolar slug not stable in CHAPTER_DEFS"
  [ -d website/app/decisoes ] || err "missing /decisoes"
  # Derived from the tree, never a frozen list: after a reorganisation a hardcoded set reports the
  # past as the present. EVERY current record must be indexed and mirrored — a stronger property than
  # the six numbers this used to name.
  local f n
  for f in decisions/adr/ADR-*.md; do
    n=$(basename "$f" | sed 's/^ADR-\([0-9][0-9][0-9]\)-.*/\1/')
    grep -q "\"adr-$n\"" website/lib/decisions.ts || err "ADR-$n missing from decisions index"
    ls website/content/decisions/adr/ADR-$n-*.md >/dev/null 2>&1 || err "ADR-$n website mirror missing"
  done
}

# ── 5. Tool-list anti-path narrative absent from active repo (fragment co-occurrence, not literal) ──
T1='[Pp]ython'; T2='[Dd]ocker'; T3='GitHub Action'
scan_tool_narrative() { # stdin -> lines where all three build-tool tokens co-occur (the retired anti-path narrative)
  grep -nE "$T1" | grep -E "$T2" | grep -E "$T3" || true
}
check_tool_narrative() {
  # Active copy + served-engine/service surfaces. The guard excludes itself (it carries the detection
  # fragments by design). Engine/service answer strings are compiled into the served WASM/JSON, so they
  # are in scope too (M2.7L adversarial finding).
  local surfaces=(website/app website/components website/content website/lib docs/reference README.md \
                  engines/banzai-evidence/src services/banzai-api/src services/verification-api/src)
  local hits
  hits="$(grep -rInE "$T1" "${surfaces[@]}" --include='*.ts' --include='*.tsx' --include='*.md' --include='*.rs' --include='*.js' 2>/dev/null \
        | grep -E "$T2" | grep -E "$T3" \
        | grep -viE 'forbiddenRunnerMethods|build-tool tokens|three build-tool|package-manager / container / CI' || true)"
  [ -z "$hits" ] || { err "tool-list anti-path narrative on an active surface (use positive framing: BanzAI guides; the engines verify; the evidence proves):"; echo "$hits" | sed 's/^/      /'; }
}

# ── self-test ──
selftest() {
  local st=0 d; d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  # tool-narrative detector: co-occurrence flags; positive line passes
  printf 'sem %s, %s, %s ou CLI\n' "Python" "Docker" "GitHub Actions" | scan_tool_narrative | grep -q . || { echo "SELFTEST_FAIL tool-narrative not detected"; st=1; }
  printf 'BanzAI guia; os motores verificam; a evidência prova.\n' | scan_tool_narrative | grep -q . && { echo "SELFTEST_FAIL positive line flagged"; st=1; }
  printf 'Instale o Python.\n' | scan_tool_narrative | grep -q . && { echo "SELFTEST_FAIL single-token flagged"; st=1; }
  # card-copy forbidden fragments
  echo '  { num: 5, slug: "estado-protocolar", summary: "produção dependente de M2/M3" },' | grep -iE "$FORBIDDEN_CARD" | grep -q . || { echo "SELFTEST_FAIL roadmap card not caught"; st=1; }
  echo '  { num: 8, slug: "operadores", summary: "operador certificado" },' | grep -iE "$FORBIDDEN_CARD" | grep -q . || { echo "SELFTEST_FAIL operador-certificado card not caught"; st=1; }
  echo '  { num: 5, slug: "estado-protocolar", summary: "Base de estado protocolar verificável." },' | grep -iE "$FORBIDDEN_CARD" | grep -q . && { echo "SELFTEST_FAIL clean card flagged"; st=1; }
  # order fixtures
  printf '## 5. Estado Protocolar\n## 15. Perguntas Frequentes\n' | grep -qE '^## 5\. Estado Protocolar' || { echo "SELFTEST_FAIL pg5 probe"; st=1; }
  printf '## 15. Estado Protocolar\n' | grep -qE '^## 5\. Estado Protocolar' && { echo "SELFTEST_FAIL pg-last probe"; st=1; }
  return $st
}
if ! selftest; then echo "reference-information-architecture: guard self-test FAILED"; exit 2; fi

printf "\n══════════════════════════════════════════════════════════════════════\n"
printf "BANZA Reference Information-Architecture Guard (M2.7L)\n"
printf "══════════════════════════════════════════════════════════════════════\n"
check_defs_order
check_md_order
check_card_copy
check_routes
check_tool_narrative
if [ "$fail" -eq 0 ]; then
  printf "Result: ✓ canonical chapter order (Estado Protocolar=05, Operador Zero=09, FAQ=15), clean cards, stable routes, no tool-list narrative\n\n"
else
  printf "\nResult: ✗ information-architecture violations (see above)\n\n" >&2
  exit 1
fi
