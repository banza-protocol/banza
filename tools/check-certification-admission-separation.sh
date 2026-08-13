#!/usr/bin/env bash
#
# BANZA Certification/Admission/Authorisation Separation Guard (M2.19C, ADR-004).
#
# The single most dangerous launch ambiguity is a technical PASS being read as a licence, or scheme
# membership as regulatory approval. ADR-004 makes the three determinations structurally independent:
#   Technical Certification (L2)  ≠  Scheme Admission (L3)  ≠  Regulatory Authorisation.
#
# This guard keeps ADR-004 present, keeps the three-way separation stated on the canonical surfaces
# (ADR-004 + BANZA_THREE_LAYER_ARCHITECTURE.md + ADR-003), and forbids any conflation
# ("certification = licence" / "certificação = licença" / "certification = admission"). The "≠" form is not
# "="; negations ("certification is NOT a licence") are allowed via the context-window filter.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

ADR061="decisions/adr/ADR-004-certification-admission-authorisation-separation.md"
TLA="docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md"
ADR059="decisions/adr/ADR-003-three-layer-institutional-architecture.md"

fail=0

# Conflation claims (literal "=" and "is/é/means a licence/admission/authorisation"). The canonical docs
# use "≠" and negations, cleared by the context window.
FORBID=(
  'certifica(ç|c)ão[[:space:]]*=[[:space:]]*licen'
  'certifica(ç|c)ão[[:space:]]*=[[:space:]]*admiss'
  'certification[[:space:]]*=[[:space:]]*licen'
  'certification[[:space:]]*=[[:space:]]*admission'
  'certification[^.]{0,12}(is|equals|means)[^.]{0,10}(a )?(licen|scheme admission|regulatory authoris)'
  'certifica(ç|c)ão[^.]{0,12}(é|equivale|significa)[^.]{0,10}(uma |a )?(licen|admiss|autoriza)'
)
WIN_NEG='não|nao|NÃO|nunca|never|nenhum|\bno\b|\bnot\b|\bnem\b|neither|nor|\bsem\b|without|does not|doesn'"'"'?t|isn'"'"'?t|≠|!=|distinct|separate|separad|distintas|prohibit|proibid|forbidden|evitar|avoid|exemplo|example|«|»|^[[:space:]]*[-*|][[:space:]]*que\b|\?'

SURFACES=(website/content website/app website/components docs/reference README.md docs/governance decisions/adr)

need()  { if [ -f "$1" ] && grep -qiF "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected \"$2\" in $1"; fail=1; fi; }
needE() { if [ -f "$1" ] && grep -qiE "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected /$2/ in $1"; fail=1; fi; }

# ── Self-test: prove the conflation detector fires and "≠"/negation forms are cleared ────────────────
st=0
BAD='Certificação = licença e certification = admission.'
hit=0; for p in "${FORBID[@]}"; do echo "$BAD" | grep -qiE "$p" && hit=1; done
[ "$hit" -eq 1 ] || { echo "SELF-TEST BROKEN: certification conflation not detected" >&2; st=1; }
echo 'Certificação técnica ≠ admissão ao scheme' | grep -qiE 'certifica(ç|c)ão[[:space:]]*=[[:space:]]*admiss' && { echo "SELF-TEST BROKEN: '≠' wrongly matched the '=' conflation pattern" >&2; st=1; }
echo 'A certificação NÃO é uma licença.' | grep -qiE "$WIN_NEG" || { echo "SELF-TEST BROKEN: negation not recognised" >&2; st=1; }
echo "$BAD" | grep -qiE "$WIN_NEG" && { echo "SELF-TEST BROKEN: bad line wrongly carries a negation marker" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "certification-admission-separation: guard self-test FAILED"; exit 2; }

# ── [1/3] ADR-004 present ────────────────────────────────────────────────────────────────────────────
echo "== [1/3] ADR-004 present =="
if [ -f "$ADR061" ]; then echo "PASS  $ADR061"; else echo "FAIL  missing required document: $ADR061"; fail=1; fi

# ── [2/3] the three-way separation stated on the canonical surfaces ──────────────────────────────────
echo "== [2/3] certification ≠ admission ≠ authorisation stated =="
needE "$ADR061" 'technical certification ≠ scheme admission ≠ regulatory authoris' 'ADR-004 EN triple separation'
needE "$ADR061" 'certifica(ç|c)ão técnica ≠ admiss.{0,30}≠ autoriza'               'ADR-004 PT triple separation'
needE "$TLA"    'certifica(ç|c)ão técnica ≠ admiss.{0,30}≠ autoriza'               'TLA triple separation (§8)'
needE "$ADR059" 'licen.{0,40}admission.{0,40}(authoris|authoriz)'                  'ADR-003 certification is not licence/admission/authorisation'

# ── [3/3] no surface conflates certification with a licence / admission / authorisation ──────────────
echo "== [3/3] no certification=licence / certification=admission conflation =="
FILES=()
while IFS= read -r f; do [ -n "$f" ] && FILES+=("$f"); done < <(git ls-files -- "${SURFACES[@]}" 2>/dev/null \
  | grep -vE 'banzai-agent\.ts|\.test\.(ts|tsx)$|\.spec\.ts$' || true)
viol=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  for pat in "${FORBID[@]}"; do
    while IFS=: read -r ln rest; do
      [ -n "$ln" ] || continue
      start=$(( ln > 3 ? ln - 3 : 1 )); end=$(( ln + 3 ))
      if sed -n "${start},${end}p" "$f" | grep -qiE "$WIN_NEG"; then continue; fi
      echo "FAIL  certification/admission/authorisation conflation matching /$pat/:"
      echo "    $f:$ln:$rest"
      viol=1; fail=1
    done < <(grep -niE "$pat" "$f" 2>/dev/null || true)
  done
done
[ "$viol" -eq 0 ] && echo "PASS  certification is never conflated with a licence, admission or authorisation"

if [ "$fail" -ne 0 ]; then
  echo
  echo "certification-admission-separation: FAIL — see ADR-004 and docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md."
  exit 1
fi
echo
echo "certification-admission-separation: ✓ certification ≠ admission ≠ authorisation stated; no conflation (M2.19C / ADR-004)"
