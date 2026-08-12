#!/usr/bin/env bash
#
# BANZA Regulatory-Language Guard (BX1.8A).
#
# Scans the PUBLIC-RENDERED surfaces (website content/app/components + published reference docs) for
# affirmative regulatory claims that misposition BANZA as a payment service provider / licensed operator,
# and for "corpus"/"KB" in public UI. A line that clearly NEGATES or EXPLAINS the claim (não / never /
# nunca / sem / a question / an "avoid" example) is allowed — the boundary of the whole project is
# precisely to state these things in the negative.
#
# Canonical rule: BANZA é um protocolo aberto. O BANZA não presta serviços de pagamento, não processa
# transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
# operador que presta serviços financeiros reais usando o protocolo, não ao protocolo BANZA.
#
# Exit 1 on any NEEDS_FIX. `protocolo técnico` is reported as WARN only (does not fail).
# See docs/governance/BANZA_PROTOCOL_BOUNDARY.md and BANZA_REGULATORY_POSITIONING.md.

set -euo pipefail
cd "$(dirname "$0")/.."

# Public-rendered surfaces. The governance meta-docs (which enumerate forbidden phrases as "avoid"
# examples) and the tools/ guards themselves are intentionally out of scope.
SURFACES=(
  website/content
  website/app
  website/components
  docs/reference
  README.md
)

# Explanatory / example markers — a line carrying any of these is not an affirmative claim.
# NOTE: use the literal UTF-8 "não" (a bracket like [ãa] does not match the multibyte ã under grep -E).
NEG='não|nao|nunca|never|\bsem\b|evitar|avoid|deny|nenhum|\btest\b|disclaimer|\?|pendente|depende|quando|fora do protocolo|not a |example'

# Common exclusions: test files and banzai-agent.ts (whose FORBIDDEN_PHRASES lists the forbidden phrases
# verbatim; its real UI copy is guarded by components/banzai/workbench.test.ts).
GREP_EXCL=(--exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts' --exclude='banzai-agent.ts')

fail=0
warn=0

# ── Self-test (M2.0A): verify the identity-detection logic on every run. A known-bad phrase MUST be
#    detected as NEEDS_FIX; a known-good canonical phrase MUST NOT. Broken logic exits 2. ──
SPECIAL_RE='(não|nao) transformar (o )?banza em (operador financeiro|operador|psp|prestador)'
IDENTITY_RE='banza (pode|vai|poder[áa])[^.]{0,25}(ser|virar|tornar-se)[^.]{0,25}(operador|psp)'
st_fail=0
echo "não transformar BANZA em operador financeiro" | grep -qiE "$SPECIAL_RE" || { echo "SELFTEST_FAIL special rule did not detect the forbidden negation"; st_fail=1; }
echo "BANZA pode virar PSP" | grep -qiE "$IDENTITY_RE" || { echo "SELFTEST_FAIL identity rule did not detect 'BANZA pode virar PSP'"; st_fail=1; }
if echo "BANZA é um protocolo financeiro aberto." | grep -qiE "$SPECIAL_RE|$IDENTITY_RE"; then echo "SELFTEST_FAIL canonical phrase wrongly flagged"; st_fail=1; fi
if echo "operadores autorizados implementam o protocolo" | grep -qiE "$SPECIAL_RE|$IDENTITY_RE"; then echo "SELFTEST_FAIL operator phrase wrongly flagged"; st_fail=1; fi
# M2.4 — BANZA-as-certifying-authority tokens must be detected as an active claim, and a clause carrying
# a NEG marker must still be cleared by the HARD-loop line filter.
CERTAUTH_RE='\bca[_ ]signature\b|certificate[_ ]?url|certificate[_ ]?based[_ ]?trust|banza[^.]{0,30}emite[^.]{0,20}certificad'
echo "a ca signature da BANZA autoriza o operador" | grep -qiE "$CERTAUTH_RE" || { echo "SELFTEST_FAIL cert-authority rule missed 'ca signature'"; st_fail=1; }
echo '"certificate_url": "https://op/cert" no contrato de federação' | grep -qiE "$CERTAUTH_RE" || { echo "SELFTEST_FAIL cert-authority rule missed 'certificate_url'"; st_fail=1; }
echo "o modelo assenta em certificate_based_trust" | grep -qiE "$CERTAUTH_RE" || { echo "SELFTEST_FAIL cert-authority rule missed 'certificate_based_trust'"; st_fail=1; }
CA_NEGLINE="O BANZA não emite certificados de operador nem expõe certificate_url."
if echo "$CA_NEGLINE" | grep -qiE "$CERTAUTH_RE" && ! echo "$CA_NEGLINE" | grep -qiE "$NEG"; then echo "SELFTEST_FAIL cert-authority: negated boundary would be reported"; st_fail=1; fi
[ "$st_fail" -eq 0 ] || { echo "regulatory-claims: guard self-test FAILED"; exit 2; }

# ── Hard block: affirmative BANZA-as-PSP / needs-licence / processes-funds claims ──
HARD=(
  'banza (é|e|será|sera|precisa)[^.]{0,40}(psp|prestador de servi[çc]os de pagamento)'
  'banza[^.]{0,30}precisa de licen'
  'banza[^.]{0,30}precisa de autoriza'
  'banza[^.]{0,30}(processa|liquida) (os )?pagament'
  'banza[^.]{0,30}(movimenta|move|det[ée]m|gere) (os )?(fundos|saldos)'
  'banza[^.]{0,30}(opera|gere)[^.]{0,20}(sistema|rede) de pagament'
  'banza[^.]{0,30}autoriza[^.]{0,20}operador'
  'banza[^.]{0,30}emite[^.]{0,20}licen'
  'banza[^.]{0,30}aprovad[oa] pelo bna'
  'banza ca[^.]{0,30}(autoridade regulat|substitui[^.]{0,20}regulador)'
  'banzai (certifica|aprova)\b'
  # M2.4 — BANZA presented as a certifying authority: a CA signature, a certificate URL/endpoint, a
  # certificate-based trust model, or BANZA issuing a certificate. All absent from the surfaces today;
  # a genuine boundary line ("não emite certificado") is cleared by NEG. The pinned-false boundary flag
  # lives in the Rust trust adapter, which is not a scanned public surface.
  '\bca[_ ]signature\b'
  'certificate[_ ]?url'
  'certificate[_ ]?based[_ ]?trust'
  'banza[^.]{0,30}emite[^.]{0,20}certificad'
)
for pat in "${HARD[@]}"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | grep -viE "$NEG" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  affirmative regulatory claim matching /$pat/:"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Hard block: open-financial-protocol identity (M2.0A) — possibility-framing that misrepresents the
#    BANZA identity as something that could BECOME a financial operator / PSP, plus affirmative
#    "BANZA is an operator/PSP" claims. Negations/questions/examples are still allowed here (NEG),
#    EXCEPT the special phrase below. ──
IDENTITY=(
  'transformar (o )?banza em (operador|psp|prestador)'
  'banza (vira|virar|torna-se|tornar-se)[^.]{0,25}(operador financeiro|operador|psp)'
  'banza (pode|vai|poder[áa])[^.]{0,25}(ser|virar|tornar-se)[^.]{0,25}(operador|psp)'
  'banza como (operador financeiro|psp)'
  'banza (é|e) (um |o )?operador financeiro'
)
for pat in "${IDENTITY[@]}"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | grep -viE "$NEG" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  identity-misframing claim matching /$pat/ (BANZA is and remains an open financial protocol):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Special rule (M2.0A): the phrase "não transformar BANZA em operador financeiro / PSP" is ALWAYS
#    NEEDS_FIX — even though it is negated — because it suggests a possibility contrary to the permanent
#    identity of the project. Prefer "preservar a natureza do BANZA como protocolo financeiro aberto".
#    This check does NOT apply the NEG allowlist. ──
special="$(grep -rniE "${GREP_EXCL[@]}" '(não|nao) transformar (o )?banza em (operador financeiro|operador|psp|prestador)' "${SURFACES[@]}" 2>/dev/null || true)"
if [ -n "$special" ]; then
  echo "NEEDS_FIX  possibility-suggesting negation 'não transformar BANZA em operador/PSP' — affirm the permanent identity instead ('BANZA é e continuará a ser protocolo financeiro aberto'):"
  echo "$special" | sed 's/^/    /'
  fail=1
fi

# ── Hard block: "corpus" / public "KB" anywhere in public UI/content ──
for pat in '\bcorpus\b' '\bKB\b'; do
  hits="$(grep -rnE "${GREP_EXCL[@]}" "$pat" website/content website/app website/components 2>/dev/null | grep -viE 'CORPUS_HASH|load_corpus|toContain|//|/\*' || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  forbidden public token /$pat/ in UI/content:"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── WARN only: "protocolo técnico" as public phrasing ──
soft="$(grep -rniE 'protocolo t[ée]cnico' "${SURFACES[@]}" 2>/dev/null || true)"
if [ -n "$soft" ]; then
  echo "WARN  'protocolo técnico' found — prefer 'protocolo' / 'protocolo aberto' unless distinguishing from regulated financial activity:"
  echo "$soft" | sed 's/^/    /'
  warn=1
fi

if [ "$fail" -eq 0 ]; then
  if [ "$warn" -eq 0 ]; then
    echo "regulatory-claims: ✓ BANZA positioned as an open protocol; no PSP/licence/fund-movement claims; no public corpus/KB."
  else
    echo "regulatory-claims: ✓ no NEEDS_FIX (see WARN above)."
  fi
fi
exit "$fail"
