#!/usr/bin/env bash
#
# BANZA Website Public-Copy Currency Guard (M2.9F — Website Audit Fix Pass).
#
# The public website must describe the protocol and BanzAI as they are TODAY: BanzAI is the
# "Agente BanzAI" / "agente do protocolo" that guides and orchestrates, the Rust/WASM engines verify,
# and the evidence proves. This guard blocks retired vocabulary from re-entering the CURRENT public
# copy — the English product label "BanzAI Agent", the retired "Assistente" identity, the removed
# CA/certificate model, and the pre-M2.8 demonstration-mode framing.
#
# SCOPE — current public copy only:
#   website/app/**, website/components/**, website/lib/**   (excluding *.test.ts/tsx and lib/wasm)
#   docs/reference/pt/BANZA_REFERENCIA.md
#
# DELIBERATELY OUT OF SCOPE — website/content/decisions/** (the ADR/RFC corpus).
# Those are ARCHIVAL DECISION RECORDS rendered verbatim at /decisoes/[slug]. ADR-036/045/046 describe
# the earlier `mock` default, precisely BECAUSE that was the decision at the time. Rewriting them would
# falsify the governance record. Their supersession is expressed through status metadata in
# website/lib/decisions.ts, not by edits.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."

# Deterministic UTF-8 locale so multibyte accented markers match the same way here and in CI.
if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

REFERENCIA="docs/reference/pt/BANZA_REFERENCIA.md"
FOOTER="website/components/SiteFooter.tsx"
# M2.16: the homepage is the dossier BanzAI-first hero (page.tsx + HomeHeroDiagram + HomeAsk), rendered
# above the global SiteFooter.
HOME_SET=("website/app/(pt)/page.tsx"
          "website/components/home/HomeAsk.tsx" "website/components/home/HomeHeroDiagram.tsx" "$FOOTER")

# Current-copy source files (never tests, never the archival decision corpus, never wasm bundles).
current_files() {
  find website/app website/components website/lib -type f \
       \( -name '*.ts' -o -name '*.tsx' \) \
       ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.spec.ts' \
       ! -path 'website/lib/wasm/*' 2>/dev/null | sort
  [ -f "$REFERENCIA" ] && echo "$REFERENCIA"
}

# ── Detectors ────────────────────────────────────────────────────────────────
#
# GROUP A — retired vocabulary with NO legitimate use anywhere in current source (not even as an
# identifier or comment). A hit is a defect wherever it appears.
# NOTE: multibyte characters are spelled out in full alternations rather than bracket classes
# (e.g. "demonstração|demonstracao", never "demonstra[çc][ãa]o") — bracket expressions over
# multibyte UTF-8 are unreliable across BSD/GNU grep and silently fail to match.
#
# Split by case-sensitivity, because capitalisation is what distinguishes a retired PROPER NOUN from
# ordinary Portuguese or an internal identifier:
#   "BanzAI Agent" (retired English product label)  vs  "BanzAI agente nativo" (correct Portuguese)
#   "Assistente"   (retired identity noun)          vs  activeTool === "assistente" (internal key)
RETIRED_CASE='BanzAI Agent|BanzAI Web|\bAssistente\b|BANZA CA\b|Certificate Authority'
RETIRED_ANY='mock provider|provider mock|modo demonstração|modo demonstracao|llm_calls ?= ?0|\bWorkbench\b|certification authority|default blocked|Qwen preview'

# M2.19G (ADR-032): operator/entity certification is a REMOVED label AS AN ACTIVE CLAIM, but the current
# canonical copy legitimately NAMES it in NEGATED, guillemet-QUOTED or ABSENCE contexts — the reference
# status line "sem operador certificado em produção", the operadores page saying what stops the registry
# being read as a list of «operadores certificados», and the reference stating that «certificado de
# operador» does NOT exist. So it is scanned separately from RETIRED_ANY and cleared when a
# negation/absence marker or a guillemet-quoted mention sits on the line; an ACTIVE claim ("um operador
# certificado consta do registo") carries none and still flags. The footer badge form is additionally
# pinned by the dedicated footer check below, so "sem" clearing here never lets the footer badge through.
OPERATOR_CERT='operador(es)? certificado(s)?|certificado de operador'
OPERATOR_CERT_OK='não|nao|nunca|\bnem\b|\bsem\b|jamais|nenhum|nenhuma|ningu[ée]m|removid|removed|deprecat|superseded|deixou de|já não|ja nao|«[^»]{0,120}(operador(es)? certificado(s)?|certificado de operador)[^»]{0,120}»'

# M2.19E/F.2: BanzAI is now ONE canonical route (/banzai) with two modes (ask + validation). The
# "BanzAI Web" brand and the "Validation Workbench" / "BanzAI Web Validation Workbench" product are
# RETIRED — validation is a mode of the single BanzAI app (/banzai?mode=validation), never a separate
# branded surface. So the bare word "Workbench" (RETIRED_ANY) and "BanzAI Web" (RETIRED_CASE) are again
# forbidden in current public copy. The earlier M2.19E/F WORKBENCH_OK whitelist that treated the
# "Validation Workbench" phrasing as current vocabulary is dropped.
#
# The ONLY carve-out that remains is the archival ADR-035 FILENAME (`…-banzai-validation-workbench.md`):
# website/lib/decisions.ts must reference the decision record by its real, immutable path/canonicalUrl
# (its human-facing title/summary already say the current "validada no BanzAI"). That lowercase,
# hyphenated filename fragment is not a brand mention on the screen — it is a verbatim path to an archival
# record — so it is cleared here, while the "Validation Workbench" brand phrase and bare "Workbench" are not.
WORKBENCH_OK='banzai-validation-workbench'

# The canonical denylist itself enumerates these retired phrases so the agent can refuse them. A
# guard that scans it would flag the very list that enforces the rule (a known false-positive class
# in this repo — check-public-surface-clean.sh excludes the same file).
DENYLIST_FILE='website/components/banzai/banzai-agent.ts'

# GROUP B — words that ARE legitimate as code identifiers (fixtureKey, ChatTurn, assistantPlaceholder,
# id="chat") but must never reach the screen. Only RENDERED positions are checked (see rendered_text).
RETIRED_RENDERED='\bfixture\b|\bchat\b|\bassistant\b'

# The removed footer disclaimer. The current short boundary line says "camada aberta de regras".
FOOTER_LONGPARA='conjunto de regras públicas|não tem personalidade jurídica|não constitui aconselhamento'

# Internal milestone tags in the main public copy of home/footer (slash form or uppercase-suffixed).
# SVG path data ("M3.5 19") never matches, because a milestone needs the slash or a capital suffix.
MILESTONE='M[0-9]/M[0-9]|M[0-9]\.[0-9]+[A-Z]'

# strip /* ... */ (incl. JSX {/* */}) blocks and whole-line // comments.
visible() { perl -0777 -pe 's{/\*.*?\*/}{}gs' "$1" 2>/dev/null | grep -vE '^\s*//' || true; }

# Approximate the strings a visitor actually SEES: JSX text nodes plus the values of user-facing
# props. Deliberately conservative — it under-reports rather than firing on internal identifiers.
rendered_text() {
  visible "$1" \
    | grep -oE '>[^<>{}]{2,}<|(title|label|placeholder|aria-label|subtitle|summary|alt|value)="[^"]{2,}"' \
    || true
}

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }

# ── Self-test: exercise the real detection on every run. ─────────────────────
st_fail=0
scan()  { printf '%s\n' "$2" | grep -iE "$1" || true; }   # case-insensitive detectors
scanC() { printf '%s\n' "$2" | grep -E  "$1" || true; }   # case-SENSITIVE detectors
must_flagC() { local o; o="$(scanC "$2" "$3")"; [ -n "$o" ] || { echo "SELFTEST_FAIL not flagged: $1"; st_fail=1; }; }
must_passC() { local o; o="$(scanC "$2" "$3")"; [ -z "$o" ] || { echo "SELFTEST_FAIL wrongly flagged: $1"; st_fail=1; }; }
must_flag() { local o; o="$(scan "$2" "$3")"; [ -n "$o" ] || { echo "SELFTEST_FAIL not flagged: $1"; st_fail=1; }; }
must_pass() { local o; o="$(scan "$2" "$3")"; [ -z "$o" ] || { echo "SELFTEST_FAIL wrongly flagged: $1"; st_fail=1; }; }
# operator/entity certification: active claim flags; a negated/quoted/absence mention passes.
oc_detect()  { printf '%s\n' "$1" | grep -iE "$OPERATOR_CERT" | grep -viE "$OPERATOR_CERT_OK" || true; }
must_flag_oc() { local o; o="$(oc_detect "$1")"; [ -n "$o" ] || { echo "SELFTEST_FAIL not flagged (oc): $1"; st_fail=1; }; }
must_pass_oc() { local o; o="$(oc_detect "$1")"; [ -z "$o" ] || { echo "SELFTEST_FAIL wrongly flagged (oc): $1"; st_fail=1; }; }

must_flagC "retired: BanzAI Agent"        "$RETIRED_CASE" '<span>BanzAI Agent</span>'
must_flagC "retired: Assistente identity" "$RETIRED_CASE" '<span>Assistente</span>'
must_flag "retired: mock provider"       "$RETIRED_ANY" 'provider: mock provider em uso'
must_flag "retired: modo demonstração"   "$RETIRED_ANY" 'a correr em modo demonstração'
must_flag "retired: llm_calls=0"         "$RETIRED_ANY" 'estado: llm_calls=0 · mock'
must_flag "retired: Workbench"           "$RETIRED_ANY" 'Abrir o Workbench'
must_flag "retired: Validation Workbench" "$RETIRED_ANY" 'the BanzAI Web Validation Workbench'
must_flagC "retired: BanzAI Web brand"    "$RETIRED_CASE" '<span>BanzAI Web</span>'
must_passC "allowed: BanzAI (no Web)"     "$RETIRED_CASE" '<span>BanzAI — agente do protocolo</span>'
# operator/entity certification: active claim flags; negated/quoted/absence current copy passes.
must_flag_oc 'um operador certificado consta do registo'                          # active claim → flags
must_pass_oc 'v1.0 · pré-produção · pagamentos reais desligados · sem operador certificado em produção' # absence → passes
must_pass_oc 'o que impede o registo de ser lido como uma lista de «operadores certificados».'          # guillemet mention → passes
must_pass_oc 'não existe «certificado de operador» nem «entidade certificada».'   # negated + quoted → passes
must_flagC "retired: BANZA CA"            "$RETIRED_CASE" 'a BANZA CA emite o certificado'
must_flagC "retired: Certificate Authority" "$RETIRED_CASE" 'acts as a Certificate Authority'
must_flag "retired: default blocked"     "$RETIRED_ANY" 'local_qwen is default blocked'
must_flag "retired: Qwen preview"        "$RETIRED_ANY" 'Qwen preview mode'
# Current, correct copy must NOT trip group A.
must_passC "allowed: Agente BanzAI"       "$RETIRED_CASE" '<span>Agente BanzAI</span>'
must_pass "allowed: agente do protocolo" "$RETIRED_ANY" 'BanzAI é o agente do protocolo que guia todo o fluxo'
must_pass "allowed: dynamic llm_calls"   "$RETIRED_ANY" '<span>llm_calls={report.llm_calls}</span>'
must_pass "allowed: Qwen local activo"   "$RETIRED_ANY" 'Qwen local activo · inferência local on-host'
must_pass "allowed: canonical triad"     "$RETIRED_ANY" 'BanzAI guia; os motores verificam; a evidência prova; a governança decide.'
# Regressions caught by the first live run of this guard (M2.9F):
must_passC "allowed: PT 'BanzAI agente nativo'" "$RETIRED_CASE" '| **BanzAI agente nativo e não normativo** (§11) |'
must_passC "allowed: internal tool key"         "$RETIRED_CASE" 'const isChat = activeTool === "assistente";'

must_flag "rendered: fixture"   "$RETIRED_RENDERED" '>Carregar fixture válida<'
must_flag "rendered: chat"      "$RETIRED_RENDERED" '>Abrir o chat<'
must_flag "rendered: assistant" "$RETIRED_RENDERED" 'label="assistant reply"'

must_flag "footer long para" "$FOOTER_LONGPARA" 'aberto — um conjunto de regras públicas. Não é um banco…'
must_pass "footer short line" "$FOOTER_LONGPARA" 'O BANZA não é banco, PSP, carteira ou operador financeiro.'

must_flag "milestone slash"  "$MILESTONE" 'a federação depende dos marcos M2/M3'
must_flag "milestone suffix" "$MILESTONE" 'entregue em M2.9F'
must_pass "svg path not milestone" "$MILESTONE" '<path d="M3.5 19a5.5 5.5 0 0 1 11 0" />'

if [ "$st_fail" -ne 0 ]; then
  echo "check-website-public-copy-current: SELF-TEST FAILED — detectors are miscalibrated." >&2
  exit 2
fi

echo "check-website-public-copy-current: verifying current public copy…"

# ── 1) Retired vocabulary anywhere in current public source ──────────────────
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ "$f" = "$DENYLIST_FILE" ] && continue
  hits="$( { visible "$f" | grep -nE  "$RETIRED_CASE"; \
             visible "$f" | grep -nEi "$RETIRED_ANY"; \
             visible "$f" | grep -nEi "$OPERATOR_CERT" | grep -viE "$OPERATOR_CERT_OK"; \
           } | grep -viE "$WORKBENCH_OK" || true)"
  if [ -n "$hits" ]; then
    flag "$f uses retired vocabulary (the public model is: Agente BanzAI guides, the engines verify, the evidence proves):"
    printf '%s\n' "$hits" | sed 's/^/      /' | cut -c1-200
  fi
done < <(current_files)

# ── 2) Code-legitimate words that must not reach the screen ──────────────────
while IFS= read -r f; do
  [ -n "$f" ] || continue
  hits="$(rendered_text "$f" | grep -nEi "$RETIRED_RENDERED" || true)"
  if [ -n "$hits" ]; then
    flag "$f exposes retired wording in RENDERED copy (identifiers are fine; visible text is not):"
    printf '%s\n' "$hits" | sed 's/^/      /' | cut -c1-200
  fi
done < <(current_files)

# ── 3) Footer: short boundary line, never the long disclaimer ────────────────
if grep -nEi "$FOOTER_LONGPARA" "$FOOTER" >/dev/null 2>&1; then
  flag "$FOOTER re-introduced the long legal disclaimer (it must stay a short boundary line)."
fi
if ! grep -qi 'não é banco, PSP, carteira ou operador financeiro' "$FOOTER"; then
  flag "$FOOTER lost the short institutional boundary line ('O BANZA não é banco, PSP, carteira ou operador financeiro.')."
fi
if grep -qiE 'sem operador certificado' "$FOOTER"; then
  flag "$FOOTER says 'sem operador certificado' — use 'sem operador publicado' / 'sem evidência de operador publicada'."
fi

# ── 4) No internal milestone tags in the main home/footer public copy ────────
for f in "${HOME_SET[@]}"; do
  [ -f "$f" ] || continue
  hits="$(visible "$f" | grep -nE "$MILESTONE" || true)"
  if [ -n "$hits" ]; then
    flag "$f leaks an internal milestone tag into the main public copy:"
    printf '%s\n' "$hits" | sed 's/^/      /' | cut -c1-200
  fi
done

# ── 5) Positive assertions: the current model is actually stated ─────────────
# Home v2: the home leads with the OPEN PROTOCOL framing (eyebrow + H1). The BanzAI agent framing lives on
# /banzai + the reference (ch.12) + ADR-036; the home hands off to it via the nav, the "Começar a
# implementar" CTA and the manifest tester's "NO BANZAI" link.
if ! perl -0777 -pe 's/\s+/ /g' "website/app/(pt)/page.tsx" \
     | grep -q 'PROTOCOLO FINANCEIRO ABERTO · v1.0'; then
  flag "The homepage lost the open-protocol framing ('PROTOCOLO FINANCEIRO ABERTO · v1.0')."
fi
# The BanzAI posture is no longer prose on the page: it is derived server-side from the runtime SSOT by
# website/lib/runtimeStatusRow.ts and realized per edition, which is why the page no longer carries these
# words. Checking the page for them tested a form that was deliberately removed — and worse, it would keep
# passing on a page that hardcoded the posture, which is the failure this clause exists to prevent. The
# wording is checked where it is now emitted, in both editions.
RUNTIME_ROW="website/lib/runtimeStatusRow.ts"
# Comments are stripped first. The module's own header prose quotes these phrases while explaining them, so
# scanning the raw file would pass on a module that had stopped emitting a single one of them.
row_code="$(perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g' "$RUNTIME_ROW")"
for phrase in 'Qwen local activo' 'inferência local on-host' 'sem chamadas externas' \
              'estado por resposta' 'não normativo' 'pré-produção'; do
  if ! printf '%s' "$row_code" | grep -qi "$phrase"; then
    flag "the runtime status row no longer states the current BanzAI posture: '$phrase'."
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "check-website-public-copy-current: FAILED — public copy drifted from the implemented architecture." >&2
  exit 1
fi

echo "check-website-public-copy-current: OK — public copy matches the deployed protocol-agent architecture."
