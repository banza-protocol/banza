#!/usr/bin/env bash
#
# BANZA BanzAI-Protocol-Agent Guard (M2.7H).
#
# M2.7H formalizes BanzAI as the NATIVE PROTOCOL AGENT (ADR-041,
# docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md): BanzAI guides operators, simulates flows, invokes
# verifiable Rust/WASM tools, explains results and prepares evidence — but it is NOT an authority, NOT a
# normative source, and does NOT create rules or architectural decisions. Verifiable decisions are
# computed by the deterministic engines and proven by public evidence.
#
# This guard blocks, on the public/product/reference/governance surfaces, any AFFIRMATIVE claim that would
# make BanzAI an authority/rule-source, or that would present the old "BanzAI Workbench" brand /
# "Workbench-only verification" formulation as the public name. Detection is by affirmative literal
# substring: a negated form carries "não" between the subject and the verb ("BanzAI não certifica"), so it
# is not a substring of the affirmative ("BanzAI certifica") — the same technique the banzai-agent.ts copy uses.
#
# M2.7I (chat/workbench/assistant purge): /banzai/chat and /banzai/workbench are both removed; the single
# public route is /banzai. BanzAI is not a chat, an assistant or a "workbench" — it is the native protocol
# agent. The removed brands/routes/copy above are blocked on public surfaces.
#
# ALLOWED (never flagged): the single canonical route /banzai; internal forbidden-phrase source (banzai-agent.ts);
# lowercase engine match-keywords ("o workbench certifica?") that exist to be caught and corrected; test
# files; phase reports / audits / matrices / inventories; this guard's own source; clear negations
# ("BanzAI não certifica", "BanzAI não inventa regras"); helper phrasing ("BanzAI pode ajudar a redigir
# propostas RFC/ADR").
#
# The operator-interface rule stays: operators use BanzAI as the public interface — not
# pip/Python/Docker/GitHub-Actions.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

SCAN=(website/app website/components website/lib website/content website/public docs/reference docs/governance spec README.md)

# Engine (WASM, powers /banzai/chat) + service source (machine routes /operators, /certificates,
# /conformance/evidence, Assistente). Scanned CASE-SENSITIVELY for proper-case retired brands only —
# see the STRICT_BRAND pass in run_checks (avoids the lowercase match-keyword false positives).
STRICT_SCAN=(engines/banzai-evidence/src services/banzai-api/src services/verification-api/src)
STRICT_BRAND=(
  "BanzAI Workbench"
  "Protocol Knowledge System"
  "Protocol Evidence Assistant"
  "BanzAI Chat"
  "/banzai/chat"
  "/banzai/workbench"
  "BanzaiChat"
)

GREP_EXCL=(
  --exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts'
  --exclude='banzai-agent.ts'
  --exclude='PHASE_*.md' --exclude='*_AUDIT.md' --exclude='*_AUDIT_*.md'
  --exclude='*_MATRIX_*.md' --exclude='*_INVENTORY.md'
  --exclude='SVG_VISUAL_SYSTEM.md' --exclude='SVG_QUALITY_POLICY.md'
  --exclude='complete.md'
  --exclude='check-banzai-protocol-agent.sh'
  --exclude-dir='en' --exclude-dir='adr' --exclude-dir='target' --exclude-dir='node_modules' --exclude-dir='.next'
)

# A hit line is a real violation only if it AFFIRMS the claim: skip questions (ending "?") and any line
# carrying a negation cue. The affirmative-substring already excludes "X não Y" (não between subject and
# verb); this second filter covers questions ("O BanzAI decide algo?") and exclusion/"must not" lines.
NEG_LINE='não|nao|nunca|jamais|\bnem\b|\bsem\b|\bnot\b|cannot|never|must not|deve dizer|proibid|removid|exclu'
is_affirmative_line() { # $1=line -> return 0 if it affirms (violation), 1 if question/negation
  case "$1" in *'?'*) return 1;; esac
  echo "$1" | grep -qiE "$NEG_LINE" && return 1
  return 0
}

# ── Forbidden AFFIRMATIVE phrases (a negation with "não" between subject and verb is auto-allowed) ──
# Brand / public formulation:
BRAND=(
  "BanzAI Workbench"
  "Workbench-only verification"
  "verificação Workbench-only"
  "verificacao Workbench-only"
  "Protocol Evidence Assistant"
  "Protocol Knowledge System"
  "sistema adjacente"
  "adjacent knowledge system"
  # ADR-041: BanzAI is the native protocol agent, never "adjacent" or an "auxiliary knowledge system".
  # These PT residues slipped past "sistema adjacente" in two diagrams (SVG-P-051/052); block the framing.
  "BanzAI adjacente"
  "BanzAI · adjacente"
  "BanzAI é auxiliar"
  "BanzAI e auxiliar"
  "auxiliar do protocolo"
  "sistema de conhecimento"
  # M2.7I — the /banzai/chat route is removed; BanzAI is not a chat/assistant product.
  "/banzai/chat"
  "BanzAI Chat"
  "Perguntar ao Assistente"
  # M2.7I (chat/workbench/assistant purge) — /banzai/workbench removed; BanzAI is not a "workbench".
  "/banzai/workbench"
  "BanzaiChat"
)
# Authority / decision / rule-provenance affirmations:
AUTH=(
  "BanzAI decide"
  "BanzAI aprova"
  "BanzAI certifica"
  "BanzAI licencia"
  "BanzAI autoriza"
  "BanzAI substitui a referência" "BanzAI substitui a Referência" "BanzAI substitui a referencia"
  "BanzAI substitui os motores" "BanzAI substitui motores"
  "BanzAI move fundos" "BanzAI movimenta fundos"
  "BanzAI processa pagamentos"
  "BanzAI é fonte normativa" "BanzAI e fonte normativa"
  "BanzAI é autoridade" "BanzAI e autoridade"
  "BanzAI admite operadores"
  "governança aprova operadores" "governanca aprova operadores"
  "maintainers aprovam operadores"
  "registry aprova operadores"
  "PASS certifica"
  "Evidence Bundle certifica"
  "participação é aprovada" "participacao e aprovada"
  "operador é aceite pelo BANZA" "operador e aceite pelo BANZA"
  "BanzAI cria regras"
  "BanzAI define regras"
  "BanzAI adiciona regras"
  "BanzAI altera o protocolo"
  "BanzAI decide arquitectura"
  "BanzAI adiciona decisão arquitectural" "BanzAI adiciona decisao arquitectural"
  "BanzAI cria decisão arquitectural" "BanzAI cria decisao arquitectural"
  "BanzAI inventa regra"
  "BanzAI resolve lacunas normativas"
  "BanzAI activa proposta" "BanzAI activa a proposta"
  "sugestão do BanzAI é regra" "sugestao do BanzAI e regra"
  "sugestão do BanzAI vira regra" "sugestao do BanzAI vira regra"
  "output do BanzAI é fonte normativa" "output do BanzAI e fonte normativa"
  "BanzAI actualiza invariantes"
  "BanzAI muda trust model" "BanzAI muda o trust model"
  "BanzAI muda federation model" "BanzAI muda o federation model"
  "BanzAI muda registry model" "BanzAI muda o registry model"
)

fail=0

run_checks() { # scans the real tree; sets fail
  local p hits line
  # BRAND — literal, case-insensitive (catches lowercase variants like "protocol knowledge system");
  # the removed brand/formulation must not appear at all on scanned surfaces.
  for p in "${BRAND[@]}"; do
    hits="$(grep -rInFi "${GREP_EXCL[@]}" -- "$p" "${SCAN[@]}" 2>/dev/null || true)"
    [ -z "$hits" ] || { printf "  ✗ removed brand/formulation \"%s\":\n%s\n" "$p" "$hits" | sed 's/^/    /' >&2; fail=1; }
  done
  # AUTH — word-boundary regex (so PT "certifica"/"decide" don't match EN "certification"/"decides"),
  # then keep only AFFIRMATIVE hit lines (drop questions and negation/deny lines).
  for p in "${AUTH[@]}"; do
    while IFS= read -r line; do
      [ -n "$line" ] || continue
      # line format: path:lineno:content
      local content="${line#*:}"; content="${content#*:}"
      is_affirmative_line "$content" && { printf "  ✗ BanzAI-authority affirmation \"%s\":\n    %s\n" "$p" "$line" >&2; fail=1; }
    done < <(grep -rInE "${GREP_EXCL[@]}" -- "${p}\\b" "${SCAN[@]}" 2>/dev/null || true)
  done
  # ENGINE + SERVICES brand pass — CASE-SENSITIVE literal. The engine/service source legitimately holds
  # lowercase match-keywords ("banzai workbench certifica", "sistema adjacente") that MUST be matched and
  # corrected; a case-sensitive scan hits only proper-case prose/answers, never those lowercase keys.
  for p in "${STRICT_BRAND[@]}"; do
    hits="$(grep -rInF "${GREP_EXCL[@]}" -- "$p" "${STRICT_SCAN[@]}" 2>/dev/null || true)"
    [ -z "$hits" ] || { printf "  ✗ removed brand in engine/service answer \"%s\":\n%s\n" "$p" "$hits" | sed 's/^/    /' >&2; fail=1; }
  done
}

# ── self-test (synthetic fixtures; probes the affirmative-substring logic) ──
selftest() {
  local d st=0; d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  local pass=(
    "BanzAI é o agente do protocolo."
    "BanzAI é o agente IA nativo do protocolo."
    "BanzAI é camada oficial de orientação e orquestração."
    "BanzAI guia; os motores verificam; a evidência prova."
    "Participação é demonstrada, não aprovada."
    "BanzAI não inventa regras."
    "BanzAI não certifica operadores."
    "BanzAI pode ajudar a redigir uma proposta RFC."
    "Sem fonte normativa, BanzAI deve dizer que não há regra suficiente."
    "Abrir /banzai e o BanzAI."
    "A entrada pública principal é /banzai."
    "Perguntar ao BanzAI sobre este resultado."
    "BanzAI — Agente do protocolo."
    "Abrir o BanzAI em /banzai."
  )
  local flag=(
    "BanzAI decide se o operador passa."
    "BanzAI certifica operadores."
    "BanzAI substitui a referência do protocolo."
    "# BanzAI Workbench"
    "BanzAI — Protocol Evidence Assistant"
    "BanzAI — Protocol Knowledge System"
    "BanzAI é um sistema adjacente."
    "O registry aprova operadores."
    "O Evidence Bundle certifica o operador."
    "BanzAI cria regras do protocolo."
    "BanzAI adiciona decisão arquitectural."
    "O output do BanzAI é fonte normativa."
    "Uma sugestão do BanzAI vira regra activa."
    # M2.7I — the removed chat route/product and the old assistant copy.
    "<loc>https://banza.network/banzai/chat</loc>"
    "Link para /banzai/chat no nav."
    "A documentação aponta para /banzai/chat."
    "Perguntar ao Assistente sobre isto."
    "Abrir o BanzAI Chat (demo)."
    "<loc>https://banza.network/banzai/workbench</loc>"
    "Abrir o BanzAI Workbench."
    "import { BanzaiChat } from './BanzaiChat'."
    # ADR-041 — the retired "adjacent / auxiliary knowledge system" framing (PT residues).
    "BanzAI adjacente, não normativo (§10)."
    "O BanzAI é auxiliar e não normativo."
    "Sistema de conhecimento auxiliar do protocolo."
    "BanzAI is the Protocol Knowledge System for the ecosystem."
  )
  local all=("${BRAND[@]}" "${AUTH[@]}") p hit
  local i=0
  for s in "${pass[@]}"; do
    hit=0; for p in "${all[@]}"; do case "$s" in *"$p"*) hit=1;; esac; done
    [ "$hit" -eq 0 ] || { echo "SELFTEST_FAIL pass-case wrongly flagged: $s"; st=1; }
  done
  for s in "${flag[@]}"; do
    hit=0; for p in "${all[@]}"; do case "$s" in *"$p"*) hit=1;; esac; done
    [ "$hit" -eq 1 ] || { echo "SELFTEST_FAIL fail-case not caught: $s"; st=1; }
  done
  return $st
}

if ! selftest; then echo "banzai-protocol-agent: guard self-test FAILED"; exit 2; fi

printf "\n══════════════════════════════════════════════════════════════════════\n"
printf "BANZA BanzAI-Protocol-Agent Guard (M2.7H)\n"
printf "══════════════════════════════════════════════════════════════════════\n"
run_checks
if [ "$fail" -eq 0 ]; then
  printf "Result: ✓ BanzAI is presented as the native protocol AGENT — no authority/rule-source/brand leaks\n\n"
else
  printf "\nResult: ✗ BanzAI presented as authority/rule-source, or old brand present (see ADR-041 / BANZAI_NATIVE_PROTOCOL_AGENT.md)\n\n" >&2
  exit 1
fi
