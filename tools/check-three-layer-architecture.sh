#!/usr/bin/env bash
#
# BANZA Three-Layer Architecture Guard (M2.19C, ADR-003).
#
# ADR-003 fixes the canonical three-layer institutional architecture and
# docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md is its readable canonical form. This guard keeps
# both present and keeps them naming, verbatim in substance:
#   L1  BANZA Protocol (open, neutral, verifiable financial protocol)
#   L2  BANZA Conformance & Interoperability Certification (per-implementation, evidence-based)
#   L3  Banzami Operational Scheme (designated operator, conditioned on the regulatory framework)
#   + BanzAI as the TRANSVERSAL human interface (not a fourth authority)
#   + the authority rule (Rust decides / Qwen explains once / Rust validates before publishing).
#
# It also fails if any public/governance surface AFFIRMATIVELY calls BANZA a bank/PSP/operator/wallet/
# e-money institution. Every current mention is a NEGATION ("O BANZA NÃO é banco, PSP, ... operador
# financeiro") — negations, prohibitions and enumeration bullets are allowed; an affirmative claim is not.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

ADR059="decisions/adr/ADR-003-three-layer-institutional-architecture.md"
TLA="docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md"

fail=0
note() { printf '  - %s\n' "$1"; }

# PUBLIC-RENDERED surfaces scanned for an affirmative BANZA-as-operator misframing. The governance/ADR
# meta-docs ENUMERATE and PROHIBIT these phrases by design (forbidden-phrase lists, "avoid→prefer" tables,
# guard-behaviour snapshots), so — exactly like the shipping check-regulatory-claims.sh — the affirmative
# scan runs on the surfaces a reader actually reads, while the governance/ADR negated framing is verified
# by the presence assertions in [3b/4] below.
SURFACES=(website/content website/app website/components docs/reference README.md)
# banzai-agent.ts lists the forbidden phrases verbatim (its live UI copy is guarded elsewhere); tests too.
GREP_EXCL=(--exclude='banzai-agent.ts' --exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts')

# Negation / prohibition / enumeration markers — a line carrying any of these is not an affirmative claim.
NEG='não|nao|nunca|never|\bnot\b|\bnem\b|neither|nor|\bsem\b|deixa de|não faz|não torna|isn'"'"'?t|does not|doesn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|\?'

# Affirmative "BANZA is a bank/PSP/operator/wallet/EMI" (PT + EN), distance-bounded so we match a claim,
# not an incidental co-occurrence. PT mirrors the proven idiom of check-regulatory-claims.sh (no \b around
# the multibyte "é"; "banza não é ..." naturally does not match the adjacency, and NEG clears any residue).
BANZA_OP_PT='banza (é|será|sera)[^.]{0,20}(banco|psp|operador financeiro|operador de pagament|carteira|instituição de moeda|prestador de servi)'
BANZA_OP_EN='\bbanza\b[^.]{0,20}\bis\b[^.]{0,18}(a |an |the )?(bank|psp|wallet|e-money|emi|financial operator|payment operator|payment service)'

# ── Self-test: prove the affirmative detector fires on a bad line and is cleared by a negation ──────
st=0
BAD='O BANZA é um banco licenciado que movimenta fundos.'
GOOD='O BANZA não é banco, PSP nem operador financeiro.'
echo "$BAD"  | grep -qiE "$BANZA_OP_PT" || { echo "SELF-TEST BROKEN: affirmative BANZA-as-operator not detected" >&2; st=1; }
echo "$BAD"  | grep -qiE "$NEG" && { echo "SELF-TEST BROKEN: bad line wrongly carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation marker not detected on a negated boundary line" >&2; st=1; }
echo 'BANZA is a bank.' | grep -qiE "$BANZA_OP_EN" || { echo "SELF-TEST BROKEN: EN affirmative not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "three-layer-architecture: guard self-test FAILED"; exit 2; }

# ── [1/4] required canonical documents present ─────────────────────────────────────────────────────
echo "== [1/4] ADR-003 + BANZA_THREE_LAYER_ARCHITECTURE.md present =="
for f in "$ADR059" "$TLA"; do
  if [ -f "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing required document: $f"; fail=1; fi
done

# helper: require a (case-insensitive) regex to be present in a file
need() { # file regex label
  if [ -f "$1" ] && grep -qiE "$2" "$1"; then
    echo "PASS  $3"
  else
    echo "FAIL  $3 — expected /$2/ in $1"; fail=1
  fi
}

# ── [2/4] the three layers are named on the canonical architecture document ─────────────────────────
echo "== [2/4] the three layers are named (BANZA_THREE_LAYER_ARCHITECTURE.md) =="
need "$TLA" 'três camadas'                                        'names "três camadas"'
need "$TLA" 'camada 1[^a-z]*.{0,4}protocolo banza|l1[^a-z]{0,4}protocolo banza' 'L1 — Protocolo BANZA'
need "$TLA" 'certificação de conformidade e interoperabilidade'  'L2 — Certificação de Conformidade e Interoperabilidade'
need "$TLA" 'banzami operational scheme'                         'L3 — Banzami Operational Scheme'
echo "== ...and on ADR-003 =="
need "$ADR059" 'three-layer'          'ADR-003 names the three-layer architecture'
need "$ADR059" 'layer 1[^a-z]'        'ADR-003 Layer 1'
need "$ADR059" 'layer 2[^a-z]'        'ADR-003 Layer 2'
need "$ADR059" 'layer 3[^a-z]'        'ADR-003 Layer 3'

# ── [3/4] BanzAI transversal + the authority rule ───────────────────────────────────────────────────
echo "== [3/4] BanzAI transversal + authority rule =="
need "$TLA" 'banzai'                           'BanzAI named (transversal human interface)'
need "$TLA" 'transversal'                      'BanzAI is transversal'
need "$TLA" 'não[^.]{0,20}(quarta autoridade|autoridade)|não é uma quarta autoridade' 'BanzAI is not a fourth authority'
need "$TLA" 'rust[^.]{0,40}decide'             'authority rule: Rust decides'
need "$TLA" 'qwen[^.]{0,40}explica uma vez'    'authority rule: Qwen explains once'
need "$TLA" 'rust valida antes'                'authority rule: Rust validates before publishing'
need "$ADR059" 'transversal'                   'ADR-003 BanzAI transversal'
need "$ADR059" 'decide'                        'ADR-003 authority rule: Rust decides'
need "$ADR059" 'explains once'                 'ADR-003 authority rule: Qwen explains once'

# ── [4/4] BANZA declared NOT-an-operator on governance/ADR; never affirmed one on public surfaces ────
echo "== [4/4] BANZA framed as NOT a bank/PSP/operator (governance/ADR) + no public affirmation =="
need "$TLA"    'não é.{0,4}banco, psp|banco, psp, carteira'                'TLA declares BANZA/L1 is NOT a bank/PSP/operator'
need "$ADR059" 'bank, psp, wallet'                                        'ADR-003 declares BANZA is not a bank/PSP/wallet/operator'
present=(); for s in "${SURFACES[@]}"; do [ -e "$s" ] && present+=("$s"); done
viol=0
for pat in "$BANZA_OP_PT" "$BANZA_OP_EN"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${present[@]}" 2>/dev/null | grep -viE "$NEG" || true)"
  if [ -n "$hits" ]; then
    echo "FAIL  affirmative BANZA-as-operator claim on a public surface matching /$pat/:"
    echo "$hits" | sed 's/^/    /'
    viol=1; fail=1
  fi
done
[ "$viol" -eq 0 ] && echo "PASS  BANZA is never affirmed to be a bank/PSP/operator on any public surface"

if [ "$fail" -ne 0 ]; then
  echo
  echo "three-layer-architecture: FAIL — see ADR-003 and docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md."
  exit 1
fi
echo
echo "three-layer-architecture: ✓ three layers + BanzAI transversal + authority rule canonical; BANZA never framed as an operator (M2.19C / ADR-003)"
