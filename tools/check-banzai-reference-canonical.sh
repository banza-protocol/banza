#!/usr/bin/env bash
# check-banzai-reference-canonical.sh
#
# The BanzAI reference chapter (§12 "BanzAI — Agente do Protocolo", served as /referencia/banzai)
# is the canonical, Whitepaper-level description of the agent. This guard fixes the editorial and
# architectural invariants of that chapter so it cannot silently drift:
#   - exactly 6 H3 sections in the canonical order; body prose ~999 words (850–1100)
#   - exactly TWO complementary diagram embeds, both existing: the external-position figure
#     (banzai-no-protocolo.svg, "Papel no BANZA" — where the BanzAI sits in the architecture) and the
#     cognitive-engine figure (banzai-motor-cognitivo.svg, "Como o BanzAI responde" — how it works);
#     the retired competing diagrams stay absent. (The Reference is self-contained: a related figure
#     existing in the Whitepaper is NOT a reason to drop it here.)
#   - the frozen architecture is stated (typed contracts · secure-fetch→snapshot split · FactualPackage
#     · optional model · rejected direct path · three provenance levels)
#   - authority is stated as PROSE, not a table (no "| Função | BanzAI |" header); the boundary claims
#     "orquestrar ferramentas não transfere" and "não substitui um resultado" are present
#   - the conversational-context prose is present ("contexto conversacional", "não constitui evidência")
#   - BanzAI is never framed as a fourth layer, a passive UI, or a mandatory hop; the protocol works
#     without it; "Registo Técnico" (PT) stays canonical (no bare "Technical Registry" here).
#
# It is intentionally structural/semantic, not coordinate-based. Runs offline. Self-tests its detectors.

set -uo pipefail
REF="website/content/BANZA_REFERENCIA.md"
st=0
ok(){ echo "  ok: $1"; }
fl(){ echo "  NEEDS_FIX: $1" >&2; st=1; }

# ── extract chapter 12 (## 12. … up to the next ## 13.) ──────────────────────
chap(){ awk '/^## 12\. BanzAI/{f=1} f{print} /^## 13\./{if(f && !/^## 12\./){exit}}' "$REF" \
        | awk 'BEGIN{n=0} /^## 13\./{exit} {print}'; }

# body word counter (exclude headings, table rows, image embeds, hr, fenced code)
wordcount(){
  awk '
    /^```/{fence=!fence; next}
    fence{next}
    /^#/{next} /^\|/{next} /^!\[/{next} /^---$/{next}
    { line=$0
      gsub(/\[([^]]*)\]\([^)]*\)/,"&")           # keep link text (rough)
      gsub(/[*`>#|]/," ",line)
      n=split(line,a,/[ \t]+/)
      for(i=1;i<=n;i++) if(a[i]!="") c++
    }
    END{print c+0}'
}

# ── self-test of detectors (synthetic, before touching the real file) ─────────
selftest(){
  local bad ok1
  bad='O output do modelo é evidência do protocolo.'
  printf '%s\n' "$bad" | grep -qiE 'output do modelo (é|e) .*(evid|fonte|regra)' \
    || { echo "SELF-TEST BROKEN: model-as-evidence detector" >&2; st=1; }
  ok1='O output do modelo não é uma fonte.'
  printf '%s\n' "$ok1" | grep -qiE '\b(não|nao|nunca)\b' \
    || { echo "SELF-TEST BROKEN: negation detector" >&2; st=1; }
  printf '%s\n' 'O BanzAI é uma quarta camada.' | grep -qiE 'quarta camada' \
    || { echo "SELF-TEST BROKEN: fourth-layer detector" >&2; st=1; }
}
selftest

[ -f "$REF" ] || { echo "NEEDS_FIX: $REF not found" >&2; exit 1; }
C="$(chap)"
[ -n "$C" ] || { echo "NEEDS_FIX: chapter 12 not found in $REF" >&2; exit 1; }

# 1. exactly 6 H3 sections in the canonical order
h3=$(printf '%s\n' "$C" | grep -cE '^### ')
[ "$h3" -eq 6 ] && ok "6 sections (H3=$h3)" || fl "chapter 12 must have exactly 6 H3 sections (found $h3)"
h3_list=$(printf '%s\n' "$C" | grep -E '^### ' | sed -E 's/^###[[:space:]]+//; s/[[:space:]]+$//')
expected='Papel no BANZA
Como o BanzAI responde
Fontes e ferramentas
Proveniência
Autoridade e limites
Implementação'
if [ "$h3_list" = "$expected" ]; then ok "H3 sections in canonical order"; else fl "chapter 12 H3 sections/order drifted"; fi

# 2. word count ~999 (850–1100)
wc_n=$(printf '%s\n' "$C" | wordcount)
if [ "$wc_n" -ge 850 ] && [ "$wc_n" -le 1100 ]; then ok "word count $wc_n (850–1100)"; else fl "chapter 12 prose word count $wc_n outside 850–1100"; fi

# 3. exactly 2 complementary diagram embeds
imgs=$(printf '%s\n' "$C" | grep -cE '^!\[')
[ "$imgs" -eq 2 ] && ok "2 canonical diagrams" || fl "chapter 12 must embed exactly 2 diagrams (found $imgs)"

# 4. both complementary diagrams are embedded + exist:
#    banzai-no-protocolo (external position — "Papel no BANZA") and
#    banzai-motor-cognitivo (internal cognitive engine — "Como o BanzAI responde").
#    The Reference is self-contained; a related Whitepaper figure is NOT a reason to drop either here.
printf '%s\n' "$C" | grep -qF "/diagrams/protocol/banzai-no-protocolo.svg" && ok "embeds banzai-no-protocolo.svg (external position)" || fl "chapter 12 must embed /diagrams/protocol/banzai-no-protocolo.svg"
[ -f "website/public/diagrams/protocol/banzai-no-protocolo.svg" ] && ok "banzai-no-protocolo.svg exists (served)" || fl "website/public/diagrams/protocol/banzai-no-protocolo.svg missing"
printf '%s\n' "$C" | grep -qF "/diagrams/protocol/banzai-motor-cognitivo.svg" && ok "embeds banzai-motor-cognitivo.svg (cognitive engine)" || fl "chapter 12 must embed /diagrams/protocol/banzai-motor-cognitivo.svg"
[ -f "website/public/diagrams/protocol/banzai-motor-cognitivo.svg" ] && ok "banzai-motor-cognitivo.svg exists (served)" || fl "website/public/diagrams/protocol/banzai-motor-cognitivo.svg missing"
for f in banzai-cognitive-architecture banzai-single-answer-pipeline; do
  printf '%s\n' "$C" | grep -qF "$f.svg" && fl "retired diagram $f.svg must not be embedded in chapter 12" || ok "retired $f.svg not embedded"
done

# 5. cognitive-engine section present (carries the single diagram)
printf '%s\n' "$C" | grep -qE '^### Como o BanzAI responde' && ok "cognitive-engine section present" || fl "missing '### Como o BanzAI responde' section"

# 6. frozen-architecture phrases
declare -a P=(
  "FactualPackage|FactualPackage (evidência fechada)"
  "contrato tipado|typed engine contracts"
  "obtenção segura|secure fetch"
  "snapshot|secure-fetch → snapshot split"
  "rejeitado|rejected direct model path"
)
for row in "${P[@]}"; do
  pat="${row%%|*}"; label="${row##*|}"
  printf '%s\n' "$C" | grep -qiE "$pat" && ok "present: $label" || fl "missing frozen-architecture phrase: $label ($pat)"
done
# optional-model path
printf '%s\n' "$C" | grep -qiE 'modelo[^.]*opcional|opcional[^.]*modelo' && ok "optional-model path present" || fl "missing optional-model framing"
# rejected direct path (explicit)
printf '%s\n' "$C" | grep -qiE 'caminho directo.*(rejeitad|→ modelo →)' && ok "rejected direct path stated" || fl "missing explicit rejected direct path"

# 7. three provenance levels
lv=0
for t in "Normativas" "Governação e racional" "Informativas"; do
  printf '%s\n' "$C" | grep -qF "$t" && lv=$((lv+1)) || fl "missing provenance level: $t"
done
[ "$lv" -eq 3 ] && ok "3 provenance levels"

# 8. authority as PROSE, not a table (zero authority-table headers)
mat=$(printf '%s\n' "$C" | grep -cE '^\| *Função *\| *BanzAI *\|')
[ "$mat" -eq 0 ] && ok "authority stated as prose (no authority table)" || fl "chapter 12 must not carry an authority table (found $mat header row(s))"
printf '%s\n' "$C" | grep -qE '^### Autoridade e limites' && ok "authority section present" || fl "missing '### Autoridade e limites' section"
printf '%s\n' "$C" | grep -qF "orquestrar ferramentas não transfere" && ok "authority prose: orchestration does not transfer authority" || fl "missing 'orquestrar ferramentas não transfere'"
printf '%s\n' "$C" | grep -qF "não substitui um resultado" && ok "authority prose: a BanzAI answer does not replace a result" || fl "missing 'não substitui um resultado'"

# 9. conversational-context prose
printf '%s\n' "$C" | grep -qF "contexto conversacional" && ok "conversational context present" || fl "missing 'contexto conversacional'"
printf '%s\n' "$C" | grep -qF "não constitui evidência" && ok "context is not evidence" || fl "missing 'não constitui evidência'"

# 10. no extended FAQ inside the chapter (no question-form H3, no FAQ heading)
if printf '%s\n' "$C" | grep -qiE '^### .*\?|^### (perguntas frequentes|faq)'; then fl "chapter 12 must not contain an FAQ section"; else ok "no extended FAQ"; fi

# 11. negation-aware boundary claims: fourth-layer / passive-ui / protocol-requires-banzai / model-as-evidence
neg='não|nao|nunca|never|nem|sem '
viol(){ # $1 pattern human, $2 regex
  local hits; hits=$(printf '%s\n' "$C" | grep -inE "$2" | grep -viE "$neg" || true)
  if [ -n "$hits" ]; then fl "$1 (unnegated): $(printf '%s' "$hits" | head -1)"; else ok "no unnegated $1"; fi
}
viol "fourth-layer claim"        'quarta camada'
viol "passive-ui claim"          'simples chat|interface passiva|wrapper do modelo|encaminhador de pedidos'
viol "protocol-requires-banzai"  'tem de passar pelo banzai|ponto (de passagem )?obrigatório'
viol "model-output-as-evidence"  'output do modelo (é|e) .*(evid|fonte|regra)|modelo .*produz .*evidência'
# positive: protocol works without BanzAI
printf '%s\n' "$C" | grep -qiE 'funciona sem o banzai|verificável sem o banzai' && ok "states protocol works without BanzAI" || fl "must state the protocol works without the BanzAI"

# 12. Registo Técnico consistency (PT canonical; no bare EN 'Technical Registry' in the chapter)
printf '%s\n' "$C" | grep -qF "Registo Técnico" && ok "uses 'Registo Técnico'" || fl "chapter 12 must use 'Registo Técnico'"
if printf '%s\n' "$C" | grep -qF "Technical Registry"; then fl "chapter 12 must not use EN 'Technical Registry' (PT canonical)"; else ok "no bare 'Technical Registry'"; fi

if [ "$st" -eq 0 ]; then echo "OK: banzai reference canonical (6 sections · $wc_n words · 2 diagrams · prose authority)"; else echo "banzai-reference-canonical-check FAILED" >&2; fi
exit $st
