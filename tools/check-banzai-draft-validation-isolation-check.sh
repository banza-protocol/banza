#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §4.5/§17) — developer draft tool isolation guard (§37, invariant 5).
#
# DraftValidationTool is the ONLY place upload/paste live. It must be fully isolated from the official
# journey: it emits DRAFT_VALIDATION_RESULT, carries the "Rascunho local · não publicado · não produz
# evidência oficial" banner, lives under Programadores → Ferramentas, imports NOTHING from the validation
# session (validationJourney / banzaiValidateClient / banzaiValidation / BanzaiValidationMode), and never
# yields a VERIFIED verdict, Certification Readiness, or an official OperationReceipt.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

# Block E2 moved these sentences into the bilingual catalogues, so grepping the module or the component
# for them stopped proving anything. They are read from the resolved copy instead, which also makes the
# English clause expressible — a guard grepping a Portuguese literal never could.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

DRAFT=website/components/banzai/DraftValidationTool.tsx
PROG=website/components/banzai/ProgramadoresTools.tsx

echo "== banzai-draft-validation-isolation-check (M2.19G.1 / ADR-034 §4.5/§17) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'import { useValidationSession } from "@/components/banzai/validationJourney";' \
  | grep -qE 'validationJourney|banzaiValidateClient|BanzaiValidationMode' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$DRAFT" ] && ok "DraftValidationTool exists" || fl "$DRAFT not found"

if [ -f "$DRAFT" ]; then
  # 1. Emits DRAFT_VALIDATION_RESULT.
  grep -qE 'DRAFT_VALIDATION_RESULT' "$DRAFT" && ok "emits DRAFT_VALIDATION_RESULT" || fl "$DRAFT must emit DRAFT_VALIDATION_RESULT"

  # 2. Carries the non-authoritative banner (from DRAFT_COPY.banner).
  grep -qE '"draft\.banner"|DRAFT_COPY\.banner' "$DRAFT" && ok "renders the draft banner" || fl "$DRAFT must render the draft banner"
  copy_id_is agent draft.banner pt "Rascunho local · não publicado · não produz evidência oficial" \
    && ok 'banner copy is "Rascunho local · não publicado · não produz evidência oficial"' \
    || fl 'DRAFT_COPY.banner must be "Rascunho local · não publicado · não produz evidência oficial"'

  # 3. Imports NOTHING from the validation session / official client.
  leak=$(grep -nE 'from "@?/?(components/banzai/)?(validationJourney|BanzaiValidationMode)"|from "@?/?(lib/)?(banzaiValidateClient|banzaiValidation)"' "$DRAFT" || true)
  if [ -z "$leak" ]; then
    ok "imports nothing from the validation session / official client"
  else
    fl "$DRAFT must not import the validation session / official client:"; printf '%s\n' "$leak" | sed 's/^/      /'
  fi

  # 4. Never yields VERIFIED / Certification Readiness / official receipt. Negation copy (the disclaimer
  #    "nunca devolve VERIFIED nem Prontidão…") is allowed; a real verdict/receipt token is not.
  bad=$(grep -nE 'status:[[:space:]]*"VERIFIED"|ServerOperationReceipt|buildReceipt|certification_readiness|certificationReadiness' "$DRAFT" \
        | grep -viE 'nunca devolve|não produz|não avança' || true)
  if [ -z "$bad" ]; then
    ok "never authors VERIFIED / Certification Readiness / official receipt"
  else
    fl "$DRAFT must never author a VERIFIED verdict / readiness / official receipt:"; printf '%s\n' "$bad" | sed 's/^/      /'
  fi
fi

# 5. Lives under Programadores → Ferramentas.
if [ -f "$PROG" ]; then
  grep -qE 'import .*DraftValidationTool' "$PROG" && ok "ProgramadoresTools imports DraftValidationTool" || fl "$PROG must import DraftValidationTool"
  grep -qE '<DraftValidationTool' "$PROG"         && ok "ProgramadoresTools renders DraftValidationTool" || fl "$PROG must render <DraftValidationTool/>"
  grep -qiE 'FERRAMENTAS' "$PROG"                 && ok "rendered under a FERRAMENTAS section" || fl "$PROG must place the draft tool under a Ferramentas section"
else
  fl "$PROG not found"
fi

# 6. M2.19G.5C (ADR-036) — complementary to the SimB retirement: SimB survives ONLY inside the isolated
# draft-validation lib (banzaSimb.ts) + the frozen crate + history; it must NOT leak onto the active agent
# surface. The full active-surface sweep lives in check-banzai-simb-active-surface-clean.sh; here we assert
# the two adjacent active surfaces stay SimB-free after the retirement.
for f in website/components/banzai/banzai-agent.ts website/components/banzai/validationJourney.tsx; do
  [ -f "$f" ] || continue
  if grep -qE 'SimB|banza-simb' "$f"; then fl "SimB leaked onto an active surface: $f (ADR-036)"; else ok "$f is SimB-free (ADR-036)"; fi
done

echo
if [ "$fail" -ne 0 ]; then echo "banzai-draft-validation-isolation-check: FAIL"; exit 1; fi
echo "banzai-draft-validation-isolation-check: ✓ draft tool isolated, non-authoritative (ADR-034 §4.5/§17)"
