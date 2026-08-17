#!/usr/bin/env bash
#
# BANZA Public-Surface Cleanliness Guard (M2.5).
#
# Scans the PUBLIC-RENDERED surfaces (website app/components/lib/public + published reference docs +
# top-level README/SECURITY) for the REMOVED vocabulary of a human-gated, certificate-issuing protocol.
# BANZA is an open financial protocol for interoperability, conformance and verifiable evidence in
# payments. A technical PASS is verifiable evidence of conformance — not human approval, licence or
# certification. Humans maintain and evolve the protocol; they do not authorise, accept, approve or
# certify operators.
#
# This guard is a best-effort TEXT LINTER — defence in depth, not the authority. The machine-checked
# authority is banza-open-governance + banza-reference-trust-model plus each engine suite; this guard
# holds the rendered copy to the active model so a reader never meets a removed label.
#
# A line that clearly NEGATES a boundary ("um PASS não é certificação") is allowed — naming what BANZA is
# NOT is how the active model states its own edges. The /certificates compatibility route, the
# production_certificates flag, quoted mapping-row mentions and lines marked removed/deprecated are also
# allowed. Everything else that presents a removed label as ACTIVE copy is NEEDS_FIX.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."

# Public surfaces in scope. website/components excludes *.test.ts and banzai-agent.ts (whose FORBIDDEN_PHRASES
# list names the removed labels verbatim; its real copy is pinned by workbench.test.ts) via GREP_EXCL.
SURFACES=(
  website/app
  website/components
  website/lib
  website/public
  docs/reference
  README.md
  SECURITY.md
)

# ── Clause-scoped allowlist (not line-scoped) ─────────────────────────────────
# A line-level "contains não → fine" rule would clear nearly everything, because almost every boundary
# sentence in this project carries a "não". So a hit is cleared only when an exculpating marker sits
# IMMEDIATELY BEFORE the matched term (within ~90 chars, not crossing a sentence end), or the term sits
# inside a quoted span in MARKDOWN (a mapping-row mention), or the whole line is marked removed.
#
# NOTE: "sem"/"without" are deliberately NOT negation markers here. A badge like "SEM OPERADOR
# CERTIFICADO" still renders the removed label "operador certificado" to a reader, so it must report;
# only an explicit "não/nunca/never" style boundary clears. Use the literal UTF-8 "não" (a bracket like
# [ãa] never matches the multibyte ã under BSD grep).
NEG_BEFORE='não|nao|nunca|never|\bnot\b|nobody|neither|\bnem\b|nenhum|nenhuma|ninguém|ninguem|jamais|removid|removed|deprecat|depreciad|obsolet|antigo|antiga|\bold\b|former|previously|formerly|deixou de|já não|ja nao|rather than|instead of|unlike|ao contrário|ao contrario|em vez de'
DEPRECATION_LINE='removid|removed|deprecat|depreciad|histórico|historico|obsolet|já não|ja nao|deixou de|superseded|supersed|substituíd|substituid'
QUOTE='[«»"*`_]'
# The mention rule is MARKDOWN-ONLY: in prose, quoting a term is how you name it; in code every string
# literal is quoted, so a quote proves nothing (`title: "Assistente de Certificação"` is live copy).
MENTION_SPAN="$QUOTE[^|]{0,90}(PAT)[^|]{0,90}$QUOTE"
# Guillemet mention (ANY file, incl. .tsx JSX text): « » (U+00AB/U+00BB) are PROSE quotation marks, never
# code string-literal delimiters, so a term inside «…» is being NAMED — e.g. a JSX sentence stating that
# distinguishing the roles is "what stops the registry from being read as a list of «operadores
# certificados»". Unlike MENTION_SPAN (markdown-only, because "…" is a code delimiter), a guillemet-quoted
# mention is cleared everywhere. Active claims never wrap the label in guillemets, so a bare
# "<h2>Operadores certificados</h2>" or a footer badge "SEM OPERADOR CERTIFICADO" still reports.
GUILLEMET_MENTION='«[^»]{0,120}(PAT)[^»]{0,120}»'
# BANZA named with a negation is a boundary sentence ("o BANZA não certifica operadores").
NEG_SUBJECT='banza[^.!?]{0,25}(não|nao|nunca|never|nenhum|ningu[ée]m)'
# The two live compatibility surfaces: the legacy /certificates route and the production_certificates
# flag (pinned false elsewhere). A line naming either is the compatibility copy, not an active claim.
ROUTE_FLAG_EXEMPT='/certificates|production_certificates'

# Factual zero-state (home v2 state line): "0 certificados emitidos" asserts that NONE were emitted — an
# absence fact, the same category as "Sem evidência de operador indexada", not a claim that certification
# exists. A NONZERO count ("5 certificados emitidos") would still report.
ZERO_STATE='(^|[^0-9])0 certificados( de produção| de producao)? emitidos'

# M2.19 reconciliation (ADR-004/061): Layer 2 is the "BANZA Conformance & Interoperability Certification"
# — certification OF AN IMPLEMENTATION (evidence-based, Rust-decided, scoped, revocable). That certification
# is ACTIVE canonical vocabulary. Only "certificação técnica / de conformidade / de interoperabilidade"
# (of an implementation) is cleared here; ENTITY/operator certification ("certificação de operador",
# "operador certificado", "certificado de operador", "assistente de certificação", "verificação tripla",
# "certificado de produção") is NOT matched by this term and stays blocked by its own labels below.
# M2.19E/F (ADR-035): the read-only Operador Zero surface + BanzAI Validation Workbench legitimately
# name the L2 certification CONCEPT and its honest readiness/state (NOT_CERTIFIED for the demo): the
# certification-readiness step, "preparação de certificação", "estado de certificação", the
# "Certificação de produção: não" boundary field, "certificação é técnica, por implementação", and the
# Certification Record preview. These are the active L2 vocabulary (of an implementation), never an
# operator/entity certificate — those stay blocked by their own labels.
L2_CERT_TERM='certifica(ção|cao) (técnica|tecnica|de conformidade|de interoperabilidade|de produção|de producao)|preparaç(ão|ao) de certifica|estado de certifica|prontid(ão|ao) (para|de) certifica|preparação de certificação|certifica(ção|cao) é (técnica|tecnica)|certification record|conformidade ou certifica(ção|cao)'

# Registry absence lines: BANZA_SVG_REGISTRY.md prose/rows that state what a diagram does NOT show
# ("Nenhum destes diagramas mostra …", "Sem certificado …", the boundary band). They describe absence,
# so the removed labels they name are legitimate. Scoped to the registry file by name, so the .tsx footer
# badge ("SEM OPERADOR CERTIFICADO") and code strings elsewhere are unaffected — "sem" only clears here.
REGISTRY_ABSENCE='^[^:]*BANZA_SVG_REGISTRY\.md:[0-9]+:.*(nenhum destes diagramas mostra|não mostra|nao mostra|banda de fronteira|sem certificad)'
# Code identifiers are not user-facing certification COPY: a slug prop (slug="certificacao"), a
# component/function name (CertificacaoRedirect), a route/path literal (/certificacao), and an anchor-slug
# EXAMPLE in a code comment ("## 6. Certificação" → "6-certificação" in reference.ts). Scoped to code
# files so the heading/label forms in .md and JSX text still report.
CODE_IDENT='^[^:]*\.(tsx?|jsx?):[0-9]+:.*(slug=.{0,2}certificacao|certificacao[a-z0-9_]|/certificacao([^/a-z0-9_]|$)|(//|/\*|\*).*→)'

# Drop the hits a clause-scoped marker exculpates. $1 = the pattern that produced the hits.
filter_hits() {
  local pat="$1"
  local mention="${MENTION_SPAN/PAT/$pat}"
  local gmention="${GUILLEMET_MENTION/PAT/$pat}"
  grep -viE "$ROUTE_FLAG_EXEMPT" \
    | grep -viE "$ZERO_STATE" \
    | grep -viE "$L2_CERT_TERM" \
    | grep -viE "($NEG_BEFORE)[^.!?]{0,90}($pat)" \
    | grep -viE "$NEG_SUBJECT" \
    | grep -viE "^[^:]*\.md:[0-9]+:.*$mention" \
    | grep -viE "$gmention" \
    | grep -viE "$DEPRECATION_LINE" \
    | grep -viE "$REGISTRY_ABSENCE" \
    | grep -viE "$CODE_IDENT" || true
}

# Common exclusions: test files and banzai-agent.ts.
GREP_EXCL=(--exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts' --exclude='banzai-agent.ts')

# ── The removed labels, as ACTIVE copy ────────────────────────────────────────
# Specific noun phrases + the removed flow/label words. Each is run through filter_hits, so a boundary
# negation, a quoted markdown mention, the /certificates route, the production_certificates flag, or a
# line marked removed clears it. Broad on purpose: real residues MAY still be flagged while parallel
# cleanup lands — what this guard pins is its own self-test, below.
LABELS=(
  'operador[es]* certificad[oa]s?'
  '(certificado|certificados) de operador'
  '(certificado de produção|certificado de producao)'
  'certificados emitidos'
  '(certificado válido|certificado valido)'
  # M2.19G (ADR-032): bare "certificação" is now CURRENT canonical vocabulary — the per-implementation
  # L2 Conformance & Interoperability Certification ("perfil de certificação", "certificação (L2)",
  # "certificação válida", "modelo de certificação", "sujeito da certificação"). Only ENTITY/operator
  # certification stays a removed label, so this scans the entity form specifically. "operador
  # certificado" / "certificado de operador" / "assistente de certificação" keep their own labels
  # above/below; a negated or guillemet-quoted mention still clears via filter_hits.
  'certifica(ção|cao) de (operador|operadores|entidade|entidades)'
  '(verificação tripla|verificacao tripla)'
  'assistente de (certificação|certificacao)'
  'm2 protocol gate'
  '(m2 pronto|m2/m3 pendentes)'
)

fail=0
warn=0

# ── Self-test: exercise the real filter on every run. Each probe is a line the guard MUST or MUST NOT
#    report; broken logic exits 2 rather than passing silently. ──
st_fail=0
# detect runs a probe through the SAME two steps as the main loop — the pattern grep, then filter_hits —
# so the self-test exercises the full detection path (a probe that no longer carries the term, or that a
# negation now clears, is caught). Always exits 0 so a non-matching probe never aborts under set -e.
detect() { # <pattern> <line> → echoes the hit if the line matches the pattern AND survives the filter
  printf '%s\n' "$2" | grep -iE "$1" | filter_hits "$1" || true
}
must_report() { # <label> <pattern> <line>
  local out; out="$(detect "$2" "$3")"
  [ -n "$out" ] || { echo "SELFTEST_FAIL not reported: $1"; st_fail=1; }
}
must_allow() { # <label> <pattern> <line>
  local out; out="$(detect "$2" "$3")"
  [ -z "$out" ] || { echo "SELFTEST_FAIL wrongly reported: $1"; st_fail=1; }
}

# MUST report — removed labels as active copy.
must_report "home: Operadores certificados"       'operador[es]* certificad[oa]s?'  'website/app/(pt)/page.tsx:10:      <h2>Operadores certificados</h2>'
must_report "Workbench: Validar M2 protocol gate" 'm2 protocol gate'                'website/components/banzai/BanzaiChat.tsx:88:      label: "Validar M2 protocol gate",'
must_report "Chat: Assistente de Certificação"    '(certificação|certificacao)'     'website/components/banzai/BanzaiChat.tsx:12:      title: "Assistente de Certificação",'
must_report "footer badge: SEM OPERADOR CERTIFICADO" 'operador[es]* certificad[oa]s?' 'website/components/SiteFooter.tsx:20:        SEM OPERADOR CERTIFICADO'
must_report "M2/M3 Pendentes as UI copy"          '(m2 pronto|m2/m3 pendentes)'     'website/app/(pt)/estado/page.tsx:33:        <li>M2/M3 Pendentes</li>'
# Accented pattern parity (BSD/GNU): spelled as full alternations, pinned here.
must_report "accented label fires"                '(certificação de operador|certificacao de operador)' 'docs/reference/pt/completa.md:41:Pressupõe certificação de operador activa.'

# MUST allow — a boundary negation, the /certificates route, the production_certificates flag.
must_allow "negated boundary sentence"            '(certificação|certificacao)'     'docs/reference/pt/completa.md:5:Um PASS é evidência verificável, não certificação nem aprovação humana.'
must_allow "/certificates legacy route line"      '(certificado válido|certificado valido)' 'website/components/SiteFooter.tsx:15:      { href: "/certificates", label: "Certificado válido (legacy)" },'
must_allow "production_certificates flag = false"  '(certificado de produção|certificado de producao)' 'website/lib/site.ts:5:  production_certificates: false, // nenhum certificado de produção emitido'
# MUST allow — M2.19 Layer-2 canonical vocabulary (ADR-004/061): certification of an IMPLEMENTATION.
must_allow "L2: certificação de conformidade e interoperabilidade" '(certificação|certificacao)' 'website/lib/decisions.ts:33:    "summary": "... L2 certificação de conformidade e interoperabilidade (por implementação, decidida por Rust) ...",'
must_allow "L2: Certificação técnica (of an implementation)"       '(certificação|certificacao)' 'website/lib/decisions.ts:81:    "summary": "Certificação técnica, admissão a scheme e autorização regulatória são três determinações distintas ...",'
# MUST still report — ENTITY/operator certification is NOT the L2 term and keeps its own label.
must_report "entity certification (certificação de operador) still blocked" 'certifica(ção|cao) de (operador|operadores|entidade|entidades)' 'website/app/x/page.tsx:9:      <h2>certificação de operador</h2>'
# MUST allow — M2.19G: bare / per-implementation "certificação (L2)" is CURRENT copy, not the entity form.
must_allow "per-implementation certificação accepted (not entity)" 'certifica(ção|cao) de (operador|operadores|entidade|entidades)' 'website/app/(pt)/estado/page.tsx:150:      <strong>A certificação (L2) é por implementação.</strong>'
# MUST allow — a guillemet-quoted mention in a .tsx JSX sentence stating the registry is NOT such a list.
must_allow "guillemet mention: «operadores certificados» in .tsx (registry is NOT this)" 'operador[es]* certificad[oa]s?' 'website/app/(pt)/operadores/page.tsx:98:            que impede o registo de ser lido como uma lista de «operadores certificados».'

# MUST allow — registry ABSENCE lines (M2.5 rule 3): the registry stating what a diagram does NOT show.
must_allow "registry absence: Sem certificado … operador certificado" 'operador[es]* certificad[oa]s?' 'docs/reference/BANZA_SVG_REGISTRY.md:9:Banda de fronteira: "…". Sem certificado, CA, aprovação, badge de certificado ou operador certificado.'
must_allow "registry absence: Nenhum … mostra … certificado de operador" '(certificado|certificados) de operador' 'docs/reference/BANZA_SVG_REGISTRY.md:9:Nenhum destes diagramas mostra autoridade central, certificado de operador ou aprovação humana.'
must_allow "registry absence: Nenhum … mostra … badge de certificação" '(certificação|certificacao)' 'docs/reference/BANZA_SVG_REGISTRY.md:9:Nenhum destes diagramas mostra autoridade central, certificado, badge de certificação, aprovação humana ou operador certificado.'
# MUST allow — code identifiers (M2.5 rule 4): a slug prop, a component name, a route literal, an anchor example.
must_allow "code: slug=\"certificacao\" prop"          '(certificação|certificacao)' 'website/app/(pt)/conformidade/page.tsx:9:      <ReferenceCTA slug="certificacao" />'
must_allow "code: CertificacaoRedirect component"     '(certificação|certificacao)' 'website/app/(pt)/certificacao/page.tsx:9:export default function CertificacaoRedirect() {'
must_allow "code: /certificacao route literal"        '(certificação|certificacao)' 'website/app/x/page.tsx:9:  redirect("/certificacao");'
must_allow "code: anchor-slug example in a comment"   '(certificação|certificacao)' 'website/lib/reference.ts:9: * links (e.g. "## 6. Certificação" → "6-certificação", "## Resumo" →'
# MUST still report — the registry naming a removed label as ACTIVE copy (no absence marker), and a real
# label in code that is not a slug/identifier/route/anchor — so the new allow rules do not over-clear.
must_report "registry active entity label (no absence marker)" 'certifica(ção|cao) de (operador|operadores|entidade|entidades)' 'docs/reference/BANZA_SVG_REGISTRY.md:9:| SVG-X | badge de certificação de operador activa |'
must_report "code: entity certification (unaccented) still fires"  'certifica(ção|cao) de (operador|operadores|entidade|entidades)' 'website/app/x/page.tsx:9:      <h2>certificacao de operador</h2>'

# CA rule: naming "BANZA CA" as a live entity reports unless the line marks it removed/deprecated or the
# term is a quoted markdown mention. A stray negation about something else does NOT clear it.
CA_MENTION="${MENTION_SPAN/PAT/banza[ -]ca}"
ca_filter() { grep -viE "^[^:]*\.md:[0-9]+:.*$CA_MENTION" | grep -viE "$DEPRECATION_LINE" | grep -viE "$REGISTRY_ABSENCE" || true; }
ca_detect() { printf '%s\n' "$1" | grep -iE 'banza ca\b|banza-ca\b' | ca_filter || true; }
if [ -z "$(ca_detect 'website/public/diagrams/x.svg:5:  <text>BANZA CA</text>')" ]; then
  echo "SELFTEST_FAIL CA: SVG naming BANZA CA not reported"; st_fail=1
fi
if [ -n "$(ca_detect 'docs/reference/en/complete.md:9:The BANZA CA concept was removed in M2.2.')" ]; then
  echo "SELFTEST_FAIL CA: deprecated line wrongly reported"; st_fail=1
fi
# Registry ABSENCE line naming BANZA CA among what a diagram does NOT show is allowed (M2.5 rule 3).
if [ -n "$(ca_detect 'docs/reference/BANZA_SVG_REGISTRY.md:9:Nenhum destes diagramas mostra autoridade central, BANZA CA, certificado ou operador certificado.')" ]; then
  echo "SELFTEST_FAIL CA: registry absence line wrongly reported"; st_fail=1
fi

[ "$st_fail" -eq 0 ] || { echo "public-surface-clean: guard self-test FAILED"; exit 2; }

# ── Hard block: removed labels presented as active copy ──
for pat in "${LABELS[@]}"; do
  hits="$(grep -rniEI "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  removed label matching /$pat/ as active copy (use: conformance / Conformidade / verifiable evidence of protocol conformance; not operator certification):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Hard block: "BANZA CA" named as active architecture (removed in M2.2) ──
ca="$(grep -rniEI "${GREP_EXCL[@]}" 'banza ca\b|banza-ca\b' "${SURFACES[@]}" 2>/dev/null | ca_filter || true)"
if [ -n "$ca" ]; then
  echo "NEEDS_FIX  'BANZA CA' named as active architecture — the concept was removed. Use Protocol Governance / Trust Root / Conformance Automation / Protocol Maintainers, or mark the line removed/deprecated:"
  echo "$ca" | sed 's/^/    /'
  fail=1
fi

# ── Hard block: "corpus" / public "KB" in UI/content ──
for pat in '\bcorpus\b' '\bKB\b'; do
  hits="$(grep -rnEI "${GREP_EXCL[@]}" "$pat" website/app website/components website/lib docs/reference 2>/dev/null | grep -viE 'CORPUS_HASH|load_corpus|toContain|//|/\*' || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  forbidden public token /$pat/ in UI/content:"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── WARN only: "protocolo técnico" as the lead framing (prefer "protocolo financeiro aberto") ──
soft="$(grep -rniEI "${GREP_EXCL[@]}" '(protocolo técnico|protocolo tecnico)' "${SURFACES[@]}" 2>/dev/null || true)"
if [ -n "$soft" ]; then
  echo "WARN  'protocolo técnico' found — prefer 'protocolo financeiro aberto' as the lead framing:"
  echo "$soft" | sed 's/^/    /'
  warn=1
fi

if [ "$fail" -eq 0 ]; then
  if [ "$warn" -eq 0 ]; then
    echo "public-surface-clean: ✓ no removed operator-certificate labels; no BANZA CA; no corpus/KB on public surfaces."
  else
    echo "public-surface-clean: ✓ no NEEDS_FIX (see WARN above)."
  fi
fi
exit "$fail"
