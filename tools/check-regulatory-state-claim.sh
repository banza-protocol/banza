#!/usr/bin/env bash
#
# BANZA Regulatory-State Claim Guard (M2.19C, ADR-005 / ADR-006 D-060-08).
#
# While no applicable formal evidence exists, Banzami's regulatory state is
# REGULATORY_AUTHORIZATION_IN_PROGRESS: a PREPARATION state that grants nothing. No public/governance
# surface may present the designated operator / operational layer as already authorised / BNA-approved /
# licensed / recognised. The only sanctioned public status sentence is the prudent phrasing:
#   "A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem desactivados."
#
# This guard (a) asserts the prudent phrasing + REGULATORY_AUTHORIZATION_IN_PROGRESS are present in the
# canonical policy, and (b) forbids affirmative authorisation/BNA-approval/licence language on the scanned
# surfaces. Negations, prohibitions and "does-NOT-mean" enumerations are allowed — the policy states these
# things in the negative, so the boundary scan clears any hit whose 3-line context carries a negation, a
# prohibition, a guillemet «avoid» example or a "- que …" enumeration bullet.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

RCP="docs/governance/BANZA_REGULATORY_CLAIM_POLICY.md"
BOS="docs/governance/BANZAMI_OPERATIONAL_SCHEME.md"
ADR062="decisions/adr/ADR-005-regulatory-state-boundary-and-the-real-money-activation-gate.md"

fail=0

# Forbidden affirmative regulatory-state claims. The licence claim is anchored to the designated operator /
# operational layer / scheme so a truthful mention of THIRD-PARTY licensed banks is not a false positive.
LICSUBJ='(banzami|operadora?|operadores|a camada operacional|o scheme|operational scheme|participante)'
FORBID=(
  'autoriza(do|ção) (concedida|pelo bna)'
  'aprova(do|ção) do bna'
  'bna[- ]approved'
  "${LICSUBJ}[^.]{0,30}licenciad"
  'licenciad[oa]s?[^.]{0,30}(pelo bna|pela banza|pelo regulador)'
  'banzami[^.]{0,25}(já )?(está|é|foi)[^.]{0,15}(autorizad|licenciad|aprovad)'
)

# Negation / prohibition / enumeration markers, tested against the hit's 3-line CONTEXT window (so a
# negation that wraps onto the preceding line, or a "NÃO significa" section header above a bullet, clears
# the hit). Applied to clean file content, so ^-anchored bullet markers work.
# (grep -i does not case-fold the multibyte "ã"↔"Ã" under a C locale, so both cases are listed.)
WIN_NEG='não|nao|NÃO|nunca|never|nenhum|\bnot\b|\bnem\b|neither|nor|\bsem\b|does not|doesn'"'"'?t|isn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|em processo|preparação|pendente|condicionad|não é|não existe|não significa|significa:|^[[:space:]]*[-*|][[:space:]]*que\b|^[[:space:]]*[-*|][[:space:]]*that\b|\?'

# Public-rendered + M2.19C canonical governance/ADR surfaces. banzai-agent.ts lists forbidden phrases
# verbatim; tests too. check-regulatory-claims.sh remains the sibling public-rendered PSP/licence guard.
SURFACES=(website/content website/app website/components docs/reference README.md docs/governance decisions/adr)

need() { # file needle label  (fixed-string presence)
  if [ -f "$1" ] && grep -qiF "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected \"$2\" in $1"; fail=1; fi
}
needE() { # file regex label
  if [ -f "$1" ] && grep -qiE "$2" "$1"; then echo "PASS  $3"; else echo "FAIL  $3 — expected /$2/ in $1"; fail=1; fi
}

# ── Self-test: prove the forbidden detector fires on a bad claim and the window-negation clears one ──
st=0
BAD='A Banzami já está licenciada e aprovada pelo BNA.'
hit_bad=0; for p in "${FORBID[@]}"; do echo "$BAD" | grep -qiE "$p" && hit_bad=1; done
[ "$hit_bad" -eq 1 ] || { echo "SELF-TEST BROKEN: forbidden regulatory claim not detected" >&2; st=1; }
echo "$BAD" | grep -qiE "$WIN_NEG" && { echo "SELF-TEST BROKEN: bad claim wrongly carries a negation marker" >&2; st=1; }
printf '%s\n%s\n' 'REGULATORY_AUTHORIZATION_IN_PROGRESS não significa autorização' 'concedida, aprovação do BNA, licença concluída' | grep -qiE "$WIN_NEG" || { echo "SELF-TEST BROKEN: window negation not detected" >&2; st=1; }
printf '%s\n' '- que existe aprovação do BNA ou de qualquer regulador;' | grep -qiE "$WIN_NEG" || { echo "SELF-TEST BROKEN: enumeration bullet not allowed" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "regulatory-state-claim: guard self-test FAILED"; exit 2; }

# ── [1/3] required canonical documents present ─────────────────────────────────────────────────────
echo "== [1/3] regulatory-claim policy + regulatory-state boundary present =="
for f in "$RCP" "$BOS" "$ADR062"; do
  if [ -f "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing required document: $f"; fail=1; fi
done

# ── [2/3] prudent phrasing + REGULATORY_AUTHORIZATION_IN_PROGRESS present ────────────────────────────
echo "== [2/3] prudent phrasing + in-progress state present =="
need  "$RCP"    'em preparação regulatória'            'RCP carries the prudent-phrasing (preparação regulatória)'
needE "$RCP"    'pagamentos reais permanecem'          'RCP carries the prudent-phrasing (pagamentos reais permanecem desactivados)'
need  "$RCP"    'REGULATORY_AUTHORIZATION_IN_PROGRESS' 'RCP names the in-progress state'
need  "$ADR062" 'em preparação regulatória'            'ADR-005 carries the prudent-phrasing'
need  "$ADR062" 'REGULATORY_AUTHORIZATION_IN_PROGRESS' 'ADR-005 names the in-progress state'
needE "$RCP"    'não[^.]{0,20}(autorizada|concedida|aprovaç|licenç)' 'RCP negates authorisation/approval/licence'

# ── [3/3] no surface claims the operator is already authorised/BNA-approved/licensed ─────────────────
echo "== [3/3] no surface claims the operator is already authorised/BNA-approved/licensed =="
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
      echo "FAIL  affirmative regulatory-state claim matching /$pat/:"
      echo "    $f:$ln:$rest"
      viol=1; fail=1
    done < <(grep -niE "$pat" "$f" 2>/dev/null || true)
  done
done
[ "$viol" -eq 0 ] && echo "PASS  no affirmative authorised/BNA-approved/licensed claim on any scanned surface"

if [ "$fail" -ne 0 ]; then
  echo
  echo "regulatory-state-claim: FAIL — see ADR-005 and docs/governance/BANZA_REGULATORY_CLAIM_POLICY.md."
  exit 1
fi
echo
echo "regulatory-state-claim: ✓ prudent phrasing + REGULATORY_AUTHORIZATION_IN_PROGRESS canonical; no already-authorised/BNA-approved/licensed claim (M2.19C / ADR-005)"
