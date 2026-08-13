#!/usr/bin/env bash
#
# BANZA Conflict-of-Interest Guard (M2.19C, ADR-007 / ADR-006 D-060-05 / ADR-003 D-059-06).
#
# Because BANZA's creator (Banzami) is also the first scheme operator, the conflict of interest is
# controlled STRUCTURALLY, not by promise. This guard keeps the structural controls documented:
#   - docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md + BANZA_SEPARATION_MATRIX.md present;
#   - the same-suite / same-engine / no-bypass controls are stated, and the seven no-self-privilege
#     prohibitions (no reduced profile / private certification / bypass / reserved endpoint / publication
#     without evidence / FAIL→PASS override / secret exception) are all present;
#   - the key-separation table lists the eight cryptographic key domains (K1..K8), never reused across
#     domains.
# It also fails if any surface AFFIRMS a self-privilege for Banzami (negations/prohibitions allowed).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

COI="docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md"
SEP="docs/governance/BANZA_SEPARATION_MATRIX.md"
ADR063="decisions/adr/ADR-007-conflict-of-interest-and-domain-separation.md"

fail=0

# An AFFIRMED self-privilege for Banzami, distance-bounded (PT + EN). The docs phrase these as "No …" /
# "não obtém …", cleared by the context-window negation filter.
FORBID=(
  'banzami[^.]{0,40}(perfil reduzido|reduced profile|certificação privada|private certification|bypass|endpoint reservado|reserved endpoint|fail→pass|fail->pass|excepção secreta|secret exception)'
)
# Descriptive/hazard/hypothetical idioms are added because the policy DESCRIBES a forbidden self-privilege
# in order to prohibit it (e.g. "A change that would give Banzami … a reduced profile … must fail these
# checks and must not be merged").
WIN_NEG='não|nao|NÃO|nunca|never|nenhum|\bno\b|\bnot\b|\bnem\b|neither|nor|\bsem\b|without|does not|doesn'"'"'?t|isn'"'"'?t|prohibit|proibid|forbidden|evitar|avoid|exemplo|example|«|»|would give|would result|must fail|must not|risk|hazard|^[[:space:]]*[-*|][[:space:]]*que\b|\?'

SURFACES=(website/content website/app website/components docs/reference README.md docs/governance decisions/adr)

need()  { if [ -f "$1" ] && grep -qiF "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected \"$2\" in $1"; fail=1; fi; }
needE() { if [ -f "$1" ] && grep -qiE "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected /$2/ in $1"; fail=1; fi; }

# ── Self-test: prove the self-privilege detector fires and a negated prohibition is cleared ──────────
st=0
BAD='A Banzami obtém um perfil reduzido e uma certificação privada com bypass.'
GOOD='A Banzami não obtém perfil reduzido, certificação privada nem bypass.'
echo "$BAD"  | grep -qiE "${FORBID[0]}" || { echo "SELF-TEST BROKEN: self-privilege not detected" >&2; st=1; }
echo "$BAD"  | grep -qiE "$WIN_NEG" && { echo "SELF-TEST BROKEN: bad line wrongly carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$WIN_NEG" || { echo "SELF-TEST BROKEN: negated prohibition not recognised" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "conflict-of-interest: guard self-test FAILED"; exit 2; }

# ── [1/4] required documents present ─────────────────────────────────────────────────────────────────
echo "== [1/4] conflict-of-interest policy + separation matrix present =="
for f in "$COI" "$SEP" "$ADR063"; do
  if [ -f "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing required document: $f"; fail=1; fi
done

# ── [2/4] same-suite / same-engine / no-bypass controls documented ───────────────────────────────────
echo "== [2/4] same-suite / same-engine / no-bypass controls documented (COI) =="
need  "$COI" 'same conformance and interoperability' 'COI: same conformance + interoperability suites'
need  "$COI" 'same Rust engine'                      'COI: same Rust engine'
need  "$COI" 'same reason codes'                     'COI: same reason codes'
need  "$COI" 'No bypass'                             'COI: no bypass; Rust decides'
needE "$COI" 'independent verification|independently verifiable|verificável por qualquer terceiro' 'COI: independently verifiable by third parties'

# ── [3/4] the seven no-self-privilege prohibitions are all present ───────────────────────────────────
echo "== [3/4] the seven no-self-privilege prohibitions (COI §3) =="
need "$COI" 'No reduced profile'             'prohibition: no reduced profile'
need "$COI" 'No private certification'       'prohibition: no private certification'
need "$COI" 'No bypass'                      'prohibition: no bypass'
need "$COI" 'No reserved endpoint'           'prohibition: no reserved endpoint'
need "$COI" 'No publication without evidence' 'prohibition: no publication without evidence'
need "$COI" 'No FAIL→PASS override'          'prohibition: no FAIL→PASS override'
need "$COI" 'No secret exception'            'prohibition: no secret exception'

# ── [4/4] key-separation table with the eight key domains (K1..K8) ───────────────────────────────────
echo "== [4/4] key-separation table: eight key domains K1..K8, never reused =="
needE "$SEP" 'eight'          'SEP: eight cryptographic key domains'
needE "$SEP" 'never (reused|shared)' 'SEP: keys never reused/shared across domains'
need  "$SEP" 'Protocol Metadata Signing Key'   'SEP: K1 Protocol Metadata Signing Key'
need  "$SEP" 'Certification Registry Signing Key' 'SEP: K2 Certification Registry Signing Key'
need  "$SEP" 'Certification Record Signing Key'   'SEP: K3 Certification Record Signing Key'
need  "$SEP" 'BanzAI Service Keys'                'SEP: K4 BanzAI Service Keys'
need  "$SEP" 'Banzami Scheme Administrative Key'  'SEP: K5 Banzami Scheme Administrative Key'
need  "$SEP" 'Banzami Scheme Operational Keys'    'SEP: K6 Banzami Scheme Operational Keys'
need  "$SEP" 'Operator Implementation Keys'       'SEP: K7 Operator Implementation Keys'
needE "$SEP" 'future settlement keys'             'SEP: K8 future settlement keys'
missingk=0
for i in 1 2 3 4 5 6 7 8; do
  grep -qiE "\**K$i\**" "$SEP" 2>/dev/null || { echo "FAIL  key domain K$i not present in $SEP"; missingk=1; fail=1; }
done
[ "$missingk" -eq 0 ] && echo "PASS  all eight key domains K1..K8 present"

# ── boundary: no surface AFFIRMS a self-privilege for Banzami ────────────────────────────────────────
echo "== boundary: no surface affirms a self-privilege for Banzami =="
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
      echo "FAIL  affirmed self-privilege for Banzami matching /$pat/:"
      echo "    $f:$ln:$rest"
      viol=1; fail=1
    done < <(grep -niE "$pat" "$f" 2>/dev/null || true)
  done
done
[ "$viol" -eq 0 ] && echo "PASS  no surface affirms a reduced profile / private path / bypass / secret exception for Banzami"

if [ "$fail" -ne 0 ]; then
  echo
  echo "conflict-of-interest: FAIL — see ADR-007 and docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md."
  exit 1
fi
echo
echo "conflict-of-interest: ✓ same suite/engine/reason-codes; seven no-self-privilege prohibitions; eight separated key domains (M2.19C / ADR-007)"
