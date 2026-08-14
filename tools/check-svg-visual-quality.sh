#!/usr/bin/env bash
#
# BANZA SVG Visual-Quality Guard (M2.7E).
#
# Official BANZA diagrams are protocol-documentation artifacts. This guard holds every official *diagram*
# SVG to the SVG_QUALITY_POLICY.md rules that are machine-checkable:
#
#   1. Structure   — each diagram has a viewBox, a <title> and a <desc>.
#   2. Pure vector — no data: URI, no base64, no <image>, no xlink:href, no external/remote URL other than
#                    the mandatory xmlns="http://www.w3.org/2000/svg".
#   3. Legibility  — no meaningful text below the 8px floor; no textLength-forced compression.
#   4. Semantics   — no REMOVED concept presented as ACTIVE architecture (a negation is allowed): BANZA CA,
#                    certificado de operador / operador certificado / certificado BANZA / certificados de
#                    produção, certificação-as-flow, autoridade certificadora, aprovação humana central,
#                    operador aprovado/aceite, licença BANZA, "Clientes e Comerciantes" as a layer,
#                    the legacy operator repo brand, readiness. A clear NEGATION ("não certifica", "sem
#                    BANZA CA", "não por
#                    aprovação humana", "não é um certificado de produção") is allowed — naming an edge is
#                    how the active model states its own boundary.
#
# The VISUAL guarantees (no overlapping/clipped text, no overflow, arrows not crossing text) are proven by
# the phase's browser rendering QA — a text linter cannot compute pixel geometry. This guard is the
# structural/semantic authority; reference-svg-check owns "referenced ⇒ served".
#
# Scope: official diagram SVGs under
#   website/public/diagrams/**   docs/reference/diagrams/**   docs/diagrams/**
# Status badges under conformance/badges/** are a distinct artifact class (small shields, not diagrams):
# exempt from the structure rules, but still checked for pure-vector and forbidden terms.
# docs/images/** legacy architecture sketches (monospace, pre-date the diagram system, registry-cataloged
# only, not website-served, verified pure-vector in the M2.7E audit) are OUT of scope — not official diagrams.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."

# Pin a UTF-8 locale so the literal multibyte "não" / "ç" match under BSD grep.
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

FONT_FLOOR=8            # px — smallest allowed meaningful text
fail=0

DIAGRAM_DIRS=(website/public/diagrams docs/reference/diagrams docs/diagrams)
BADGE_DIR="conformance/badges"

# ── Forbidden ASSERTED terms (case-insensitive). A negation cue before the match makes it acceptable. ──
# Milestone codes: the standalone roadmap was retired (PR #342) and the final transversal sweep removed
# "produção depende de M2/M3" from every served diagram — production gating is expressed as the real
# technical condition (root-key ceremony / first production conformance evidence), so M-code milestone
# language is forbidden in served diagrams. The forbidden roadmap milestone "Operador Certificado" is
# caught by the operator-certificate terms below. "production_certificates" (the state flag) is not "certificados de produção".
# The legacy operator repo brand is assembled from parts (exactly as the identity guard does) so this
# guard file is not itself flagged by make identity-check.
_LEGACY_BRAND="banza""mi"
FORBIDDEN="BANZA CA|certificado de operador|operador certificado|certificado BANZA|certificados? de produção|certificação|autoridade certificadora|certificadora|aprovação humana|operador aprovado|operador aceite|licença BANZA|Clientes e Comerciantes|${_LEGACY_BRAND}|readiness|certificate authority|operator certificates?|operator certs|certified operator|certification (criteria|pipeline|path|as a)|human approval|M[0-9]/M[0-9]|dependem? de M[0-9]|marcos? M[0-9]"

# Negation cues that, appearing before a forbidden term (same <text>/line), make it an allowed edge-naming.
NEG_BEFORE='não|nao|nunca|never|\bnot\b|\bnem\b|\bsem\b|without|nenhum|nenhuma|ninguém|ninguem|jamais|there is no|there are no|não há|nao ha|removid|removed|deprecat|depreciad|obsolet|já não|ja nao|deixou de|em vez de|instead of|rather than|ao contrário|ao contrario|substitui|intentionally empty|would sit|would be|marked absent|no human'

# Canonical L2 vocabulary (M2.19D / ADR-034): after the three-layer model, the word "Certificação" is
# active, correct language when it QUALIFIES the per-implementation technical certification —
# "Certificação técnica" or "Certificação de Conformidade e Interoperabilidade" (the canonical L2 name,
# used verbatim in BANZA_REFERENCIA.md §4 and asserted-present by the website surface tests). Only a BARE
# standalone "Certificação" reads as the retired operator credential and stays forbidden. This mirrors the
# rule in website/lib/publicSurface.test.ts. The specific removed operator-cert phrases (certificado de
# operador, operador certificado, autoridade certificadora, certificado BANZA, …) stay forbidden above.
CERT_CANONICAL='certificação[[:space:]]+(técnica|de[[:space:]]+conformidade)'

# ── helpers ───────────────────────────────────────────────────────────────────────────────────────────
report() { printf "  ✗  %-64s %s\n" "$1" "$2" >&2; fail=1; }

check_structure() { # $1=file
  local f="$1"
  grep -q 'viewBox' "$f"   || report "$f" "missing viewBox"
  grep -q '<title'  "$f"   || report "$f" "missing <title>"
  grep -q '<desc'   "$f"   || report "$f" "missing <desc>"
}

check_purevector() { # $1=file
  local f="$1"
  if grep -qiE 'data:image|base64|<image' "$f"; then
    report "$f" "raster/embedded image content (must be pure vector)"
  fi
  # external RESOURCE reference: a remote URL in a fetch attribute (href/src/xlink:href) or url()/link/@import.
  # Example URLs shown as <text> content (e.g. "https://operator-a.example/...") are legitimate and ignored.
  if grep -oiE '(href|src|xlink:href)[[:space:]]*=[[:space:]]*"[^"]*https?://[^"]*"' "$f" \
       | grep -qivE 'www\.w3\.org'; then
    report "$f" "external resource reference (href/src to a remote URL — must be self-contained)"
  fi
  if grep -qiE 'url\([[:space:]]*['"'"'"]?https?://|<link[[:space:]]|@import' "$f"; then
    report "$f" "external stylesheet/font/@import reference (must be self-contained)"
  fi
}

check_fonts() { # $1=file
  local f="$1" tiny
  tiny=$(grep -oE 'font-size[:=]"?[0-9.]+' "$f" | grep -oE '[0-9.]+$' \
         | awk -v fl="$FONT_FLOOR" '($1+0)>0 && ($1+0)<fl {print $1}' | sort -un | head -3 | tr '\n' ' ')
  [ -z "$tiny" ] || report "$f" "text below ${FONT_FLOOR}px floor: ${tiny}"
  grep -q 'textLength' "$f" && report "$f" "textLength (forced text compression not allowed)" || true
}

check_semantics() { # $1=file
  local f="$1" line term ok
  # scan line by line; a forbidden term is a violation unless a negation cue precedes it on the same line
  while IFS= read -r line || [ -n "$line" ]; do
    echo "$line" | grep -qiE "$FORBIDDEN" || continue
    # allow if the line carries a negation cue before/around the term
    if echo "$line" | grep -qiE "$NEG_BEFORE"; then continue; fi
    term=$(echo "$line" | grep -oiE "$FORBIDDEN" | head -1)
    # allow the canonical qualified L2 vocabulary: a bare "certificação" match is legitimate when the
    # line qualifies it as "Certificação técnica" / "Certificação de Conformidade …" (see CERT_CANONICAL).
    if echo "$term" | grep -qiE '^certificação$' && echo "$line" | grep -qiE "$CERT_CANONICAL"; then continue; fi
    report "$f" "asserted removed-model term: \"$term\""
  done < "$f"
}

audit_diagram() { # $1=file
  check_structure "$1"; check_purevector "$1"; check_fonts "$1"; check_semantics "$1"
}
audit_badge() {   # $1=file — structure-exempt
  check_purevector "$1"; check_semantics "$1"
}

# ── self-test (runs first; probes the detection path on synthetic fixtures) ─────────────────────────────
selftest() {
  local d st=0
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  local good='<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t d"><title id="t">BanzAI Workbench</title><desc id="d">Trust Engine e Public Protocol Registry; o Workbench não certifica.</desc><text font-size="10">Public Protocol Registry</text></svg>'
  # must PASS
  printf '%s' "$good" > "$d/good.svg"
  fail=0; audit_diagram "$d/good.svg"; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: valid diagram wrongly flagged"; st=1; }
  # must FAIL: BANZA CA asserted
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>x</title><desc>d</desc><text font-size="10">Emitido pela BANZA CA</text></svg>' > "$d/ca.svg"; audit_diagram "$d/ca.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: BANZA CA not caught"; st=1; }
  # must FAIL: operador certificado asserted
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>x</title><desc>d</desc><text font-size="10">Estado: operador certificado</text></svg>' > "$d/oc.svg"; audit_diagram "$d/oc.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: operador certificado not caught"; st=1; }
  # must FAIL: raster
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>x</title><desc>d</desc><image href="data:image/png;base64,AAAA"/></svg>' > "$d/r.svg"; audit_diagram "$d/r.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: raster/base64 not caught"; st=1; }
  # must FAIL: no title
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><desc>d</desc><text font-size="10">ok</text></svg>' > "$d/nt.svg"; audit_diagram "$d/nt.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: missing title not caught"; st=1; }
  # must FAIL: no desc
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><text font-size="10">ok</text></svg>' > "$d/nd.svg"; audit_diagram "$d/nd.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: missing desc not caught"; st=1; }
  # must FAIL: tiny font
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="6">tiny</text></svg>' > "$d/tf.svg"; audit_diagram "$d/tf.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: tiny font not caught"; st=1; }
  # must FAIL: Clientes e Comerciantes layer
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">Camada: Clientes e Comerciantes</text></svg>' > "$d/cc.svg"; audit_diagram "$d/cc.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: Clientes e Comerciantes not caught"; st=1; }
  # must PASS: negated certificate mention
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">Evidência de conformidade, não é um certificado de produção.</text></svg>' > "$d/neg.svg"; audit_diagram "$d/neg.svg"; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: negated certificate wrongly flagged"; st=1; }
  # must PASS: canonical qualified L2 name (Certificação de Conformidade e Interoperabilidade)
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">L2 · Certificação de Conformidade e Interoperabilidade</text></svg>' > "$d/certl2.svg"; audit_diagram "$d/certl2.svg"; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: canonical L2 certification name wrongly flagged"; st=1; }
  # must PASS: canonical qualified "Certificação técnica"
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">Certificação técnica ≠ admissão a esquema</text></svg>' > "$d/certtec.svg"; audit_diagram "$d/certtec.svg"; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: Certificação técnica wrongly flagged"; st=1; }
  # must FAIL: bare standalone "Certificação" (retired operator-credential sense)
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">Estado: Certificação obtida</text></svg>' > "$d/bare.svg"; audit_diagram "$d/bare.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: bare Certificação not caught"; st=1; }
  # must PASS: example URL in <text> content (not a resource reference)
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">GET https://operator-a.example/.well-known/banza/manifest.json</text></svg>' > "$d/txturl.svg"; audit_diagram "$d/txturl.svg"; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: example URL in text wrongly flagged"; st=1; }
  # must FAIL: external resource reference in an href attribute
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><image href="https://cdn.example/logo.png"/></svg>' > "$d/exturl.svg"; audit_diagram "$d/exturl.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: external href resource not caught"; st=1; }
  # must FAIL: English asserted term (certificate authority)
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">Root is a certificate authority</text></svg>' > "$d/en.svg"; audit_diagram "$d/en.svg"; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: EN certificate authority not caught"; st=1; }
  # must PASS: English negated term (without a certificate authority)
  fail=0; printf '%s' '<svg viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><title>t</title><desc>d</desc><text font-size="10">Trust flows without a certificate authority</text></svg>' > "$d/enneg.svg"; audit_diagram "$d/enneg.svg"; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: EN negated certificate authority wrongly flagged"; st=1; }
  return $st
}

# run the self-test with fixture ✗ lines (stderr) suppressed; real SELFTEST_FAIL messages go to stdout
if ! selftest 2>/dev/null; then echo "svg-visual-quality: guard self-test FAILED"; exit 2; fi
fail=0

printf "\n══════════════════════════════════════════════════════════════════════\n"
printf "BANZA SVG Visual-Quality Guard (M2.7E)\n"
printf "══════════════════════════════════════════════════════════════════════\n"

n=0
for dir in "${DIAGRAM_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  while IFS= read -r f; do
    n=$((n+1)); audit_diagram "$f"
  done < <(find "$dir" -name '*.svg' | sort)
done
if [ -d "$BADGE_DIR" ]; then
  while IFS= read -r f; do n=$((n+1)); audit_badge "$f"; done < <(find "$BADGE_DIR" -name '*.svg' | sort)
fi

printf "Diagrams + badges scanned: %d\n" "$n"
if [ "$fail" -eq 0 ]; then
  printf "Result: ✓ all official SVGs pass structure + pure-vector + legibility + semantics\n\n"
else
  printf "\nResult: ✗ one or more official SVGs violate the SVG quality policy (docs/governance/SVG_QUALITY_POLICY.md)\n\n" >&2
  exit 1
fi
