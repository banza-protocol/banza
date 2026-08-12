#!/usr/bin/env bash
#
# BANZA Governance-Docs Cleanliness Guard (M2.6).
#
# Scans the GOVERNANCE DOCUMENTATION surfaces (docs/governance, docs/security, docs/reference, the
# governance page under website/app, and the BanzAI assistant router that answers governance questions
# under engines/banzai-evidence/src) and holds them to the ACTIVE open-protocol model.
#
# The active model, stated positively:
#   BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam
#   manifests e demonstram compatibilidade por evidência verificável de conformidade. Confiança =
#   signed protocol metadata + delegated signing keys + operator manifests + conformance evidence +
#   public protocol registry + revocation com semântica fechada-por-defeito. A Trust Root (2-de-3, três
#   custódios) assina metadados do protocolo, chaves delegadas, releases e listas de revogação — nunca
#   operadores, pagamentos ou licenças. Humanos mantêm e evoluem o protocolo; não autorizam, aceitam,
#   aprovam ou certificam operadores. Operadores validam compatibilidade protocolar no BanzAI Workbench.
#
# This guard blocks the REMOVED vocabulary when it is presented as ACTIVE architecture: BANZA CA /
# certificate authority / autoridade certificadora; operator-certificate semantics; certification path;
# certificate-based trust; a valid certificate; a CA signature; BANZA emitting/certifying/approving/
# accepting operators; approved/accepted/certified operators; human approval / human-gated / aprovação
# humana; operator admission; the Regra de Verificação Tripla (use Open Trust Evaluation); and pip/Docker/
# GitHub-Actions/CLI offered as an OPERATOR flow.
#
# The public-"corpus"/"KB" concern is out of scope here: it is a PUBLIC-UI regulatory rule enforced by
# make regulatory-check over the website surface — not a governance-docs (or engine-internal) matter,
# where "protocol corpus" is a legitimate architecture term and "C-NO-CORPUS-KB" is a control's own name.
#
# A line that clearly NEGATES a boundary ("um operador não é certificado", "a Trust Root assina metadados,
# não operadores") is allowed — naming what BANZA is NOT is how the active model states its own edges. So
# are deny-list entries and detected/offered questions in the assistant router, quoted mapping-row mentions
# in markdown, the /certificates compatibility route, the production_certificates flag, and lines marked
# removed/deprecated. Everything else that presents a removed label as ACTIVE copy is NEEDS_FIX.
#
# Out of scope BY DESIGN — the implementation-history records, which preserve the record of the work and
# would report the record itself:
#   docs/**/PHASE_*.md          — phase reports
#   docs/**/*_MATRIX_*.md       — review / hardening matrices
#   docs/**/*_INVENTORY.md      — sweep inventories
#   docs/**/*_AUDIT.md, *_AUDIT_*.md — audit records
# The engine's TESTS are also out of scope: the assistant's real answers are pinned by its own cargo
# suite (an executed check over the output beats a grep over the source), so only src/ is scanned here.
#
# This guard is a best-effort TEXT LINTER — defence in depth, not the authority. The machine-checked
# authority is banza-open-governance + banza-reference-trust-model plus each engine's own suite.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."

# Run in a deterministic UTF-8 locale so grep counts CHARACTERS (not bytes) the same way here and in CI.
# Otherwise `[^.!?]{0,N}` windows near multibyte punctuation ("—", accented vowels) match differently on a
# byte-locale (POSIX/C) shell than on the UTF-8 CI runner, and a clean local run can still fail CI.
if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

# Governance-doc surfaces in scope for the removed-architecture blocks.
SURFACES=(
  docs/governance
  docs/security
  docs/reference
  docs/guides
  spec
  website/app/governacao
  engines/banzai-evidence/src
)

# Operator-facing subset: only these carry an OPERATOR flow, so the pip/Docker/GitHub-Actions/CLI block
# runs here. docs/security is ceremony/maintainer runbooks by nature — a pip/docker line there is a
# maintainer instruction, not an operator method — so it is deliberately left out of that one block.
OPERATOR_SURFACES=(
  docs/governance
  docs/reference
  website/app/governacao
  engines/banzai-evidence/src
)

# Exclusions: the implementation-history records, test files, and the workbench copy-under-test.
GREP_EXCL=(
  --exclude='PHASE_*.md'
  --exclude='*_MATRIX_*.md'
  --exclude='*_INVENTORY.md'
  --exclude='*_AUDIT.md'
  --exclude='*_AUDIT_*.md'
  --exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts'
  --exclude='banzai-agent.ts'
  # SVGs are governed by reference-svg-check + public-surface-clean-check + the M2.5 SVG sweep; their
  # accessibility <desc> text is negation-heavy ("no operator certificate, no certification authority…").
  --exclude='*.svg'
  --exclude-dir='target' --exclude-dir='node_modules' --exclude-dir='.next'
)

# ── Clause-scoped allowlist (not line-scoped) ─────────────────────────────────
# Almost every boundary sentence in this project carries a "não", so a line-level "contains não → fine"
# rule would clear nearly everything. A hit is cleared only when an exculpating marker sits IMMEDIATELY
# BEFORE the matched term (within ~90 chars, not crossing a sentence end), or the subject-side negation
# sits between the subject and the verb, or the term is a quoted markdown mention, or the line is a
# code-side deny-list/question literal, or the whole line is marked removed.
#
# Use the literal UTF-8 "não" (a bracket like [ãa] never matches the multibyte char under BSD grep).
# "there is/are/was no" and "não há" are existence negations: one leading "There is no X, no Y, no Z"
# clears every term on the line without needing a bare "no" (which would collide with the Portuguese
# article "no" = "in the").
NEG_BEFORE='não|nao|nunca|never|\bnot\b|nobody|neither|\bnem\b|\bsem\b|without|evitar|avoid|nenhum|nenhuma|ninguém|ninguem|jamais|there is no|there are no|there was no|não há|nao ha|removid|removed|deprecat|depreciad|obsolet|antigo|antiga|\bold\b|former|previously|formerly|deixou de|já não|ja nao|rather than|instead of|unlike|ao contrário|ao contrario|em vez de|face a|diferença|diferenca|diferente de|distinct from|structural difference|em contraste|by contrast'
DEPRECATION_LINE='removid|removed|deprecat|depreciad|histórico|historico|obsolet|já não|ja nao|deixou de|superseded|supersed|substituíd|substituid'
QUOTE='[«»"*`_]'

# MENTION is MARKDOWN-ONLY: in prose, quoting a term is how you name it; in code every string literal is
# quoted, so a quote proves nothing. A mention is the term sitting INSIDE a quoted/emphasised span in a
# .md file — a mapping row like | "operador certificado" | evidência verificável |. Never across a `|`.
MENTION_SPAN="$QUOTE[^|]{0,90}(PAT)[^|]{0,90}$QUOTE"

# QUESTION is CODE-ONLY: the assistant router carries the removed labels as user-question KEYWORDS and as
# offered follow-up questions ("Manifesto válido significa operador certificado?"). A term inside a quoted
# string that is itself a question (a `?` before the closing quote) is a detected/offered question, not an
# active claim — the router's real answers negate the label and are pinned by its cargo suite.
QUESTION_SPAN='"[^"]*(PAT)[^"]*\?[^"]*"'

# A bare quoted-string literal on its own code line — a deny-list array entry, an offered-question entry,
# or a single-string answer body. These are router data, not active prose claims; the router's answers are
# boundary-negated and pinned by its cargo suite.
DENY_LITERAL='^[^:]*\.(rs|ts|tsx|js|jsx):[0-9]+:[[:space:]]*"[^"]*",?[[:space:]]*$'

# The subject-side negation: "não" sitting between a trust-model SUBJECT and its verb — the shape almost
# every boundary sentence here takes ("o BANZA não certifica operadores", "a Trust Root não assina
# operadores"). "raiz de confiança" is included; bare "raiz" is not (too broad).
# Also clear an operator-subject negation where the negation sits INSIDE the match, tight against the
# copula + "certificad" — "um operador não é certificado" — but NOT "operador certificado, mas não
# aprovado" (there the negation is >8 chars past "operador", so the tight window never reaches it).
NEG_SUBJECT='(banza|trust root|trust-root|raiz de confian)[^.!?]{0,45}(não|nao|nunca|never|\bsem\b|nenhum|ningu[ée]m|no longer)|operador(es)?[^.!?]{0,8}(não|nao|nunca|never)[^.!?]{0,14}certificad'

# Explicit EXISTENCE negation with a WIDE window (a term can sit far down an enumeration): "Nenhum destes
# diagramas mostra ... BANZA CA, certificado, aprovação humana, operador certificado", "there is no ...",
# "não é uma lista de operadores certificados". The leading phrase alone proves the whole list is absent.
NEG_EXIST='nenhum destes|nenhuma destas|nenhum dos|nenhuma das|none of these|there (is|are|was) no|não há|nao ha|não mostra|nao mostra|does not (show|list)|not show|não é uma lista|nao e uma lista|não é lista|no human approval|no operator certificate|no central authority|no certified operator|no certification path|no ca signature|no approval step'
# A boundary/reject STATUS context: naming the removed vocabulary as the thing the engine REJECTS is the
# active model ("uma metadata que afirma ser um certificado de operador é rejeitada com
# TRUST_INVALID_BOUNDARY"; "TRUST_INVALID_BOUNDARY | alguma entrada afirma ... aprovação humana").
REJECT_MARK='trust_invalid_boundary|invalid_boundary|é rejeitad|e rejeitad|é recusad|e recusad|is rejected|are rejected|são rejeitad|sao rejeitad|reprovad|rejeitada com|rejeitado com'
# The authority-chain caption/alt-text, where "assina" and "operador" sit in DIFFERENT clauses ("a Trust
# Root assina, os operadores implementam e publicam") — the operators are the subject of "implementam",
# not the object of "assina". This is the correct active-model chain, not "Trust Root signs operators".
AUTHCHAIN_ALT='(trust root|trust-root|raiz de confian)[^.!?]{0,30}(assina|autoriza)[^.!?]{0,4},[^.!?]{0,16}operador(es)? (implementam|publicam|implement|publish)'
# A checklist item marked NOT-done (❌ / ✗ / empty box) states the item's ABSENCE, not its existence.
CHECKLIST_UNDONE='^[^:]*:[0-9]+:[[:space:]]*[-*][[:space:]]*(❌|✗|☐|\[ \])'

# The two live compatibility surfaces: the legacy /certificates route and the production_certificates flag
# (pinned false elsewhere). A line naming either is compatibility copy, not an active claim.
ROUTE_FLAG_EXEMPT='/certificates|production_certificates'

# Drop the hits a clause-scoped marker exculpates. $1 = the pattern that produced the hits.
filter_hits() {
  local pat="$1"
  local mention="${MENTION_SPAN/PAT/$pat}"
  local question="${QUESTION_SPAN/PAT/$pat}"
  grep -viE "$ROUTE_FLAG_EXEMPT" \
    | grep -viE "($NEG_BEFORE)[^.!?]{0,90}($pat)" \
    | grep -viE "$NEG_SUBJECT" \
    | grep -viE "($NEG_EXIST)[^.!?]{0,220}($pat)" \
    | grep -viE "($REJECT_MARK)[^.!?]{0,90}($pat)" \
    | grep -viE "($pat)[^.!?]{0,40}($REJECT_MARK)" \
    | grep -viE "$AUTHCHAIN_ALT" \
    | grep -viE "$CHECKLIST_UNDONE" \
    | grep -viE "($pat)[^.!?|]{0,10}\|[^|]{0,60}(nenhum|nenhuma|none|não|nao|no human|no step|não existe|nao existe|não há|nao ha)" \
    | grep -viE "^[^:]*\.md:[0-9]+:.*$mention" \
    | grep -viE "$question" \
    | grep -viE "$DENY_LITERAL" \
    | grep -viE "$DEPRECATION_LINE" || true
}

# ── The removed architecture, as ACTIVE copy ──────────────────────────────────
# A central human authority over operators, and the operator-certificate semantics that went with it.
# BANZA "emite/certifica/aprova/aceita" is caught by the banza-subject rows; the regulator-side
# "operador autorizado" (a real operator authorised by its regulator to provide financial services) is
# deliberately NOT here — only protocol-side approval/acceptance/certification is removed.
AUTHORITY=(
  'banza ca (autoriza|certifica|aprova|aceita|emite|revê|revisa|admite|licencia)'
  'banza[^.]{0,30}(certifica|aprova|aceita)[^.]{0,20}operador'
  'banza[^.]{0,30}(emite|assina)[^.]{0,20}(certificad|licen)'
  '(aceite|aprovad[oa]|admitid[oa]) pela banza'
  'certificate authority'
  'certification authority'
  'autoridade certificadora'
  'human (operator )?approval'
  'human-gated'
  '(aprovação|aprovacao) (humana|manual)'
  'operator admission'
  '(admissão|admissao) de operador'
  'central authority (accepts|approves|certifies) operators'
  '(trust root|trust-root|raiz de confian)[^.!?]{0,40}(assina|autoriza|certifica|aceita|aprova)[^.!?]{0,25}operador'
)

# Operator-certificate semantics — prose, snake_case field, or camelCase (lower-cased). `[_ ]?` keeps the
# separator optional and never matches a hyphen, so hyphenated SVG/file names stay untouched.
CERTIFICATE=(
  'operador(es)?[^.!?]{0,20}certificad'
  'certificad[oa]s?[^.!?]{0,20}operador'
  'certified[_ ]?operator'
  'operator[_ ]?certificate'
  '(certificado de produção|certificado de producao)'
  '(certificado válido|certificado valido)'
  'valid[_ ]?certificate'
  'certificate[_ ]?based[_ ]?trust'
  'certificate-based (trust|federation)'
  'certification path'
  '\bca[_ ]signature\b'
  '(assinatura da ca\b|assinatura da autoridade)'
  'operador(es)? (aceite|aprovad|admitid)'
  'approved operator'
  'accepted operator'
  '(certificação de operador|certificacao de operador)'
  # The removed cert-issuing key domain (the machine layer moved to protocol-metadata / banza-meta-YYYYMM;
  # the key-manifest.json enum no longer has a "cert" domain). Its production-issuance vocabulary is stale.
  # ("banza-cert-YYYYMM" itself is a backticked identifier that the markdown-mention rule would clear, so
  # the surrounding prose — "cert-issuing", "certificate issuance" — is what carries the regression signal.)
  'cert-issuing'
  '(certificate|cert) issuance'
  'issuing (of )?(operator )?certificate'
  'issue[sd]? (a |an |the |production |real )*(operator )?certificate'
  '(emissão|emissao) de certificad'
)

# The removed pre-trust ritual: use "Open Trust Evaluation".
TRIPLE=(
  '(verificação tripla|verificacao tripla)'
  '(regra de verificação tripla|regra de verificacao tripla)'
  'triple verification'
)

# ── pip / Docker / GitHub Actions / CLI presented as an OPERATOR flow ──────────
# Only when the runner sits next to an operator/compatibility context. A bare maintainer/CI reference
# (no operator context) does not match; a line carrying an explicit maintainer/internal marker, a
# boundary negation, or a bare tool-name mention is cleared by methods_filter below.
METHODS=(
  '(pip install|python3 -m pip|docker pull|docker run|github action|workflow_dispatch|\bcli\b)[^.]{0,70}(operador|operator|compatibilidad|conformidad|validar|verificar|check-vectors|run-live)'
  '(operador|operator)[^.]{0,70}(pip install|python3 -m pip|docker pull|docker run|github action|workflow_dispatch)'
)
MAINTAINER_MARK='maintainer|manutentor|manutentores|internal tooling|internal only|internal/maintainer|internos dos maintainers|maintainer-internal|uso interno|apenas interno|interno ao repositório|interno ao repositorio|para manutenção|para manutencao|dev-only|dev script|protocol maintainers|para manutentores'
# The canonical statement of "operators don't run Python/Docker/CI" NAMES those runners on purpose to forbid
# them — often the negation ("Operadores não precisam...") wraps onto the previous markdown line, out of a
# line grep's reach. This one doc is a boundary declaration, not an operator instruction; exempt it here.
METHODS_DOC_EXEMPT='^docs/governance/WORKBENCH_ONLY_OPERATOR_VERIFICATION.md:'
# Negation-of-NEED: a line stating the runner is NOT required or is NOT the operator path. In METHODS
# context the line already pairs a runner with an operator/compat token, so these phrases (and a bare
# "sem X") are always the boundary being stated, never an instruction to use the runner.
NEG_NEED='(não|nao) precisa|(não|nao) precisam|(não|nao) deve precisar|(não|nao) é necessário|(não|nao) e necessario|(não|nao) é preciso|(não|nao) e preciso|(não|nao) são caminho|(não|nao) sao caminho|(não|nao) a interface|don.t need|does not need|do not need|no need|not need|dispensa|sem precisar|\bsem\b|validate in (the workbench|banzai)|valida.{0,20}(workbench|banzai)|never an operator method|not an operator method|maintainer-internal'
# An offered/echoed follow-up question naming a runner ("Preciso usar CLI ou Docker?") — router data, not
# an active claim; the router's real answers negate it and are pinned by its cargo suite.
METHODS_QUESTION='"[^"]*(pip install|docker|github action|workflow_dispatch|\bcli\b|python)[^"]*\?[^"]*"'
# A bare tool-NAME mention (a path or the name in backticks / a JSON field), never a runnable command
# (which always carries a space and stays blocked by the space-bearing METHODS patterns).
TOOLNAME_MENTION='`[a-z0-9_./-]*banza-conformance[a-z0-9_./-]*`|"banza-conformance"'
methods_filter() {
  local pat="$1"
  grep -viE "$METHODS_DOC_EXEMPT" \
    | grep -viE "($NEG_BEFORE)[^.!?]{0,90}($pat)" \
    | grep -viE "$NEG_NEED" \
    | grep -viE "$METHODS_QUESTION" \
    | grep -viE "$MAINTAINER_MARK" \
    | grep -viE "$DENY_LITERAL" \
    | grep -viE "$TOOLNAME_MENTION" || true
}

fail=0

# ── Self-test: exercise the real detection on every run. Each probe is a line the guard MUST or MUST NOT
#    report; broken logic exits 2 rather than passing silently. ──
st_fail=0
# detect runs a probe through the SAME two steps as the main loops — the pattern grep, then filter_hits —
# so the self-test exercises the full detection path. Always exits 0 so a non-matching probe never aborts
# under set -e.
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

AUTH_CA='banza ca (autoriza|certifica|aprova|aceita|emite|revê|revisa|admite|licencia)'
CERT_OP='operador(es)?[^.!?]{0,20}certificad'
TRUSTROOT='(trust root|trust-root|raiz de confian)[^.!?]{0,40}(assina|autoriza|certifica|aceita|aprova)[^.!?]{0,25}operador'
METHOD_OP='(pip install|python3 -m pip|docker pull|docker run|github action|workflow_dispatch|\bcli\b)[^.]{0,70}(operador|operator|compatibilidad|conformidad|validar|verificar|check-vectors|run-live)'

# MUST report — the removed model as active copy (required probes).
must_report "BANZA CA issues certificates"     "$AUTH_CA"  'docs/governance/x.md:1:A BANZA CA emite certificados de operador.'
must_report "operador certificado (active)"    "$CERT_OP"  'docs/governance/x.md:2:Um operador certificado consta do registo público.'
must_report "pip install as an operator flow"  "$METHOD_OP" 'docs/reference/getting-started.md:3:Como operador, corra pip install banza-conformance para validar compatibilidade.'
# MUST report — extra teeth: unrelated question / negation elsewhere on the line, and the Trust Root
# boundary inverted into an active claim.
must_report "cert claim with an unrelated '?'" "$CERT_OP"  'docs/governance/x.md:4:Quem mantém o protocolo? Um operador certificado é aceite pela autoridade.'
must_report "Trust Root signs operators (active)" "$TRUSTROOT" 'docs/security/x.md:5:A Trust Root assina operadores da federação.'

# MUST allow — the active model stated positively, and its boundary negations (required probes).
must_allow "Trust Root signs metadata, not operators" "$TRUSTROOT" 'docs/security/x.md:6:A Trust Root assina metadados do protocolo, não operadores.'
must_allow "operators use the BanzAI Workbench" '(operador|operator)[^.]{0,70}(pip install|docker pull|docker run|github action)' 'docs/reference/x.md:7:Os operadores usam o BanzAI Workbench para validar compatibilidade protocolar.'
must_allow "clearly negated: não é certificado"      "$CERT_OP"  'docs/governance/x.md:8:Um operador não é certificado; publica evidência verificável de conformidade.'
must_allow "/certificates legacy route line"         '(certificado válido|certificado valido)' 'website/app/governacao/page.tsx:9:      { href: "/certificates", label: "Certificado válido (legacy)" },'
# MUST allow — extra teeth: subject-side negation, deprecation line, markdown mapping-row mention, and the
# router's deny-list / offered-question literals.
must_allow "subject-side: Trust Root não assina operadores" "$TRUSTROOT" 'docs/security/x.md:10:A Trust Root não assina operadores; assina apenas metadados e chaves delegadas.'
must_allow "deprecated line naming the label"        "$CERT_OP"  'docs/governance/x.md:11:O termo operador certificado foi removido em M2.2.'
must_allow "markdown mapping-row mention"            "$CERT_OP"  'docs/reference/pt/completa.md:12:| "operador certificado" | evidência verificável de conformidade |'
must_allow "router deny-list literal"                "$CERT_OP"  'engines/banzai-evidence/src/index.rs:52:    "operador certificado hoje",'
must_allow "router offered-question literal"         "$CERT_OP"  'engines/banzai-evidence/src/lib.rs:1202:            Some(vec!["Manifesto válido significa operador certificado?", "Que campos são obrigatórios?"]));'
# MUST report — a quoted string in CODE is copy, not a mention (the markdown mention rule must not leak).
must_report "quoted string in CODE is copy"         "$CERT_OP"  'website/app/governacao/page.tsx:13:      title: "Assistente de operador certificado",'
# MUST report / allow — the removed cert-issuing key domain and its production-issuance vocabulary.
CERT_ISSUE='cert-issuing'
must_report "cert-issuing key (active)"             "$CERT_ISSUE" 'docs/security/x.md:20:Generate the cert-issuing key and keep it offline.'
must_report "certificate issuance runbook (active)" '(certificate|cert) issuance' 'docs/governance/x.md:21:DOC-004 | certificate issuance runbook | MEDIUM |'
must_allow  "negated: no certificate issuance"      'issue[sd]? (a |an |the |production |real )*(operator )?certificate' 'docs/security/x.md:22:There is no certificate issuance; BANZA never issues an operator certificate.'

# CA rule: naming "BANZA CA" as a live entity reports unless the line marks it removed/deprecated, is a
# markdown mention, or is a router deny-list literal. A stray negation about something else does NOT clear.
CA_MENTION="${MENTION_SPAN/PAT/banza[ -]ca}"
CA_QUESTION="${QUESTION_SPAN/PAT/banza[ -]ca}"
ca_filter() {
  # A negation IMMEDIATELY BEFORE "BANZA CA" (within a clause, not crossing a sentence end) is an
  # existence negation — "Nenhum destes diagramas mostra ... BANZA CA ...", "there is no BANZA CA". A
  # stray "não" in the NEXT sentence does NOT reach back across the "." (the [^.!?] window stops there),
  # so an active claim like "é uma decisão da BANZA CA. Um PASS não é certificado." still reports.
  grep -viE "($NEG_BEFORE)[^.!?]{0,90}(banza[ -]ca)" \
    | grep -viE "$CA_QUESTION" \
    | grep -viE "^[^:]*\.md:[0-9]+:.*$CA_MENTION" \
    | grep -viE "$DENY_LITERAL" \
    | grep -viE "$DEPRECATION_LINE" || true
}
ca_detect() { printf '%s\n' "$1" | grep -iE 'banza ca\b|banza-ca\b' | ca_filter || true; }
if [ -z "$(ca_detect 'docs/governance/x.md:14:A certificação é uma decisão da BANZA CA. Um PASS não é certificado.')" ]; then
  echo "SELFTEST_FAIL CA: live-authority line wrongly allowed by a stray negation"; st_fail=1
fi
if [ -n "$(ca_detect 'docs/reference/en/complete.md:15:The BANZA CA concept was removed in M2.2.')" ]; then
  echo "SELFTEST_FAIL CA: deprecated line wrongly reported"; st_fail=1
fi
if [ -n "$(ca_detect 'engines/banzai-evidence/src/lib.rs:1154:        "substitui a banza ca",')" ]; then
  echo "SELFTEST_FAIL CA: router deny-list literal wrongly reported"; st_fail=1
fi
# Existence negation clears: "Nenhum destes diagramas mostra ... BANZA CA ..." (the negation sits before
# "BANZA CA" in the same clause) — naming what is absent is how the active model states its edges.
if [ -n "$(ca_detect 'docs/reference/BANZA_SVG_REGISTRY.md:287:Nenhum destes diagramas mostra autoridade central, BANZA CA, certificado ou operador certificado.')" ]; then
  echo "SELFTEST_FAIL CA: negated-existence line wrongly reported"; st_fail=1
fi
# An offered follow-up question naming the removed concept clears (router data, not an active claim).
if [ -n "$(ca_detect 'engines/banzai-evidence/src/lib.rs:1804:            Some(vec!["Como participa um operador?", "O que aconteceu à BANZA CA?"]));')" ]; then
  echo "SELFTEST_FAIL CA: offered-question literal wrongly reported"; st_fail=1
fi

# METHODS rule: an operator-facing runner reports; a maintainer-marked or negated line clears.
m_detect() { local out=""; local p; for p in "${METHODS[@]}"; do out="$out$(printf '%s\n' "$2" | grep -iE "$p" | methods_filter "$p" || true)"; done; printf '%s' "$out"; }
if [ -z "$(m_detect x 'docs/reference/getting-started.md:16:Como operador, corra pip install banza-conformance para validar compatibilidade.')" ]; then
  echo "SELFTEST_FAIL METHODS: operator pip-install flow not reported"; st_fail=1
fi
if [ -n "$(m_detect x 'docs/reference/getting-started.md:17:Para validar compatibilidade, use o BanzAI Workbench. Não é necessário instalar Python nem correr Docker.')" ]; then
  echo "SELFTEST_FAIL METHODS: Workbench-only boundary wrongly reported"; st_fail=1
fi
if [ -n "$(m_detect x 'docs/governance/submission-process.md:18:Para manutentores: docker pull ghcr.io/banza-protocol/banza-conformance corre a conformidade (internal tooling).')" ]; then
  echo "SELFTEST_FAIL METHODS: maintainer-marked line wrongly reported"; st_fail=1
fi
# Negation-of-need on the same line clears — the runner is named to be forbidden, not instructed.
if [ -n "$(m_detect x 'docs/governance/y.md:19:Python, Docker e GitHub Actions não são caminho público de verificação de operadores.')" ]; then
  echo "SELFTEST_FAIL METHODS: negation-of-need line wrongly reported"; st_fail=1
fi
# An offered follow-up question naming a runner clears (router data, not an operator instruction).
if [ -n "$(m_detect x 'engines/banzai-evidence/src/lib.rs:622:            Some(vec!["Preciso usar CLI ou Docker?", "Como corro a conformidade?"]));')" ]; then
  echo "SELFTEST_FAIL METHODS: offered-question literal wrongly reported"; st_fail=1
fi
# The canonical Workbench-only boundary doc is exempt from the METHODS block (it names the runners to forbid them).
if [ -n "$(m_detect x 'docs/governance/WORKBENCH_ONLY_OPERATOR_VERIFICATION.md:6:> correr Docker, configurar GitHub Actions ou executar scripts externos para demonstrar compatibilidade')" ]; then
  echo "SELFTEST_FAIL METHODS: workbench-only boundary doc wrongly reported"; st_fail=1
fi

[ "$st_fail" -eq 0 ] || { echo "governance-docs-clean: guard self-test FAILED"; exit 2; }

# ── Hard block: removed central authority presented as ACTIVE architecture ──
for pat in "${AUTHORITY[@]}"; do
  hits="$(grep -rniEI "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  removed central-authority architecture matching /$pat/ (humans maintain the protocol; they do not authorise/certify/accept/approve operators — the Trust Root signs metadata/keys/releases/revocation, never operators):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Hard block: operator-certificate semantics presented as ACTIVE architecture ──
for pat in "${CERTIFICATE[@]}"; do
  hits="$(grep -rniEI "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  operator-certificate semantics matching /$pat/ (use conformance evidence — operador com evidência verificável de conformidade protocolar; there is no operator certificate, no CA signature, no certification path):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Hard block: the Regra de Verificação Tripla — use Open Trust Evaluation ──
for pat in "${TRIPLE[@]}"; do
  hits="$(grep -rniEI "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  removed pre-trust ritual matching /$pat/ — use Open Trust Evaluation (signed protocol metadata → delegated signing keys → operator manifest + conformance evidence + public registry + revocation, closed-by-default):"
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

# ── Hard block: pip / Docker / GitHub Actions / CLI offered as an OPERATOR flow ──
for pat in "${METHODS[@]}"; do
  hits="$(grep -rniEI "${GREP_EXCL[@]}" "$pat" "${OPERATOR_SURFACES[@]}" 2>/dev/null | methods_filter "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  external runner matching /$pat/ offered as an operator method — the operator path is the BanzAI Workbench (Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces). CI/scripts/Rust tests are for protocol maintainers; mark maintainer/internal if that is what the line is:"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "governance-docs-clean: ✓ governance docs present only the active open-protocol model (no central authority; no operator-certificate semantics; no Verificação Tripla; no BANZA CA; no operator-facing pip/Docker/CI)."
fi
exit "$fail"
