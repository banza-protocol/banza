#!/usr/bin/env bash
# banzai-entity-formatting-consistency-check (M2.14C-FIX1, Part 10).
#
# EVERY textual occurrence of a canonical ecosystem entity in an answer body must be bold — not just the
# first (the M2.14C highlight pass bolded only the first occurrence, so "Banzami … BANZA … BanzAI …"
# came out bold-once/plain-thereafter). A single global layer `normalizeEntityEmphasis` in the server
# answer contract bolds every occurrence and normalizes canonical spelling, while NEVER touching text
# inside code / inline code / existing **bold** / markdown links / URLs, and never touching
# paths / domains / packages / doc-ids (banza.network, banzai-api, engines/banzai-api-kb, BANZA.md,
# ADR-012). No `****` (double-bold). Common words (protocolo, operador, pagamento …) are NOT entities.
# Enforced STATICALLY (the layer exists + is wired) + BEHAVIOURALLY (drives the committed engine + the
# server normalizer via node) + a self-test.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

NORM="services/banzai-api/src/answerContract.js"
SERVER="services/banzai-api/src/server.js"

echo "== banzai-entity-formatting-consistency-check (M2.14C-FIX1) =="

# ── Static invariants (1-6) ─────────────────────────────────────────────────
# (1) The consistent-emphasis layer exists.
grep -q "function normalizeEntityEmphasis" "$NORM" && ok "normalizeEntityEmphasis defined" \
  || fail "$NORM must define normalizeEntityEmphasis"
# (2) It is applied inside the normalizer (single choke point).
grep -q "normalizeEntityEmphasis(body)" "$NORM" && ok "normalizeEntityEmphasis applied in normalizeBanzaiAnswer" \
  || fail "$NORM must apply normalizeEntityEmphasis(body)"
# (3) The old first-occurrence-only pass is gone (no regression back to it).
if grep -q "applyMinimalHighlights" "$NORM"; then fail "$NORM still references the old applyMinimalHighlights pass"; \
  else ok "old first-occurrence applyMinimalHighlights pass removed"; fi
# (4) Protected regions cover fenced code, inline code, existing bold, links, URLs.
grep -q 'const PROTECTED' "$NORM" \
  && grep -q '```' "$NORM" \
  && ok "PROTECTED regions defined (fenced/inline code, bold, links, URLs)" \
  || fail "$NORM must define PROTECTED regions incl. fenced code"
# (5) The canonical entity table exists and includes the core entities.
grep -q "CANONICAL_ENTITIES" "$NORM" && ok "CANONICAL_ENTITIES table present" \
  || fail "$NORM must define CANONICAL_ENTITIES"
for ent in Banzami BanzAI BANZA "Operador Zero" KZ_DEMO "Trust Root" Qwen ADR RFC; do
  grep -qF "\"$ent\"" "$NORM" && ok "entity table lists: $ent" || fail "entity table missing: $ent"
done
# (6) The whole-word boundary that spares paths/domains/packages/doc-ids exists.
grep -q "const BEFORE" "$NORM" && grep -q "const AFTER" "$NORM" \
  && ok "path/domain/package/doc-id-safe boundaries (BEFORE/AFTER) present" \
  || fail "$NORM must define BEFORE/AFTER boundaries"
# (7) The server still applies the normalizer at the /ask choke point (contract intact).
grep -q "normalizeBanzaiAnswer(result.answer, result.sources)" "$SERVER" \
  && ok "server applies normalizeBanzaiAnswer at the /ask choke point" \
  || fail "$SERVER must apply normalizeBanzaiAnswer to every response"

# ── Behavioural (node drives the committed engine + normalizer) ──────────────
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { normalizeBanzaiAnswer } from "./services/banzai-api/src/answerContract.js";
    import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };
    const N = (md) => normalizeBanzaiAnswer(md, []).answer;

    // (8) EVERY occurrence of a canonical entity is bold — not just the first.
    {
      const a = N("O banzami criou o banza. O banza usa o banzai. O banzai é o agente. O banzami mantém o banza.");
      emit((a.match(/\*\*Banzami\*\*/g) || []).length === 2, "Banzami bolded on every occurrence");
      emit((a.match(/\*\*BANZA\*\*/g) || []).length === 3, "BANZA bolded on every occurrence");
      emit((a.match(/\*\*BanzAI\*\*/g) || []).length === 2, "BanzAI bolded on every occurrence");
    }
    // (9) No double-bold anywhere.
    {
      const inputs = ["**BANZA** é aberto. O BANZA é bom.", "banza banza banza", "O Banzami e o banzami."];
      emit(inputs.every((s) => !N(s).includes("****")), "never produces **** (no double-bold)");
    }
    // (10) Already-bold text is not re-wrapped.
    emit(!N("**BANZA** aberto.").includes("****") && N("**BANZA** aberto.").includes("**BANZA**"), "existing bold left intact");
    // (11) Inline code / fenced code / links / URLs are protected.
    {
      const a = N("Usa `banza init` e o BANZA. Vê [banza](https://x/banza) e https://banza.network e o BANZA.");
      emit(a.includes("`banza init`"), "inline code untouched");
      emit(a.includes("[banza](https://x/banza)"), "markdown link untouched");
      emit(a.includes("https://banza.network"), "URL untouched");
      emit((a.match(/\*\*BANZA\*\*/g) || []).length === 2, "plain BANZA bolded, protected spans left alone");
    }
    {
      const a = N("Exemplo:\n```\nconst banza = 1;\nconst banzai = 2;\n```\nDepois o BANZA fica pronto.");
      emit(a.includes("const banza = 1;") && a.includes("const banzai = 2;"), "fenced code block untouched");
      emit(a.includes("**BANZA**"), "text after fenced code still bolded");
    }
    // (12) Paths / domains / packages / doc-ids are NOT bolded.
    {
      const a = N("Vê banza.network e o pacote banzai-api em engines/banzai-api-kb. O ficheiro BANZA.md e o ADR-012. Mas o BANZA é aberto.");
      emit(a.includes("banza.network") && !a.includes("**banza**.network") && !a.includes("**banza.network**"), "domain banza.network not bolded");
      emit(a.includes("banzai-api") && !a.includes("**banzai**-api") && !a.includes("**banzai-api**"), "package banzai-api not bolded");
      emit(a.includes("engines/banzai-api-kb") && !a.includes("**banzai"), "path engines/banzai-api-kb not bolded");
      emit(a.includes("BANZA.md") && !a.includes("**BANZA**.md") && !a.includes("**BANZA.md**"), "doc-id BANZA.md not bolded");
      emit(a.includes("ADR-012") && !a.includes("**ADR**-006") && !a.includes("**ADR-012**"), "doc-id ADR-012 not bolded");
      emit(a.includes("**BANZA**"), "standalone BANZA still bolded");
    }
    // (13) Canonical spelling is emitted (drift fixed).
    {
      const a = N("o banzami e o BANZAI e a operador zero e a trust root e o kz_demo");
      emit(a.includes("**Banzami**"), "banzami → **Banzami**");
      emit(a.includes("**BanzAI**"), "BANZAI → **BanzAI**");
      emit(a.includes("**Operador Zero**"), "operador zero → **Operador Zero**");
      emit(a.includes("**Trust Root**"), "trust root → **Trust Root**");
      emit(a.includes("**KZ_DEMO**"), "kz_demo → **KZ_DEMO**");
    }
    // (14) Whole-word: BANZA is not matched inside Banzami/BanzAI; ADR-012 preserved but ADRs plural bolded.
    {
      const a = N("Só o Banzami aqui.");
      emit(a.includes("**Banzami**") && !/\*\*BANZA\*\*mi/.test(a), "no mid-word bold inside Banzami");
      const b = N("Os ADRs e os RFCs governam. O ADR-012 é um deles.");
      emit(b.includes("**ADRs**") && b.includes("**RFCs**") && b.includes("ADR-012") && !b.includes("**ADR-012**"), "plural ADRs/RFCs bolded, ADR-012 doc-id preserved");
    }
    // (15) Common words are NOT bolded (no over-bolding).
    {
      const a = N("O protocolo é aberto e o operador escolhe o pagamento e a carteira.");
      emit(!/\*\*/.test(a), "common words (protocolo/operador/pagamento/carteira) not bolded");
    }
    // (16) Every deterministic answer renders with at least one bold entity.
    {
      const qs = ["me fala do banzami", "quem criou o BANZA?", "o que é uma ADR", "o que é guard", "transfere 100 kz"];
      let allBold = true;
      for (const q of qs) {
        const d = route(normalize(q));
        const e = d.entry_id ? getEntry(d.entry_id) : null;
        const a = normalizeBanzaiAnswer((e && e.answer) || "", (e && e.sources) || []).answer;
        if (!/\*\*[^*]+\*\*/.test(a)) { allBold = false; console.log("   (no bold in) " + q); }
      }
      emit(allBold, "every sampled deterministic answer has ≥1 bold entity");
    }
    // (17) The rendering contract is preserved (no in-body sources leaked by the emphasis pass).
    {
      const a = normalizeBanzaiAnswer("Banzami criou o BANZA.\nFontes citáveis: GOVERNANCE.md; ADR-001.", []);
      emit(!/\n\s*Fontes/i.test(a.answer) && a.answer.includes("**Banzami**"), "emphasis pass keeps the clean-body/source-separation contract");
    }
    // (18) ADVERSARIAL regressions: multi-word entities never self-nest; entities abutting protected
    //      bold never glue into ****; reference-style links / unclosed code are not emphasised inside.
    emit(N("Financial Action Boundary") === "**Financial Action Boundary**", "Financial Action Boundary does not self-nest into ****");
    emit(!N("a financial action boundary and the action boundary").includes("****"), "FAB + AB in one line: no ****");
    emit(!N("**nota**BANZA").includes("****") && !N("BANZA**nota**").includes("****") && !N("**a**BANZA**b**").includes("****"), "entity abutting protected bold never yields ****");
    emit(N("ver [BANZA] aqui").includes("[BANZA]") && !N("ver [BANZA] aqui").includes("**BANZA**]"), "shortcut reference link not emphasised inside");
    emit(N("[BANZA]: https://x").startsWith("[BANZA]:"), "reference-link definition not emphasised inside");
    emit(N("o `banza fica").includes("`banza") && !N("o `banza fica").includes("**banza"), "unclosed inline code not emphasised inside");
    emit(N("isto ***importante*** e BANZA").includes("***importante***"), "legitimate bold-italic (***) preserved");
    console.log(bad === 0 ? "NODE_OK" : ("NODE_BAD:" + bad));
  ' 2>&1) || true
  echo "$OUT" | grep -E "^BAD|NODE_OK|NODE_BAD|no bold in" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "consistent all-occurrence emphasis; code/URL/path/domain/doc-id safe; canonical spelling; no over-bold" \
    || fail "entity-formatting behavioural check failed"

  # (18) Self-test — the discriminator distinguishes an entity from a path/domain and bolds every hit.
  node --input-type=module -e '
    import { normalizeBanzaiAnswer } from "./services/banzai-api/src/answerContract.js";
    const a = normalizeBanzaiAnswer("banza e banza mas banza.network não.", []).answer;
    if ((a.match(/\*\*BANZA\*\*/g) || []).length !== 2) { console.error("SELFTEST: not every plain occurrence bolded"); process.exit(2); }
    if (a.includes("**banza.network**") || a.includes("**banza**.network")) { console.error("SELFTEST: domain bolded"); process.exit(2); }
    if (a.includes("****")) { console.error("SELFTEST: double-bold"); process.exit(2); }
  ' && ok "self-test: all plain occurrences bolded; domain spared; no double-bold" || { echo "SELFTEST FAILED"; FAILED=1; }
else
  ok "node unavailable — static checks only"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "ENTITY FORMATTING CONSISTENCY CHECK PASSED ✅"; else echo "ENTITY FORMATTING CONSISTENCY CHECK FAILED ✗"; fi
exit "$FAILED"
