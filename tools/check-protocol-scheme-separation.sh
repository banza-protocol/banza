#!/usr/bin/env bash
#
# BANZA Protocol/Scheme Separation Guard (M2.19C, ADR-059 D-059-07 / ADR-060 D-060-02/03).
#
# The protocol (L1) and certification (L2) are operator-neutral and are NOT the Banzami Operational Scheme
# (L3). This guard keeps that separation stated and unconflated:
#   - BANZA ≠ Banzami is stated on the canonical surfaces;
#   - certification is described as NON-EXCLUSIVE to the scheme (an implementation may be certified without
#     scheme admission; other legally-eligible entities may run independent schemes);
#   - no surface conflates the two ("BANZA = Banzami", "BANZA is the scheme").
#
# Negations, prohibitions and the "≠" form (which is not "=") are allowed; the boundary scan clears any hit
# whose 3-line context carries a negation.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

TLA="docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md"
BOS="docs/governance/BANZAMI_OPERATIONAL_SCHEME.md"
ADR059="decisions/adr/ADR-059-three-layer-institutional-architecture.md"
ADR060="decisions/adr/ADR-060-banzami-operational-scheme.md"

fail=0

# Conflation claims (literal "="; the canonical docs use "≠", a different codepoint that does not match).
FORBID=(
  'banza[[:space:]]*=[[:space:]]*banzami'
  'banzami[[:space:]]*=[[:space:]]*banza'
  'banza (é|e|is)[^.]{0,12}(a |o |the )?banzami\b'
  'banza (é|is)[^.]{0,15}(o |the )?(banzami operational )?scheme\b'
  'banza[^.]{0,12}(é|is) (o |the )?scheme\b'
)
# Descriptive/hazard/hypothetical idioms are added because the policy docs necessarily DESCRIBE the
# forbidden conflation in order to prohibit it (e.g. "A reader concluding \"BANZA = Banzami…\"").
WIN_NEG='não|nao|NÃO|nunca|never|nenhum|\bnot\b|\bnem\b|neither|nor|\bsem\b|does not|doesn'"'"'?t|isn'"'"'?t|≠|!=|distinct|separad|separate|diferente|neutro|neutra|proibid|forbidden|evitar|avoid|exemplo|example|«|»|concluding|losing both|brand collapse|would give|would result|must fail|must not|risk|hazard|^[[:space:]]*[-*|][[:space:]]*que\b|\?'

SURFACES=(website/content website/app website/components docs/reference README.md docs/governance decisions/adr)

need()  { if [ -f "$1" ] && grep -qiF "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected \"$2\" in $1"; fail=1; fi; }
needE() { if [ -f "$1" ] && grep -qiE "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected /$2/ in $1"; fail=1; fi; }

# ── Self-test: prove the conflation detector fires and the "≠" / negation forms are cleared ──────────
st=0
BAD='BANZA = Banzami e BANZA is the scheme.'
hit=0; for p in "${FORBID[@]}"; do echo "$BAD" | grep -qiE "$p" && hit=1; done
[ "$hit" -eq 1 ] || { echo "SELF-TEST BROKEN: conflation not detected" >&2; st=1; }
echo 'BANZA ≠ Banzami' | grep -qiE 'banza[[:space:]]*=[[:space:]]*banzami' && { echo "SELF-TEST BROKEN: '≠' wrongly matched the '=' conflation pattern" >&2; st=1; }
echo 'BANZA ≠ Banzami' | grep -qiE "$WIN_NEG" || { echo "SELF-TEST BROKEN: '≠' not recognised as a separation marker" >&2; st=1; }
echo "$BAD" | grep -qiE "$WIN_NEG" && { echo "SELF-TEST BROKEN: bad line wrongly carries a negation marker" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "protocol-scheme-separation: guard self-test FAILED"; exit 2; }

# ── [1/3] BANZA ≠ Banzami stated ────────────────────────────────────────────────────────────────────
echo "== [1/3] BANZA ≠ Banzami stated on the canonical surfaces =="
need "$TLA"    'banza ≠ banzami' 'TLA states BANZA ≠ Banzami'
need "$BOS"    'banza ≠ banzami' 'BOS states BANZA ≠ Banzami'
need "$ADR060" 'banza ≠ banzami' 'ADR-060 states BANZA ≠ Banzami'

# ── [2/3] certification described as non-exclusive to the scheme ─────────────────────────────────────
echo "== [2/3] certification is NON-EXCLUSIVE to the scheme =="
needE "$TLA"    'não é exclusiva'              'TLA: certification not exclusive to the Banzami scheme'
needE "$BOS"    'não exclusiva'               'BOS: certification not exclusive to the scheme'
needE "$ADR059" 'not exclusive|non-exclusive' 'ADR-059: certification not exclusive to the scheme'
needE "$ADR060" 'not exclusive|non-exclusive' 'ADR-060: certification not exclusive to the scheme'

# ── [3/3] no surface conflates BANZA with Banzami / the scheme ───────────────────────────────────────
echo "== [3/3] no BANZA = Banzami / BANZA is the scheme conflation =="
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
      echo "FAIL  protocol/scheme conflation matching /$pat/:"
      echo "    $f:$ln:$rest"
      viol=1; fail=1
    done < <(grep -niE "$pat" "$f" 2>/dev/null || true)
  done
done
[ "$viol" -eq 0 ] && echo "PASS  BANZA is never conflated with Banzami or the scheme on any scanned surface"

if [ "$fail" -ne 0 ]; then
  echo
  echo "protocol-scheme-separation: FAIL — see ADR-059 D-059-07 / ADR-060 and docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md."
  exit 1
fi
echo
echo "protocol-scheme-separation: ✓ BANZA ≠ Banzami; certification non-exclusive; no protocol/scheme conflation (M2.19C / ADR-059/060)"
