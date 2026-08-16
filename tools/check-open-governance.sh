#!/usr/bin/env bash
#
# BANZA Open Protocol Governance Guard (M2.2).
#
# Scans the PUBLIC-RENDERED surfaces (website content/app/components + published reference docs) for the
# REMOVED architecture: a central human authority over operators. BANZA is an open financial protocol —
# participation does not depend on a central human authority. Independent operators implement the
# protocol, publish manifests and produce verifiable conformance evidence. Humans maintain and evolve the
# protocol; they do not authorise, certify, accept or approve operators.
#
# Canonical rule: A governação do BANZA mantém o protocolo; não controla quem pode ou não implementar o
# protocolo.
#
# A line that clearly NEGATES or EXPLAINS a boundary is allowed — a boundary sentence naming what BANZA is
# NOT is how the active model states its own edges. Deny-lists, negative tests and clearly-marked legacy
# compatibility are allowed. Everything else is NEEDS_FIX.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.
# See docs/governance/OPEN_PROTOCOL_GOVERNANCE.md.

set -euo pipefail
cd "$(dirname "$0")/.."

# Every published surface is in scope. The product presents ONE architecture — the active model — and this
# guard holds two lines on it:
#   1. no central authority over operators, no operator-approval step, no issued artifact standing in for
#      verifiable evidence, no permissioned-network framing;
#   2. no transition narrative. There is no "before" to describe: a reader must not meet a removed model,
#      a supersession note, or a deprecation banner on a product surface.
#
# Out of scope BY DESIGN — internal engineering records of work done, not product surfaces; scanning them
# would report the record of the work itself:
#   decisions/adr/                                      — decision records. A superseded ADR preserves the
#                                                         old model as history; a superseding ADR must
#                                                         describe what it replaces. Supersession is
#                                                         machine-checked by banza-reference-trust-model
#                                                         instead (a superseding ADR must name what it
#                                                         replaces).
#   engines/                                            — deny-lists and negative tests (the engines must
#                                                         DETECT these terms); their real outputs are pinned
#                                                         by cargo tests, which beat a grep over source.
#
# This guard is a best-effort TEXT LINTER — defence in depth, not the authority. The authoritative,
# machine-checked enforcement is banza-open-governance + banza-reference-trust-model plus each engine suite.
#
# engines/banzai-evidence/src is deliberately NOT scanned. Its source is an intent ROUTER: the removed
# terms appear there as match keywords ("banza ca autoriza" → route to the refusal) — a deny-list, which
# this guard is required to permit. Grepping it would report the deny-list and miss nothing real, because
# the Assistente's actual answers are pinned by 68 Rust tests, including boundary.rs asserting that a
# refusal must NOT name the removed authority and kb.rs pinning the deprecation answer. An executed test
# over the real output is a stronger check than a grep over the source, so that is where it lives.
#
# This guard is a best-effort TEXT LINTER — defence in depth, not the authority. The authoritative,
# machine-checked enforcement is banza-open-governance (34 tests) plus each engine's own suite.
SURFACES=(
  website/app
  website/components/banzai
  docs/reference/pt/BANZA_REFERENCIA.md
  docs/reference/pt/completa.md
  docs/reference/en/complete.md
  docs/reference/manifesto.md
  docs/reference/overview.md
  docs/reference/getting-started.md
  docs/reference/conformance.md
  README.md
  docs/governance/OPEN_PROTOCOL_ARCHITECTURE.md
  docs/governance/OPEN_PROTOCOL_GOVERNANCE.md
  docs/governance/PROTOCOL_GOVERNANCE_ROLES.md
  docs/governance/OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md
  docs/governance/PROTOCOL_SUCCESSION_AND_SURVIVAL.md
  docs/governance/FEDERATION_TRUST_MODEL.md
  docs/governance/PUBLIC_PROTOCOL_REGISTRY.md
)

# ── Allowlist: CLAUSE-scoped, not line-scoped ─────────────────────────────────
# A line-level allowlist is useless here: almost every boundary sentence in this project contains "não",
# so "any line containing não is fine" would clear nearly everything — including
#   "Quem certifica os operadores? A BANZA certifica operadores."   (a '?' elsewhere on the line)
#   "Um operador certificado consta do registo, mas não é aprovado." (a 'não' about something else)
# So a hit is cleared only when the exculpating marker sits IMMEDIATELY BEFORE the matched term:
#
#   NEG_NEAR  — a negation/deprecation marker within ~45 chars before the term, not crossing a sentence
#               end. Clears "o BANZA não certifica operadores" but not the two lines above.
#   MENTION   — the term is directly preceded by a quote/emphasis char, i.e. it is being NAMED
#               (a deprecation-mapping row: | "operador certificado" | … |), not used.
#   DEPRECATION_LINE — line-level, deliberately: a doc line explicitly marked removed/deprecated/legacy is
#               the record of the removal, and may discuss the old concept in prose.
# NOTE: use the literal UTF-8 "não" (a bracket like [ãa] does not match the multibyte ã under grep -E).
NEG_BEFORE='não|nao|nunca|never|\bnot\b|nobody|neither|\bnem\b|\bsem\b|without|evitar|avoid|deny|nenhum|nenhuma|ninguém|ninguem|removid|removed|deprecat|depreciad|obsolet|antigo|antiga|\bold\b|former|previously|formerly|used to|deixou de|já não|ja nao|rather than|instead of|unlike|ao contrário|ao contrario|face a|em vez de|diferença|diferenca'
DEPRECATION_LINE='removid|removed|deprecat|depreciad|histórico|historico|obsolet|já não|ja nao|deixou de|superseded|supersed|substituíd|substituid'
QUOTE='[«»"*`_]'
# The mention rule applies to MARKDOWN ONLY. In prose, quoting a term is how you name it. In code every
# string literal is quoted, so a quote proves nothing — `text="A BANZA CA certifica operadores"` is
# user-facing copy, not a mention. Applying the rule to .ts/.tsx would silently gut the guard there.
#
# A mention is the term sitting INSIDE a quoted/emphasised span — `| "operador aceite / aprovado /
# autorizado pela BANZA" |` or `| **Human Gatekeeper** |`. Requiring the quote to sit immediately before
# the term is too narrow (it misses both of those). Requiring only a preceding quote is too loose (a bold
# lead-in would clear an unrelated claim later on the line). So: quote … term … closing quote, and never
# across a `|` — a quote in one table cell must not exculpate a claim in the next.
MENTION_SPAN="$QUOTE[^|]{0,90}(PAT)[^|]{0,90}$QUOTE"

# The negation can sit EITHER before the term ("nenhuma autoridade certifica operadores") or INSIDE the
# matched span, between the subject and the verb ("o BANZA não certifica operadores") — the second is the
# form almost every boundary sentence in this project takes, so both must clear.
NEG_SUBJECT='banza[^.!?]{0,25}(não|nao|nunca|never|\bsem\b|nenhum|ningu[ée]m)'

# Drop the hits that a clause-scoped marker exculpates. $1 = the pattern that produced the hits.
filter_hits() {
  local pat="$1"
  local mention="${MENTION_SPAN/PAT/$pat}"
  grep -viE "($NEG_BEFORE)[^.!?]{0,90}($pat)" \
    | grep -viE "$NEG_SUBJECT" \
    | grep -viE "^[^:]*\.md:[0-9]+:.*$mention" \
    | grep -viE "$DEPRECATION_LINE" || true
}

# Common exclusions: test files and banzai-agent.ts (whose FORBIDDEN_PHRASES lists the forbidden phrases
# verbatim; its real UI copy is guarded by components/banzai/workbench.test.ts).
GREP_EXCL=(--exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts' --exclude='banzai-agent.ts')

fail=0
warn=0

# ── Self-test (M2.2): exercise the real filter on every run. Each probe is a line the guard MUST or MUST
#    NOT report; broken logic exits 2 rather than passing silently. These probes are the mutations an
#    adversarial review used against an earlier, line-scoped version of this guard — all of which it
#    wrongly allowed. ──
AUTH_PAT='banza[^.]{0,30}(certifica|aprova|aceita)[^.]{0,20}operador'
CERT_PAT='operador[es]* certificad'
st_fail=0
# `legacy` is real, live vocabulary in exactly two places, so the rule filters rather than bans:
#   1. the /certificates compatibility route — a published surface that keeps answering;
#   2. the Rust-first legacy allowlist (ADR-038) — the named set of not-yet-migrated non-Rust code.
#
# (2) clears a line ONLY when that line carries no trust vocabulary. That stops the exemption being
# borrowed: "the legacy TypeScript certificate adapter" names a language, but it also names a
# certificate, so it still reports. A line with no trust vocabulary cannot be narrating the trust model.
LEGACY_ROUTE='/certificates|certificates route|rota /certificates|compatibilidade'
LEGACY_RUST='rust-first|rust rule|rust_rule|allowlist|\bpython\b|\btypescript\b|\bbash\b|engines/'
TRUST_VOCAB='certificat|certificad|banza ca|\btrust\b|confian|federa|operador|operator|aprova|approv|autoriza|authoris|authoriz|verifica|verific|registo|registry|revoca|revoga|manifest'
legacy_filter() { # stdin: `file:line:text` hits containing `legacy` → stdout: the ones to report
  # A line explicitly marked as a removal/deprecation record (DEPRECATION_LINE) is the record of the
  # removal — it may name the old concept in prose, exactly as the AUTHORITY/CERTIFICATE hard-blocks already
  # permit through filter_hits. A live "legacy trust model" line (no removal marker) is NOT cleared here.
  grep -viE "$LEGACY_ROUTE" | grep -viE "$DEPRECATION_LINE" | while IFS= read -r line; do
    printf '%s' "$line" | grep -qiE "$LEGACY_RUST" \
      && ! printf '%s' "$line" | grep -qiE "$TRUST_VOCAB" \
      && continue
    printf '%s\n' "$line"
  done
}

must_report() { # <label> <pattern> <line>
  if ! printf '%s\n' "$3" | filter_hits "$2" | grep -q .; then echo "SELFTEST_FAIL not reported: $1"; st_fail=1; fi
}
must_allow() { # <label> <pattern> <line>
  if printf '%s\n' "$3" | filter_hits "$2" | grep -q .; then echo "SELFTEST_FAIL wrongly reported: $1"; st_fail=1; fi
}

# MUST report — affirmative claims, including ones carrying an unrelated '?' or 'não' elsewhere.
must_report "plain authority claim" "$AUTH_PAT" 'x.md:1:A BANZA certifica operadores e emite o certificado.'
must_report "claim after an unrelated question" "$AUTH_PAT" 'x.md:2:Quem certifica os operadores? A BANZA certifica operadores e emite o certificado.'
must_report "claim with an unrelated negation" "$CERT_PAT" 'x.md:3:Um operador certificado consta do registo, mas não é aprovado.'
must_report "claim hidden in a later table cell" "$AUTH_PAT" 'x.md:4:| **Autoridade** | A BANZA aprova operadores. | activo |'
# Accented patterns must behave identically under BSD grep (macOS) and GNU grep (CI). A bracket holding a
# multibyte char silently never matches on BSD — so these are spelled as full alternations, and pinned here.
must_report "accented pattern fires (macOS/Linux parity)" '(certificação de operador|certificacao de operador)' 'x.md:41:Pressupõe certificação de operador activa.'

# MUST report — Portuguese prose must not be silenced by English function words. An adversarial review
# defeated this guard twice here: `nem\b` fired on the tail of "defi-NEM", and `\bno\b` (an English
# negation) is the Portuguese preposition "in the". Both cleared real claims on the PT reference.
must_report "claim after the verb 'definem'" "$CERT_PAT" 'x.md:11:As regras que definem a federação exigem um operador certificado.'
must_report "claim after the preposition 'No'" "$AUTH_PAT" 'x.md:12:No modelo actual a BANZA certifica cada operador da rede.'

# MUST allow — the negation is about the term itself, or the term is quoted, or the line is deprecation.
must_allow "negated claim" "$AUTH_PAT" 'x.md:5:O BANZA não certifica operadores.'
must_allow "quoted mention in a mapping row" "$CERT_PAT" 'x.md:6:| "operador certificado" | evidência verificável |'
must_report "a quoted string in CODE is copy, not a mention" "$AUTH_PAT" 'ui.tsx:64:  text: "A BANZA certifica operadores.",'
must_allow "term inside a longer quoted phrase" '(aceite|aprovad[oa]|autorizad[oa]) pela banza' 'x.md:61:| "operador aceite / aprovado / autorizado pela BANZA" | operador independente |'
must_allow "term inside a bold role name" '\bgatekeeper\b' 'x.md:62:| **Human Gatekeeper** | Não existe portão. |'
must_report "bold lead-in must not clear a later claim" "$AUTH_PAT" 'x.md:63:**Nota**: A BANZA certifica operadores.'
must_allow "explicitly deprecated line" "$CERT_PAT" 'x.md:7:O termo operador certificado foi removido em M2.2.'

# M2.4 — the broadened certificate-token forms. Each MUST report an ACTIVE claim and MUST clear a
# boundary negation, a backtick mapping row, or a line marked removed.
must_report "certificate test vector as active"        'valid[_ ]?certificate'                         'x.md:20:O vector valid_certificate está activo e confirma o operador.'
must_report "a ca signature claim"                     '\bca[_ ]signature\b'                            'x.md:21:A ca signature da BANZA valida o operador na federação.'
must_report "FED-CERT as an active certifying suite"   'fed-cert[^.]{0,25}(certif|emite|autoriza|aprova)' 'x.md:22:A suite FED-CERT certifica o operador em produção.'
must_report "certificate_url in a federation contract" 'certificate[_ ]?url'                            'federation.contract.json:23:  "certificate_url": "https://op.example/cert",'
must_report "certified operator in UI copy"            'certified[_ ]?operator'                         'ui.tsx:24:  label: "certified operator badge",'
must_report "Assistente narrates a removed cert check" '\b(validou|validava|validavam|validaram|valida|validam|validate|validated|validates|validating)\b[^.]{0,20}certificad' 'chat.tsx:25:Antes validava certificados; agora usa evidência verificável.'
must_report "operator_certificate id as active"        'operator[_ ]?certificate'                       'x.md:26:O operator_certificate é emitido no fim do fluxo.'
must_report "certificate_based_trust as active"        'certificate[_ ]?based[_ ]?trust'                'x.md:27:O modelo assenta em certificate_based_trust do operador.'
must_allow "negated certificate_url boundary"          'certificate[_ ]?url'                            'x.md:28:O BANZA não expõe certificate_url nem emite certificados de operador.'
must_allow "negated certified-operator boundary"       'certified[_ ]?operator'                         'x.md:29:Não existe certified operator: o operador publica evidência verificável.'
must_allow "removed valid_certificate field"           'valid[_ ]?certificate'                          'x.md:30:O campo valid_certificate foi removido em M2.4.'
must_allow "backtick mapping-row mention"              'operator[_ ]?certificate'                       'x.md:31:| `operator_certificate` | evidência verificável de conformidade |'

# The issuer rule: BANZA named as the ISSUER of an operator certificate reports; the revocation-list /
# signed-metadata issuer (BANZA is the trust root that signs those) is exempt.
ISSUER_EXEMPT='revoca|revoga|\bbrl\b|revocation|revoked|manifest|metadata'
ISSUER_PAT='issuer["=: .]{0,5}banza'
if ! printf '%s\n' 'cert.json:1:"issuer": "BANZA" no certificado do operador.' | grep -viE "$ISSUER_EXEMPT" | filter_hits "$ISSUER_PAT" | grep -q .; then
  echo "SELFTEST_FAIL issuer: certificate-issuer claim not reported"; st_fail=1
fi
if printf '%s\n' 'brl.json:2:"issuer": "BANZA" na lista de revogação assinada.' | grep -viE "$ISSUER_EXEMPT" | filter_hits "$ISSUER_PAT" | grep -q .; then
  echo "SELFTEST_FAIL issuer: revocation-list issuer wrongly flagged"; st_fail=1
fi

# The CA rule is stricter: a stray negation must NOT clear a line that still presents the authority as live.
ca_probe='ui.tsx:8:A certificação é uma decisão da BANZA CA. PASS não é certificado.'
if ! printf '%s\n' "$ca_probe" | grep -viE "$QUOTE[[:space:]]*banza[ -]ca" | grep -viE "$DEPRECATION_LINE" | grep -q .; then
  echo "SELFTEST_FAIL CA rule: live-authority line wrongly allowed by a stray negation"; st_fail=1
fi
if printf '%s\n' 'doc.md:9:O conceito BANZA CA foi removido como autoridade de operadores.' | grep -viE "$QUOTE[[:space:]]*banza[ -]ca" | grep -viE "$DEPRECATION_LINE" | grep -q .; then
  echo "SELFTEST_FAIL CA rule: deprecated line wrongly flagged"; st_fail=1
fi

# The `legacy` rule: the two live uses clear, and neither exemption may be borrowed to narrate trust.
lg_report() { # <label> <line>
  if ! printf '%s\n' "$2" | legacy_filter | grep -q .; then echo "SELFTEST_FAIL legacy not reported: $1"; st_fail=1; fi
}
lg_allow() { # <label> <line>
  if printf '%s\n' "$2" | legacy_filter | grep -q .; then echo "SELFTEST_FAIL legacy wrongly reported: $1"; st_fail=1; fi
}
lg_allow  "the /certificates route"        'doc.md:1:A rota legacy /certificates continua a responder.'
lg_allow  "the /certificates route naming a field" 'doc.md:8:A rota legacy /certificates devolve o campo production_certificates.'
lg_allow  "the ADR-038 legacy allowlist"   'README.md:2:UI/glue, Python is temporary legacy. A CI guard blocks new non-Rust engines.'
lg_allow  "a legacy concept marked as a removal record" 'ui.tsx:9:// the legacy in-browser journey + evidence-session model was removed.'
lg_report "legacy narrating the trust model" 'doc.md:3:O legacy trust model assentava num certificado emitido pela BANZA.'
lg_report "a language name may not clear a trust line" 'doc.md:4:The legacy TypeScript certificate adapter is gone.'
lg_report "bare legacy with no live use"    'doc.md:5:This is the legacy design.'

[ "$st_fail" -eq 0 ] || { echo "open-governance: guard self-test FAILED"; exit 2; }

# ── Hard block: the removed central authority presented as ACTIVE architecture ──
AUTHORITY=(
  'banza ca (autoriza|certifica|aprova|aceita|emite|revê|revisa)'
  'banza[^.]{0,30}(certifica|aprova|aceita)[^.]{0,20}operador'
  'banza[^.]{0,30}autoriza[^.]{0,20}operador'
  '(aceite|aprovad[oa]|autorizad[oa]|licenciad[oa]) pela banza'
  'certificate authority'
  'certification authority'
  'autoridade certificadora'
  'banza[^.]{0,30}emite[^.]{0,20}licen'
  'banza[^.]{0,30}precisa de licen'
  '\bgatekeeper\b'
  'human (operator )?approval'
  'manual (operator )?approval'
  'central authority accepts operators'
  '(aprovação|aprovacao) (humana|manual) (de|do) operador'
)
for pat in "${AUTHORITY[@]}"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  removed central-authority architecture matching /$pat/ (humans maintain the protocol; they do not authorise/certify/accept/approve operators):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Hard block: operator-certificate semantics presented as ACTIVE architecture ──
# M2.4 broadens the identifier forms: the same claim reads as prose ("operator certificate"), as a
# snake_case field ("operator_certificate"), or camelCase ("OperatorCertificate", lower-cased to
# "operatorcertificate" — the `[_ ]?` makes the separator optional and never matches a hyphen, so the
# `banza-operator-conformance-lifecycle` SVG file names are untouched). `production[_ ]certificate\b`
# ends on a word boundary so it catches the singular but never the pinned `production_certificates`
# compatibility field. `fed-cert` is only a claim when a certify verb sits right after it — the
# `FED-CERT to FED-FAIL` conformance test-group range carries none. The last row catches an Assistente
# describing a removed certificate check ("antes validava certificados"); a clause-scoped negation
# ("não valida certificados") is still cleared by filter_hits.
CERTIFICATE=(
  '(certificado válido|certificado valido)'
  'valid[_ ]?certificate'
  'certificate-based federation'
  'certificate[_ ]?based[_ ]?trust'
  'operador[es]* certificad'
  'certified[_ ]?operator'
  'operator[_ ]?certificate'
  'certificate[_ ]?payload'
  'certificate[_ ]?url'
  '\bca[_ ]signature\b'
  'production[_ ]certificate\b'
  '(certificado de produção|certificado de producao)'
  '(certificação de operador|certificacao de operador)'
  'operador[es]* (aceite|aprovad)'
  'approved operator'
  'accepted operator'
  'fed-cert[^.]{0,25}(certif|emite|autoriza|aprova)'
  '\b(validou|validava|validavam|validaram|valida|validam|validate|validated|validates|validating)\b[^.]{0,20}certificad'
)
for pat in "${CERTIFICATE[@]}"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  operator-certificate semantics matching /$pat/ (use conformance evidence / operador com evidência verificável de conformidade protocolar):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── Hard block: BANZA named as the ISSUER of an operator certificate. In the active model BANZA is the
#    trust root that signs protocol metadata and the revocation list, so an "issuer: BANZA" line in a
#    revocation-list / signed-metadata / key-manifest context is expected and exempt (ISSUER_EXEMPT).
#    What is removed is BANZA issuing an operator certificate. filter_hits still clears negations and
#    quoted mentions. Pinned by the issuer self-test probes above. ──
issuer="$(grep -rniE "${GREP_EXCL[@]}" "$ISSUER_PAT" "${SURFACES[@]}" 2>/dev/null | grep -viE "$ISSUER_EXEMPT" | filter_hits "$ISSUER_PAT" || true)"
if [ -n "$issuer" ]; then
  echo "NEEDS_FIX  BANZA presented as the issuer of an operator certificate — BANZA signs protocol metadata and the revocation list as the trust root; it does not issue operator certificates:"
  echo "$issuer" | sed 's/^/    /'
  fail=1
fi

# ── Special rule (M2.2): naming "BANZA CA" as a live entity is NEEDS_FIX unless the line marks it as
#    removed/deprecated/legacy/historical or negates it. The deprecation record is the only place the
#    term belongs; a bare mention on a public surface reads as active architecture. ──
# The CA rule is stricter still: only an explicit deprecation marker or a quoted mention clears it.
# A stray negation about something else does NOT ("A certificação é uma decisão da BANZA CA. PASS não é
# certificado." still presents the authority as live).
ca_mention="${MENTION_SPAN/PAT/banza[ -]ca}"
# ── Hard block: transition narrative on a product surface. The protocol is presented as it is; a reader
#    must not be taught an architecture that is not the one in force. The inventories, the phase reports and
#    the deny-lists are out of scope above precisely so this rule can be absolute here.
# Narrate a removed architecture and this fires. Ordinary protocol vocabulary does not: a manifest may
# "supersede one another" (versioning), and secrets may leak through git "históricos" (history) — neither
# tells the reader about a design BANZA discarded. So the terms are the shapes that actually narrate one.
NARRATIVE='superseded \(|superseded by|supersession|deprecated|deprecation|registo histórico|como histórico|mantidos publicados|modelo antigo|antigo modelo|old model|former model|previous model|foi removid|foi substitu|antigamente|antes era|verificação tripla|verificacao tripla|triple verification'
narrative="$(grep -rniE "${GREP_EXCL[@]}" "$NARRATIVE" "${SURFACES[@]}" 2>/dev/null || true)"
if [ -n "$narrative" ]; then
  echo "NEEDS_FIX  transition narrative on a product surface — present the active model directly (signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys, revocation with closed-by-default semantics). There is no previous model to describe here:"
  echo "$narrative" | sed 's/^/    /'
  fail=1
fi

# ── Hard block: `legacy` used to narrate a trust design BANZA does not have.
# The two live uses (the /certificates route, the ADR-038 legacy allowlist) clear via legacy_filter,
# which is defined next to the self-test above and pinned by its probes.
legacy="$(grep -rniE "${GREP_EXCL[@]}" '\blegacy\b' "${SURFACES[@]}" 2>/dev/null | legacy_filter || true)"
if [ -n "$legacy" ]; then
  echo "NEEDS_FIX  'legacy' on a product surface. It may name the /certificates compatibility route, or the Rust-first legacy allowlist (ADR-038) on a line that carries no trust vocabulary — nothing else:"
  echo "$legacy" | sed 's/^/    /'
  fail=1
fi

ca="$(grep -rniE "${GREP_EXCL[@]}" 'banza ca\b|banza-ca\b' "${SURFACES[@]}" 2>/dev/null | grep -viE "^[^:]*\.md:[0-9]+:.*$ca_mention" | grep -viE "$DEPRECATION_LINE" || true)"
if [ -n "$ca" ]; then
  echo "NEEDS_FIX  'BANZA CA' named as active architecture — the concept was removed in M2.2. Use Protocol Governance / Trust Root / Conformance Automation / Protocol Maintainers, or mark the line as deprecated/legacy:"
  echo "$ca" | sed 's/^/    /'
  fail=1
fi

# ── Hard block: an AFFIRMATIVE permissioned-network claim. Denials are canonical and expected ("O BANZA
#    não é uma rede permissionada por uma autoridade humana central"), so the NEG allowlist applies. ──
permissioned="$(grep -rniE "${GREP_EXCL[@]}" 'rede permissionada|permissioned network' "${SURFACES[@]}" 2>/dev/null | filter_hits 'rede permissionada|permissioned network' || true)"
if [ -n "$permissioned" ]; then
  echo "NEEDS_FIX  permissioned-network framing — BANZA é um protocolo financeiro aberto com regras públicas e evidência verificável, não uma rede permissionada por uma autoridade humana central:"
  echo "$permissioned" | sed 's/^/    /'
  fail=1
fi

# ── Hard block: "corpus" / public "KB" anywhere in public UI/content ──
# website/content/decisions/ is the rendered ADR/RFC decision-record mirror (developer-facing technical
# decisions, byte-copied from decisions/adr|rfc); technical ADRs legitimately use "corpus" (e.g. ADR-036/056
# "canonical corpus"). The marketing-token block targets user-facing product copy, not verbatim ADR text.
for pat in '\bcorpus\b' '\bKB\b'; do
  hits="$(grep -rnE --exclude-dir=decisions "${GREP_EXCL[@]}" "$pat" website/content website/app website/components 2>/dev/null | grep -viE 'CORPUS_HASH|load_corpus|toContain|//|/\*' || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  forbidden public token /$pat/ in UI/content:"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

# ── WARN only: "protocolo técnico" as the primary public framing ──
soft="$(grep -rniE "${GREP_EXCL[@]}" '(protocolo técnico|protocolo tecnico)' "${SURFACES[@]}" 2>/dev/null || true)"
if [ -n "$soft" ]; then
  echo "WARN  'protocolo técnico' found — prefer 'protocolo financeiro aberto' as the lead framing:"
  echo "$soft" | sed 's/^/    /'
  warn=1
fi

if [ "$fail" -eq 0 ]; then
  if [ "$warn" -eq 0 ]; then
    echo "open-governance: ✓ no central human authority over operators; no operator-certificate semantics; no permissioned-network framing; no public corpus/KB."
  else
    echo "open-governance: ✓ no NEEDS_FIX (see WARN above)."
  fi
fi
exit "$fail"
