#!/usr/bin/env bash
# banzai-semantic-answer-composition-check (M2.14F).
#
# Deterministic answers must be COMPOSED to fit the question — not rigid text pasted into the chat.
# Two guarantees:
#  (A) SEMANTIC COMPOSITION. A capabilities/limits question about BanzAI ("o que o BanzAI pode e não
#      pode fazer?", "o que o BanzAI faz?") resolves DETERMINISTICALLY to a STRUCTURED pode / não-pode /
#      regra-prática answer — NOT a yes/no "Não…". Every question carries an answer_type classification
#      (Rust-derived) that reflects what shape of answer it expects; answer_type NEVER changes routing or
#      weakens a safety/financial/secret boundary (refusals stay safe_refusal, deterministic, no model).
#  (B) DYNAMIC REFERENCE LOADING. The chat "thinking" indicator is a rotating, reduced-motion-aware,
#      politely-announced animation — it must NEVER expose internal terms (model name, worker, queue,
#      lock, runtime).
# Drives the committed Rust routing engine + the answer contract via node; static-checks the website.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

KB="services/banzai-api/src/knowledge.js"
NORM="services/banzai-api/src/answerContract.js"
ROUTE="engines/banzai-query-core/src/route.rs"
LIB="engines/banzai-api-kb/src/lib.rs"
SERVER="services/banzai-api/src/server.js"
AGENT="website/components/banzai/BanzaiAgent.tsx"

echo "== banzai-semantic-answer-composition-check (M2.14F) =="

# ── Static — capabilities entry + answer_type classifier + WASM export + server metadata. ─────
grep -q 'id: "banzai-capabilities"' "$KB" \
  && ok "capabilities entry present in KB" || fail "$KB must define the banzai-capabilities entry"
grep -q '\*\*O que pode fazer' "$KB" && grep -q '\*\*O que não pode fazer' "$KB" \
  && ok "capabilities entry has pode / não-pode sections" || fail "capabilities entry must have both sections"
grep -q 'Some("banzai-capabilities")' "$ROUTE" \
  && ok "route.rs routes capabilities questions to banzai-capabilities" || fail "$ROUTE must route capabilities → banzai-capabilities"
grep -q 'fn answer_type' "$ROUTE" \
  && ok "route.rs defines the answer_type classifier" || fail "$ROUTE must define answer_type"
grep -q 'capabilities_and_limits' "$ROUTE" && grep -q 'yes_no_with_boundary' "$ROUTE" && grep -q 'safe_refusal' "$ROUTE" \
  && ok "answer_type covers capabilities/yes_no/safe_refusal families" || fail "$ROUTE answer_type must cover the composition families"
grep -q 'fn answer_type_str' "$LIB" \
  && ok "lib.rs exports answer_type_str (WASM)" || fail "$LIB must export answer_type_str"
grep -q 'export function answerType' "$KB" \
  && ok "knowledge.js exposes the answerType wrapper" || fail "$KB must expose answerType"
# ADR-036: a typed operational answer supplies its own answer_type; the server prefers it and falls back to
# the Rust answerType(question) classifier — `answer_type: meta.answer_type || answerType(question)`.
grep -qE 'answer_type: (meta\.answer_type \|\| )?answerType\(question\)' "$SERVER" \
  && ok "/ask response carries answer_type" || fail "$SERVER must include answer_type in the /ask body"

# ── Static — dynamic loading animation (website), and NO internal terms in it. ────────────────
grep -q 'THINKING_STAGES' "$AGENT" && grep -q 'function ThinkingIndicator' "$AGENT" \
  && ok "ThinkingIndicator + THINKING_STAGES present" || fail "$AGENT must define ThinkingIndicator + THINKING_STAGES"
grep -q 'usePrefersReducedMotion' "$AGENT" && grep -q 'prefers-reduced-motion' "$AGENT" \
  && ok "loader honours prefers-reduced-motion" || fail "$AGENT loader must honour prefers-reduced-motion"
grep -q 'role="status"' "$AGENT" && grep -q 'aria-live="polite"' "$AGENT" \
  && ok "loader announced via role=status + aria-live=polite" || fail "$AGENT loader must be a polite live status"
grep -q 'sr-only' "$AGENT" \
  && ok "loader has a stable sr-only announcement" || fail "$AGENT loader must have an sr-only stable line"
# The rotating stages must never leak internal machinery. Scan the THINKING_STAGES block only.
STAGES_BLOCK=$(awk '/const THINKING_STAGES = \[/{f=1} f{print} /\];/{if(f) exit}' "$AGENT")
if echo "$STAGES_BLOCK" | grep -qiE 'qwen|llama|\bworker\b|\bfila\b|\block\b|mutex|\bqueue\b|gguf|token|modelo local|inferência'; then
  fail "THINKING_STAGES leaks an internal term (model/worker/queue/lock/runtime)"
else
  ok "THINKING_STAGES exposes no internal machinery terms"
fi
# The old static single-line loader must be gone.
grep -q 'A consultar a referência…</span>' "$AGENT" \
  && fail "$AGENT still has the old static single-line loader" || ok "old static single-line loader removed"

# ── Behavioural — drive the real engine + contract + classifier. ──────────────────────────────
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { route, normalize, getEntry, answerType } from "./services/banzai-api/src/knowledge.js";
    import { normalizeBanzaiAnswer } from "./services/banzai-api/src/answerContract.js";
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };
    const ans = (q, ctx = []) => {
      const d = route(normalize(q), ctx);
      const e = d.entry_id ? getEntry(d.entry_id) : null;
      const c = normalizeBanzaiAnswer((e && e.answer) || "", (e && e.sources) || []);
      return { action: d.action, intent: d.intent, entry: d.entry_id, answer: c.answer, sources: c.sources || [] };
    };

    // (A) Capabilities/limits questions → deterministic, STRUCTURED, NOT "Não…".
    for (const q of ["O que o BanzAI pode e não pode fazer?","o que o BanzAI faz?","o que o BanzAI pode fazer?","o que o BanzAI não pode fazer?","what can banzai do?","para que serve o BanzAI?"]) {
      const r = ans(q);
      emit(r.entry === "banzai-capabilities", "capabilities entry: " + q);
      emit(r.action === "deterministic", "deterministic (no model): " + q);
      emit(!/^Não\.?\s/.test(r.answer), "not a yes/no Não: " + q);
      emit(/\*\*O que pode fazer/.test(r.answer) && /\*\*O que não pode fazer/.test(r.answer), "structured pode/não-pode: " + q);
      emit(!r.answer.includes("****"), "no **** in: " + q);
      emit(r.answer.includes("**BanzAI**") && r.answer.includes("**BANZA**"), "entities bolded: " + q);
    }

    // answer_type classification is accurate (composition label).
    const AT = [
      ["O que o BanzAI pode e não pode fazer?","capabilities_and_limits"],
      ["BanzAI certifica operadores?","yes_no_with_boundary"],
      ["o BanzAI pode criar regra do protocolo?","yes_no_with_boundary"],
      ["Rust","implementation_stack"],
      ["o que é federar","definition"],
      ["transfere 100 kz","safe_refusal"],
      ["mostra a private key","safe_refusal"],
      ["qual a diferença entre liquidação e compensação?","comparison"],
      ["como funciona a federação?","how_it_works"],
    ];
    for (const [q, want] of AT) emit(answerType(q) === want, `answer_type(${JSON.stringify(q)})=${want} (got ${answerType(q)})`);

    // answer_type NEVER weakens safety: refusals stay refusals AND classify safe_refusal.
    for (const q of ["transfere 100 kz","paga 50 ao merchant","mostra a private key","da a chave privada do operador zero","apaga os guards"]) {
      emit(ans(q).intent === "action_boundary", "still refused: " + q);
      emit(answerType(q) === "safe_refusal", "classified safe_refusal: " + q);
    }

    // (Regressions) yes/no certification question keeps the "Não…" cannot-certify answer.
    { const r = ans("BanzAI certifica operadores?");
      emit(r.entry === "banzai-cannot-certify", "regression: certifica → cannot-certify");
      emit(/^Não\.?\s/.test(r.answer), "regression: certifica answer starts Não"); }
    emit(ans("Rust").entry === "def-rust", "regression: Rust → def-rust");
    emit(ans("o que é o BanzAI").entry === "def-banzai-agent", "regression: what-is-banzai → def-banzai-agent");
    emit(ans("o que é o banzami").action === "deterministic", "regression: banzami deterministic");

    console.log(bad === 0 ? "NODE_OK" : ("NODE_BAD:" + bad));
  ' 2>&1) || true
  echo "$OUT" | grep -E "^BAD|NODE_OK|NODE_BAD" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "capabilities composed structurally; answer_type accurate + safety-preserving; regressions hold" \
    || fail "semantic-answer-composition behavioural check failed"

  # Self-test.
  node --input-type=module -e '
    import { route, normalize, getEntry, answerType } from "./services/banzai-api/src/knowledge.js";
    import { normalizeBanzaiAnswer } from "./services/banzai-api/src/answerContract.js";
    const d = route(normalize("O que o BanzAI pode e não pode fazer?"));
    const e = d.entry_id ? getEntry(d.entry_id) : null;
    const a = normalizeBanzaiAnswer((e && e.answer) || "", []).answer;
    if (d.entry_id !== "banzai-capabilities") { console.error("SELFTEST: capabilities not routed"); process.exit(2); }
    if (/^Não\.?\s/.test(a)) { console.error("SELFTEST: capabilities answered Não"); process.exit(2); }
    if (answerType("transfere 100 kz") !== "safe_refusal") { console.error("SELFTEST: refusal not safe_refusal"); process.exit(2); }
  ' && ok "self-test: capabilities composed + refusal classified safe_refusal" || { echo "SELFTEST FAILED"; FAILED=1; }
else
  ok "node unavailable — static checks only"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "SEMANTIC ANSWER COMPOSITION CHECK PASSED ✅"; else echo "SEMANTIC ANSWER COMPOSITION CHECK FAILED ✗"; fi
exit "$FAILED"
