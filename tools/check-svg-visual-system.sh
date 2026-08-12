#!/usr/bin/env bash
#
# BANZA SVG Visual System Guard (M2.7J).
#
# Enforces the canonical visual grammar (docs/governance/SVG_VISUAL_SYSTEM.md) over the official public
# protocol diagram family — website/public/diagrams/protocol/*.svg. Every such SVG must carry the
# canonical header eyebrow (SVG-P-0XX · PROTOCOLO FINANCEIRO ABERTO), a <title>, a <desc>, a viewBox and
# a technical footer (SVG-P id + date); must not embed raster/base64 or external links; must not use text
# smaller than the public minimum (8px); and must not carry retired terminology (BANZA CA, operator
# certificate, certified operator, production-certificate promise, BanzAI Workbench, chat/assistant
# identity, Protocol Evidence/Knowledge System, "sistema adjacente", "BanzAI não faz parte do protocolo").
#
# Retired-term lines that clearly NEGATE the term ("sem X", "não X", "removido") are allowed — naming what
# the protocol is NOT is how the active model states its edges.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

SCAN_DIR="website/public/diagrams/protocol"

# Proper-case / literal terms that must not describe the protocol on a public diagram.
RETIRED='BANZA CA|Certificate Authority|operador certificado|operadores certificados|certificado de operador|certified operator|production certificate|certificados de produção|BanzAI Workbench|BanzAI Chat|/banzai/chat|/banzai/workbench|Protocol Evidence Assistant|Protocol Knowledge System|sistema adjacente|adjacente|sistema de conhecimento|conhecimento auxiliar|auxiliar do protocolo|não faz parte do protocolo'
# Negation cues that make a retired-term line an allowed boundary statement.
NEG='não|nao|nunca|\bsem\b|removid|deixou de|já não|ja nao|no longer|instead of'

check_one() { # $1 = svg file -> echoes NEEDS_FIX lines, returns 1 if any
  local f="$1" bad=0 base; base="$(basename "$f")"
  grep -q "· PROTOCOLO FINANCEIRO ABERTO" "$f" || { echo "  ✗ $base: missing canonical header (SVG-P-0XX · PROTOCOLO FINANCEIRO ABERTO)"; bad=1; }
  grep -qE "SVG-P-[0-9]" "$f" || { echo "  ✗ $base: missing SVG-P- identifier"; bad=1; }
  grep -q "<title" "$f" || { echo "  ✗ $base: missing <title>"; bad=1; }
  grep -q "<desc" "$f"  || { echo "  ✗ $base: missing <desc>"; bad=1; }
  grep -q "viewBox" "$f" || { echo "  ✗ $base: missing viewBox"; bad=1; }
  grep -qE "SVG-P-[0-9]+ ·[^<]*202[0-9]-[0-9]" "$f" || { echo "  ✗ $base: missing canonical footer (SVG-P id + date)"; bad=1; }
  grep -qiE "base64|<image|href=\"http" "$f" && { echo "  ✗ $base: raster/base64/external link"; bad=1; }
  grep -qoE 'font-size="[0-7](\.[0-9]+)?"' "$f" && { echo "  ✗ $base: text below the 8px public minimum"; bad=1; }
  # retired terminology, allowing clearly-negated boundary lines
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    echo "$line" | grep -qiE "$NEG" && continue
    echo "  ✗ $base: retired terminology — ${line:0:90}"; bad=1
  done < <(grep -iE "$RETIRED" "$f" 2>/dev/null || true)
  return $bad
}

# ── self-test (synthetic fixtures) ──
selftest() {
  local d st=0; d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  local good="$d/good.svg" nohdr="$d/nohdr.svg" nofoot="$d/nofoot.svg" notitle="$d/notitle.svg"
  local nodesc="$d/nodesc.svg" ca="$d/ca.svg" wb="$d/wb.svg" chatid="$d/chat.svg" adj="$d/adj.svg" adj2="$d/adj2.svg" aux="$d/aux.svg" tiny="$d/tiny.svg" b64="$d/b64.svg"
  local HDR='<text>SVG-P-099 · PROTOCOLO FINANCEIRO ABERTO</text>' T='<title>x</title>' D='<desc>x</desc>' VB='viewBox="0 0 10 10"' FT='<text>SVG-P-099 · Nome · 2026-07-19</text>'
  printf '<svg %s>%s%s%s%s</svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$good"
  printf '<svg %s>%s%s%s</svg>' "$VB" "$T" "$D" "$FT" > "$nohdr"
  printf '<svg %s>%s%s%s</svg>' "$VB" "$HDR" "$T" "$D" > "$nofoot"
  printf '<svg %s>%s%s%s</svg>' "$VB" "$HDR" "$D" "$FT" > "$notitle"
  printf '<svg %s>%s%s%s</svg>' "$VB" "$HDR" "$T" "$FT" > "$nodesc"
  printf '<svg %s>%s%s%s%s<text>BANZA CA assina</text></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$ca"
  printf '<svg %s>%s%s%s%s<text>BanzAI Workbench</text></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$wb"
  printf '<svg %s>%s<title>BanzAI Chat</title>%s%s%s</svg>' "$VB" "$HDR" "$D" "$FT" "$T" > "$chatid"
  printf '<svg %s>%s%s%s%s<text>sistema adjacente</text></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$adj"
  printf '<svg %s>%s%s%s%s<text>BanzAI adjacente ao nucleo</text></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$adj2"
  printf '<svg %s>%s%s%s%s<text>Sistema de conhecimento auxiliar do protocolo</text></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$aux"
  printf '<svg %s>%s%s%s%s<text font-size="6">x</text></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$tiny"
  printf '<svg %s>%s%s%s%s<image href="data:image/png;base64,AAAA"/></svg>' "$VB" "$HDR" "$T" "$D" "$FT" > "$b64"
  check_one "$good"    >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }
  check_one "$nohdr"   >/dev/null 2>&1 && { echo "SELFTEST_FAIL no-header accepted"; st=1; }
  check_one "$nofoot"  >/dev/null 2>&1 && { echo "SELFTEST_FAIL no-footer accepted"; st=1; }
  check_one "$notitle" >/dev/null 2>&1 && { echo "SELFTEST_FAIL no-title accepted"; st=1; }
  check_one "$nodesc"  >/dev/null 2>&1 && { echo "SELFTEST_FAIL no-desc accepted"; st=1; }
  check_one "$ca"      >/dev/null 2>&1 && { echo "SELFTEST_FAIL BANZA-CA accepted"; st=1; }
  check_one "$wb"      >/dev/null 2>&1 && { echo "SELFTEST_FAIL BanzAI-Workbench accepted"; st=1; }
  check_one "$chatid"  >/dev/null 2>&1 && { echo "SELFTEST_FAIL BanzAI-Chat title accepted"; st=1; }
  check_one "$adj"     >/dev/null 2>&1 && { echo "SELFTEST_FAIL sistema-adjacente accepted"; st=1; }
  check_one "$adj2"    >/dev/null 2>&1 && { echo "SELFTEST_FAIL BanzAI-adjacente accepted"; st=1; }
  check_one "$aux"     >/dev/null 2>&1 && { echo "SELFTEST_FAIL conhecimento-auxiliar accepted"; st=1; }
  check_one "$tiny"    >/dev/null 2>&1 && { echo "SELFTEST_FAIL tiny-font accepted"; st=1; }
  check_one "$b64"     >/dev/null 2>&1 && { echo "SELFTEST_FAIL base64 accepted"; st=1; }
  return $st
}

if ! selftest; then echo "svg-visual-system: guard self-test FAILED"; exit 2; fi

printf "\n══════════════════════════════════════════════════════════════════════\n"
printf "BANZA SVG Visual System Guard (M2.7J)\n"
printf "══════════════════════════════════════════════════════════════════════\n"
fail=0; n=0
for f in "$SCAN_DIR"/*.svg; do
  [ -e "$f" ] || continue
  n=$((n+1))
  out="$(check_one "$f")" || { echo "$out" >&2; fail=1; }
done
if [ "$fail" -eq 0 ]; then
  printf "Result: ✓ %d official protocol SVGs follow the canonical visual grammar\n\n" "$n"
else
  printf "\nResult: ✗ some SVGs break the canonical visual system (see docs/governance/SVG_VISUAL_SYSTEM.md)\n\n" >&2
  exit 1
fi
