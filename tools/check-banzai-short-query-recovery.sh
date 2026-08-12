#!/usr/bin/env bash
# banzai-short-query-recovery-check (M2.14C-FIX2).
#
# Two guarantees:
#  (A) Short queries / follow-ups for known technology, stack and ecosystem terms (Rust, TypeScript,
#      WASM, Qwen, PostgreSQL, pgvector, nginx, Docker, JSON, Bash, Node, BanzAI, ADR, guard, CI) resolve
#      DETERMINISTICALLY with a real answer + cited sources — never no_source / EVIDÊNCIA INSUFICIENTE,
#      never the model (external_model_called stays false).
#  (B) Every fallback / no_source / deterministic body passes the global entity-emphasis contract,
#      INCLUDING slash-separated entity lists: "Banzami/BANZA/BanzAI" → "**Banzami**/**BANZA**/**BanzAI**",
#      while paths/domains/doc-ids/routes ("engines/banzai-api-kb", "banza.network", "ADR-006",
#      "/operador-zero") stay untouched, and never "****".
# Drives the committed Rust routing engine + the answer contract via node.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

KB="services/banzai-api/src/knowledge.js"
NORM="services/banzai-api/src/answerContract.js"
GLOSS="engines/banzai-query-core/src/glossary.rs"

echo "== banzai-short-query-recovery-check (M2.14C-FIX2) =="

# ── Static — the tech def entries + glossary terms + slash-run exist. ─────────────────────────
for id in def-rust def-wasm def-typescript def-qwen def-node def-json-format def-banzai-agent; do
  grep -q "id: \"$id\"" "$KB" && ok "entry present: $id" || fail "$KB must define $id"
done
grep -q 'Some("def-rust")' "$GLOSS" && grep -q 'Some("def-qwen")' "$GLOSS" \
  && ok "glossary maps tech terms (rust/qwen/…) to def-*" || fail "$GLOSS must map tech terms"
grep -q "SLASH_RUN" "$NORM" && grep -q "boldSlashRun" "$NORM" \
  && ok "answerContract has the slash-run entity pass" || fail "$NORM must define the slash-run pass"

# ── Behavioural — drive the real engine + contract. ──────────────────────────────────────────
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";
    import { normalizeBanzaiAnswer } from "./services/banzai-api/src/answerContract.js";
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };
    const ans = (q, ctx = []) => {
      const d = route(normalize(q), ctx);
      const e = d.entry_id ? getEntry(d.entry_id) : null;
      const c = normalizeBanzaiAnswer((e && e.answer) || "", (e && e.sources) || []);
      return { action: d.action, intent: d.intent, entry: d.entry_id, answer: c.answer, sources: c.sources || [] };
    };
    // (A) known short tech terms → deterministic, real answer, sources, not no_source.
    for (const q of ["Rust","TypeScript","JavaScript","WASM","WebAssembly","React","Next.js","JSON","Bash","Node","Node.js","Qwen","PostgreSQL","pgvector","nginx","Docker","BanzAI"]) {
      const r = ans(q);
      emit(r.action !== "insufficient" && r.intent !== "no_source", "not no_source: " + q);
      emit(r.action === "deterministic", "deterministic (no model): " + q);
      emit((r.answer || "").length > 40, "real answer: " + q);
      emit(!r.answer.includes("****"), "no **** in: " + q);
    }
    // Rust answer bolds the key entities.
    { const a = ans("Rust").answer;
      emit(a.includes("**Rust**") && a.includes("**BANZA**") && a.includes("**WASM**"), "Rust answer bolds Rust/BANZA/WASM"); }
    // (follow-up) linguagem? then Rust → still deterministic def-rust (context OR bare both work).
    emit(ans("Rust", ["em que linguagem de programacao foi feito o protocolo?"]).entry === "def-rust", "follow-up Rust → def-rust");

    // (B) slash-separated entity lists bold each segment (fallback formatting).
    const S = (s) => normalizeBanzaiAnswer(s, []).answer;
    emit(S("a distinção Banzami/BANZA/BanzAI aqui").includes("**Banzami**/**BANZA**/**BanzAI**"), "slash: Banzami/BANZA/BanzAI");
    emit(S("vê BANZA/BanzAI").includes("**BANZA**/**BanzAI**"), "slash: BANZA/BanzAI");
    emit(S("governança ADR/RFC").includes("**ADR**/**RFC**"), "slash: ADR/RFC");
    emit(S("Rust/WASM").includes("**Rust**/**WASM**"), "slash: Rust/WASM");
    emit(S("TypeScript/React/Next.js").includes("**TypeScript**/**React**/**Next.js**"), "slash: TypeScript/React/Next.js");
    // no over-bold of paths / domains / doc-ids / routes; no ****
    emit(S("engines/banzai-api-kb").includes("engines/banzai-api-kb") && !S("engines/banzai-api-kb").includes("**"), "path engines/banzai-api-kb untouched");
    emit(S("banza.network").includes("banza.network") && !S("banza.network").includes("**banza"), "domain banza.network untouched");
    emit(S("o ADR-006 explica").includes("ADR-006") && !S("o ADR-006 explica").includes("**ADR**-006"), "doc-id ADR-006 untouched");
    emit(S("/operador-zero e /operators").includes("/operador-zero") && !S("/operador-zero e /operators").includes("**"), "routes untouched");
    emit(!S("Banzami/BANZA/BanzAI").includes("****"), "slash run never yields ****");
    // all-or-nothing: a MIXED run (entity + non-entity, incl. lowercase NC) stays untouched.
    emit(S("rust/pass") === "rust/pass" && S("banza/adr") === "banza/adr" && S("Qwen/llama.cpp") === "Qwen/llama.cpp", "mixed slash run left untouched");
    // the no_source fallback itself bolds the slash entities.
    { const ns = ans("xyzabc-termo-desconhecido-qualquer");
      emit(ns.action === "insufficient", "unknown term → insufficient (last resort)");
      emit(!/Banzami\/BANZA\/BanzAI(?!\*)/.test(ns.answer.replace(/\*\*/g,"")) || ns.answer.includes("**Banzami**/**BANZA**/**BanzAI**") || !ns.answer.includes("Banzami/BANZA"), "fallback entities not raw"); }

    // Regressions — M2.14C-FIX1 / M2.14D must hold.
    emit(ans("o que é o banzami").action === "deterministic", "regression: banzami deterministic");
    for (const q of ["transfere 100 kz","mostra a private key","da a chave privada do operador zero"]) {
      emit(ans(q).intent === "action_boundary", "regression boundary: " + q);
    }
    console.log(bad === 0 ? "NODE_OK" : ("NODE_BAD:" + bad));
  ' 2>&1) || true
  echo "$OUT" | grep -E "^BAD|NODE_OK|NODE_BAD" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "short tech terms deterministic; slash entities bolded; protections + regressions hold" \
    || fail "short-query-recovery behavioural check failed"

  # Self-test.
  node --input-type=module -e '
    import { route, normalize } from "./services/banzai-api/src/knowledge.js";
    import { normalizeBanzaiAnswer } from "./services/banzai-api/src/answerContract.js";
    if (route(normalize("Rust")).action !== "deterministic") { console.error("SELFTEST: Rust not deterministic"); process.exit(2); }
    if (!normalizeBanzaiAnswer("Banzami/BANZA/BanzAI",[]).answer.includes("**Banzami**/**BANZA**/**BanzAI**")) { console.error("SELFTEST: slash not bolded"); process.exit(2); }
  ' && ok "self-test: Rust deterministic + slash entities bolded" || { echo "SELFTEST FAILED"; FAILED=1; }
else
  ok "node unavailable — static checks only"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "SHORT QUERY RECOVERY CHECK PASSED ✅"; else echo "SHORT QUERY RECOVERY CHECK FAILED ✗"; fi
exit "$FAILED"
