#!/usr/bin/env bash
#
# BANZA Conformance/Certification Boundary Guard (Ch07 "Conformidade e Certificação").
#
# Chapter 07 is where several near-synonyms must NOT collapse into one another. The canonical model
# (ADR-030 conformance levels · ADR-032 certification objects · ADR-032 closed state machine ·
# ADR-034/077 validation journey + readiness · ADR-005 non-propagation · ADR-025/079 trust, frozen)
# keeps them strictly separate. This guard keeps §7 of the Reference faithful to that boundary:
#
#   1. §7 is titled "Conformidade e Certificação".
#   2. Level vs certification distinctions: L0–L4 are conformance profiles ("perfis de conformidade"),
#      not architecture layers ("A letra «L» pertence aos perfis; nunca a uma camada.").
#   3. Validation ≠ certification ("Validar não é certificar").
#   4. Readiness ≠ certification: the readiness aggregate never returns CERTIFIED and the status stays
#      NOT_CERTIFIED; publishing evidence is not being certified.
#   5. The subject is an implementation, never a whole entity ("Não existe «operador certificado»").
#   6. No certificate authority: the record is authenticated by a reproducible hash + the deterministic
#      engine, never by a Trust-Root signature ("Não há autoridade certificadora"); the frozen trust
#      model is only referenced (root signs only the Key Manifest — Ch06).
#   7. Non-propagation: certificação técnica ≠ admissão a esquema ≠ autorização regulatória.
#   8. The closed certification state set is named (NOT_CERTIFIED … SUPERSEDED).
#
# This is NOT written to a regex: it asserts the canonical semantic boundary. The forbidden constructions
# are AFFIRMATIVE collapses that never appear in correct prose; "autoridade certificadora" is deliberately
# NOT forbidden because §7 uses it only in the negation "Não há autoridade certificadora".
# Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §7 (from "## 7. " up to the next "## 8. ").
section() { awk '/^## 7\. /{f=1} /^## 8\. /{f=0} f' "$1"; }

# Affirmative collapse constructions — never occur in correct §7 prose (negation-proof by structure).
MODELB=(
  "BANZA CA"
  "Certificate Authority"
  "certificate authority"
  "operadores certificados"
  "níveis de certificação"
  "prontidão certifica"
  "readiness = certified"
  "L3 é certificado"
  "L3 = certificado"
  "torna-se certificado automaticamente"
  "Raiz de Confiança emite"
  "raiz certifica"
)

check() {
  local ref="$1" bad=0 s7 phrase
  s7="$(section "$ref")"

  # 1. canonical title
  echo "$s7" | grep -qE '^## 7\. Conformidade e Certificação$' \
    || { echo "  ✗ §7 title is not 'Conformidade e Certificação'"; bad=1; }

  # 2. level (profile) vs layer distinction
  echo "$s7" | grep -qF "perfis de conformidade L0" \
    || { echo "  ✗ §7 does not name the conformance profiles 'perfis de conformidade L0–L4'"; bad=1; }
  echo "$s7" | grep -qF "A letra «L» pertence aos perfis; nunca a uma camada." \
    || { echo "  ✗ §7 does not keep L0–L4 (perfis) distinct from the architecture camadas"; bad=1; }

  # 3. validation ≠ certification
  echo "$s7" | grep -qF "Validar não é certificar" \
    || { echo "  ✗ §7 does not state validation is not certification"; bad=1; }

  # 4. readiness ≠ certification
  echo "$s7" | grep -qF "nunca devolve \`CERTIFIED\`" \
    || { echo "  ✗ §7 does not state readiness never returns CERTIFIED"; bad=1; }
  echo "$s7" | grep -qF "Publicar evidência não é estar certificado" \
    || { echo "  ✗ §7 does not state publishing evidence is not being certified"; bad=1; }

  # 5. subject is an implementation, not a whole entity
  echo "$s7" | grep -qF "Não existe uma «entidade certificada» como estatuto global" \
    || { echo "  ✗ §7 does not state there is no whole-entity 'operador certificado' status"; bad=1; }

  # 6. no certificate authority (frozen trust model only referenced)
  echo "$s7" | grep -qF "Não há autoridade certificadora" \
    || { echo "  ✗ §7 does not state there is no certificate authority"; bad=1; }

  # 7. non-propagation of the three determinations
  echo "$s7" | grep -qF "Certificação técnica ≠ admissão a esquema ≠ autorização regulatória" \
    || { echo "  ✗ §7 is missing the certificação ≠ admissão ≠ autorização non-propagation statement"; bad=1; }

  # 8. closed certification state set named
  echo "$s7" | grep -qF "NOT_CERTIFIED" && echo "$s7" | grep -qF "SUPERSEDED" \
    || { echo "  ✗ §7 does not name the closed certification state set (NOT_CERTIFIED … SUPERSEDED)"; bad=1; }

  # forbidden affirmative collapses
  for phrase in "${MODELB[@]}"; do
    if echo "$s7" | grep -qF "$phrase"; then
      echo "  ✗ §7 collapse/CA construction: \"$phrase\""; bad=1
    fi
  done

  return $bad
}

# ── self-test ──
selftest() {
  local d st=0 g b1 b2
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; b1="$d/collapse.md"; b2="$d/missing.md"
  cat > "$g" <<'EOF'
## 7. Conformidade e Certificação
Os perfis de conformidade L0–L4 descrevem uma implementação. A letra «L» pertence aos perfis; nunca a uma camada.
Validar não é certificar. A prontidão nunca devolve `CERTIFIED` nem cria um registo. Publicar evidência não é estar certificado.
Não existe uma «entidade certificada» como estatuto global. Não há autoridade certificadora.
Certificação técnica ≠ admissão a esquema ≠ autorização regulatória.
Estado: NOT_CERTIFIED, CERTIFIED, EXPIRED, SUSPENDED, REVOKED, SUPERSEDED.
## 8. Operadores
EOF
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }
  # must FAIL: a collapse construction present
  cat > "$b1" <<'EOF'
## 7. Conformidade e Certificação
Os perfis de conformidade L0–L4 são níveis de certificação. A letra «L» pertence aos perfis; nunca a uma camada.
Validar não é certificar. A prontidão nunca devolve `CERTIFIED`. Publicar evidência não é estar certificado.
Não existe uma «entidade certificada» como estatuto global. Não há autoridade certificadora.
Certificação técnica ≠ admissão a esquema ≠ autorização regulatória.
Estado: NOT_CERTIFIED, SUPERSEDED.
## 8. Operadores
EOF
  check "$b1" >/dev/null 2>&1 && { echo "SELFTEST_FAIL collapse accepted"; st=1; }
  # must FAIL: readiness≠certification anchor missing
  cat > "$b2" <<'EOF'
## 7. Conformidade e Certificação
Os perfis de conformidade L0–L4 descrevem uma implementação. A letra «L» pertence aos perfis; nunca a uma camada.
Validar não é certificar. Publicar evidência não é estar certificado.
Não existe uma «entidade certificada» como estatuto global. Não há autoridade certificadora.
Certificação técnica ≠ admissão a esquema ≠ autorização regulatória.
Estado: NOT_CERTIFIED, SUPERSEDED.
## 8. Operadores
EOF
  check "$b2" >/dev/null 2>&1 && { echo "SELFTEST_FAIL missing-readiness-anchor accepted"; st=1; }
  return $st
}

if ! selftest; then echo "Result: ✗ conformance/certification boundary guard self-test broken"; exit 2; fi

echo "Conformance/certification boundary guard — §7 keeps level/validation/readiness/certification/admission/authorisation distinct (ADR-030/061/064/066/068/077)"
if check "$REF"; then
  echo "Result: ✓ §7 keeps the boundary: L0–L4 are profiles not layers/certificates; validação ≠ prontidão ≠ certificação técnica ≠ admissão ≠ autorização; no certificate authority"
else
  echo "Result: ✗ §7 collapses a conformance/certification distinction (see decisions/adr/ADR-005, ADR-032, ADR-032)"
  exit 1
fi
