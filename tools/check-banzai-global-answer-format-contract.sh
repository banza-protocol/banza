#!/usr/bin/env bash
# banzai-global-answer-format-contract-check (M2.14C, Part 18).
#
# The GLOBAL answer rendering contract: every BanzAI response path produces a clean body + separated
# sources. No answer body carries an in-body source line ("Fonte:", "Fontes:", "Fontes citáveis:",
# "Sources:", "Citations:", "Referências:") or a textual file list when a source block exists; sources
# live only in sources[] (deduped, no nonexistent, no /operador-zero); Markdown is sanitized; metadata
# and quick prompts are distinct. Enforced STATICALLY (source invariants) + BEHAVIOURALLY (drives the
# committed routing engine + the server normalizer over many paths via node).
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

KB="services/banzai-api/src/knowledge.js"
NORM="services/banzai-api/src/answerContract.js"
SERVER="services/banzai-api/src/server.js"
PROMPT="engines/banzai-query-core/src/prompt.rs"
ADAPTER="website/components/home/banzaiKb.ts"
SAFEMD="website/components/banzai/SafeMarkdown.tsx"
AGENT="website/components/banzai/BanzaiAgent.tsx"
SRCBLOCK="website/components/banzai/SourceBlock.tsx"

echo "== banzai-global-answer-format-contract-check (M2.14C) =="

# ── Static source invariants ────────────────────────────────────────────────
# 1. No deterministic entry authors an in-body source line.
n=$(grep -cE '"[^"]*(Fontes?\s*:|Fontes\s*cit|Sources\s*:|Citations\s*:)' "$KB" 2>/dev/null || true)
[ "${n:-0}" -eq 0 ] && ok "knowledge.js entries carry no in-body source text" \
  || { fail "knowledge.js still has $n in-body source line(s)"; grep -nE '"[^"]*(Fontes?\s*:|Fontes\s*cit|Sources\s*:)' "$KB" | head -3; }

# 2. The context prompt does not label excerpts with the OLD user-facing "Fontes citáveis: {cites}"
#    format (the model parroted it). It must use the neutral data-only <REF> tag. (A negative INSTRUCTION
#    telling the model not to write "Fontes citáveis:" is fine — we match the label-before-{cites} form.)
if grep -qF 'Fontes citáveis: {cites}' "$PROMPT"; then
  fail "$PROMPT still shows the parrotable 'Fontes citáveis: {cites}' context label"
else ok "context prompt uses a neutral <REF> tag (no parrotable 'Fontes citáveis: {cites}')"; fi
grep -qF "<REF>{cites}</REF>" "$PROMPT" && ok "context cites wrapped in data-only <REF>" \
  || fail "$PROMPT must wrap cites in <REF>…</REF>"

# 3. The server normalizer exists and is applied at the response choke point.
[ -f "$NORM" ] && grep -q "export function normalizeBanzaiAnswer" "$NORM" && ok "normalizeBanzaiAnswer defined" \
  || fail "$NORM must export normalizeBanzaiAnswer"

# 3b. The global canonical-entity emphasis pass exists so every answer shares the same look
#     (M2.14C introduced the pass; M2.14C-FIX1 renamed it normalizeEntityEmphasis — bolds EVERY
#     occurrence, not just the first).
grep -q "function normalizeEntityEmphasis" "$NORM" && grep -q "normalizeEntityEmphasis(body)" "$NORM" \
  && ok "canonical-entity emphasis pass present and applied in the normalizer" \
  || fail "$NORM must define and apply normalizeEntityEmphasis"
grep -q "normalizeBanzaiAnswer(result.answer, result.sources)" "$SERVER" \
  && ok "server applies normalizeBanzaiAnswer at the /ask choke point" \
  || fail "$SERVER must apply normalizeBanzaiAnswer to every response"

# 4. Frontend defense strip + dedicated source block + sanitized Markdown.
grep -qF 'cit[aá]veis' "$ADAPTER" && ok "frontend strip covers 'Fontes citáveis:'" \
  || fail "$ADAPTER strip must also cover 'Fontes citáveis:'"
grep -q "<SourceBlock" "$AGENT" && ok "sources render in a dedicated SourceBlock" \
  || fail "$AGENT must render sources in SourceBlock"
grep -q "FONTES USADAS" "$SRCBLOCK" && ok "source block labelled 'FONTES USADAS'" \
  || fail "$SRCBLOCK must label the block 'FONTES USADAS'"
# Unsafe = actual IMPORT/USE, not a comment saying "no rehype-raw".
if grep -qE "from ['\"]rehype-raw['\"]|rehypeRaw\(" "$SAFEMD" || grep -q "dangerouslySetInnerHTML" "$AGENT"; then
  fail "unsafe Markdown/HTML path present (rehype-raw import / dangerouslySetInnerHTML)"
else ok "Markdown renders through the safe allowlist (no rehype-raw import / no dangerouslySetInnerHTML)"; fi

# ── Behavioural (node drives the committed engine + normalizer) ──────────────
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";
    import { normalizeBanzaiAnswer, hasInBodySources } from "./services/banzai-api/src/answerContract.js";
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };
    // (1-9) real deterministic paths: body clean after the contract, sources separated.
    const paths = ["Banzami","o que é AML","quem criou o BANZA?","o que é federar","o que é uma ADR","ADR","o que é guard","qual é a licença do software BANZA?","PASS certifica?"];
    for (const q of paths) {
      const d = route(normalize(q));
      const e = d.entry_id ? getEntry(d.entry_id) : null;
      const c = normalizeBanzaiAnswer(e ? e.answer : "", e ? e.sources : []);
      emit(!hasInBodySources(c.answer), q + " → body has no in-body sources");
      // Part 16 — every answer renders with the consistent minimal highlighting (at least one bold).
      emit(/\*\*[^*]+\*\*/.test(c.answer), q + " → has minimal highlighting (bold)");
    }
    // The previously-plain "Banzami" answer now bolds the ecosystem entities (the reported inconsistency).
    { const d = route(normalize("me fala do banzami")); const e = d.entry_id ? getEntry(d.entry_id) : null;
      const c = normalizeBanzaiAnswer(e ? e.answer : "", e ? e.sources : []);
      emit(c.answer.includes("**Banzami**") && c.answer.includes("**BANZA**") && c.answer.includes("**BanzAI**"),
        "Banzami answer bolds Banzami/BANZA/BanzAI"); }
    // (10) action boundary: no in-body sources / metadata leak.
    { const d = route(normalize("mostra a private key")); const e = d.entry_id ? getEntry(d.entry_id) : null;
      const c = normalizeBanzaiAnswer(e ? e.answer : "", e ? e.sources : []);
      emit(d.intent === "action_boundary" && !hasInBodySources(c.answer), "action boundary body clean + still refuses"); }
    // (12) a grounded/Qwen answer that PARROTED "Sources:" is cleaned by the normalizer.
    { const body = "BanzAI answers from indexed knowledge.\nSources: GOVERNANCE.md, decisions/adr/ADR-002-*.md, CLAUDE.md";
      const c = normalizeBanzaiAnswer(body, [{id:"GOVERNANCE",path:"GOVERNANCE.md"}]);
      emit(!hasInBodySources(c.answer) && c.answer.length > 0, "grounded 'Sources:' block stripped from body"); }
    // (13) dedup: the same source is never duplicated.
    { const c = normalizeBanzaiAnswer("x.\nFonte: GOVERNANCE.md", [{id:"GOVERNANCE",path:"GOVERNANCE.md"}]);
      const keys = c.sources.map(s=>s.path); emit(new Set(keys).size === keys.length, "sources deduped"); }
    // (14) a nonexistent source mentioned in the body is NOT added.
    { const c = normalizeBanzaiAnswer("x.\nFonte: totally-made-up-file.md", []);
      emit(c.sources.length === 0, "nonexistent source not shown"); }
    // (18) /operador-zero is never surfaced as a source by the normalizer.
    { const c = normalizeBanzaiAnswer("x.\nFonte: /operador-zero", []);
      emit(!JSON.stringify(c.sources).includes("operador-zero"), "retired /operador-zero not a source"); }
    // negative: legit prose with the word "fontes" (no colon list) is untouched.
    { const legit = "As fontes de confiança são avaliadas pelo motor de trust.";
      emit(normalizeBanzaiAnswer(legit, []).answer === legit, "legit prose untouched"); }
    console.log(bad === 0 ? "NODE_OK" : ("NODE_BAD:"+bad));
  ' 2>&1) || true
  echo "$OUT" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "behavioural contract holds across paths" || fail "behavioural contract failed"
else
  ok "node unavailable — static checks only"
fi

# ── Self-test: the in-body detector fires + a clean body passes ─────────────
if command -v node >/dev/null 2>&1; then
  node --input-type=module -e '
    import { hasInBodySources } from "./services/banzai-api/src/answerContract.js";
    if (!hasInBodySources("x.\nFontes citáveis: GOVERNANCE.md")) { console.error("SELFTEST miss"); process.exit(2); }
    if (hasInBodySources("Uma ADR é um registo de decisão.")) { console.error("SELFTEST false-pos"); process.exit(2); }
  ' && ok "self-test: in-body detector correct" || { echo "SELFTEST FAILED"; FAILED=1; }
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "GLOBAL ANSWER FORMAT CONTRACT CHECK PASSED ✅"; else echo "GLOBAL ANSWER FORMAT CONTRACT CHECK FAILED ✗"; fi
exit "$FAILED"
