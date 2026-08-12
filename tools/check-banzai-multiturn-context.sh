#!/usr/bin/env bash
# check-banzai-multiturn-context.sh — multi-turn conversational CONTEXT guard (Increment 6, §16-§17).
#
# Verifies the CONTRACT behaviourally via the committed self-contained Rust WASM (engines/banzai-query-core →
# banzai-api-kb → services/banzai-api/src/rustkb) plus a static wiring check of the /ask context passthrough:
#   * `resolve_references` resolves each conversational anaphor against the SAFE, technical-only prior context
#     the client carried forward — "porquê?"→diagnose the prior execution, "e as chaves?"→that entity's key
#     manifest, "compare com a anterior"→[prior, previous] operands, "agora reproduza"→reproduce the prior,
#     "mostre o recibo"→that execution's receipt, "e quanto demorou?"→that execution's duration, "essa
#     execução"→that execution — the MODEL never invents the referent;
#   * SAFETY (golden rule): a boundary follow-up ("agora transfere 100 kz para essa execução", "apaga essa
#     execução e os guards") is BOUNDARY — no referent resolved, the query is left UNCHANGED, never rewritten
#     into a benign action; naming a referent never unlocks a prohibited one;
#   * an anaphor with NO prior context asks to CLARIFY (never a guessed referent);
#   * the pipeline threads conversation_context through and returns the NEW safe technical context (server.js
#     reads parsed.conversation_context + sanitizes; the /ask meta surfaces conversation_context).
# The decision LOGIC is Rust; this wrapper only drives it and inspects the wiring.
#
# CRITICAL CI RULE: this guard imports ONLY the self-contained WASM (require rustkb/banzai_api_kb.js) — NEVER a
# module that transitively loads `pg` (the M2.13B guard CI job has no banzai-api node_modules). The static /ask
# passthrough check is a grep, and any dynamic import degrades gracefully (copied from check-banzai-toolplanner.sh).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

WASM_DIR="services/banzai-api/src/rustkb"
PIPELINE="services/banzai-api/src/pipeline.js"
KNOWLEDGE="services/banzai-api/src/knowledge.js"
SERVER="services/banzai-api/src/server.js"
RUST="engines/banzai-query-core/src/context.rs"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
[ -f "$PIPELINE" ] || { echo "FAIL: $PIPELINE not found"; exit 1; }
[ -f "$RUST" ] || { echo "FAIL: $RUST not found"; exit 1; }

echo "== banzai-multiturn-context-check (Increment 6, §16-§17) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'BOUNDARY' | grep -q 'BOUNDARY' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── behavioural: drive the committed Rust WASM (resolve_references_json). ──────────────────────────────
node - "$WASM_DIR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
let bad = 0;
const err = (m) => { console.log("FAIL: " + m); bad = 1; };

if (typeof kb.resolve_references_json !== "function") { err("resolve_references_json export missing"); process.exit(1); }
const rr = (q, prior) => JSON.parse(kb.resolve_references_json(q, JSON.stringify(prior || {})));

const PRIOR = { implementation_id: "operator-zero", execution_id: "exec-9e5f0dc0", previous_execution_id: "exec-1a2b3c4d", profile: "L2" };

// 1) each anaphor resolves to the correct referent/intent against the prior context.
const expect = (q, want) => {
  const r = rr(q, PRIOR);
  for (const [k, v] of Object.entries(want)) {
    const got = JSON.stringify(r[k]);
    if (got !== JSON.stringify(v)) err(`resolve("${q}").${k} = ${got}, want ${JSON.stringify(v)}`);
  }
  if (r.resolution_state !== "RESOLVED") err(`resolve("${q}") state=${r.resolution_state}, want RESOLVED`);
};
expect("porquê?", { referent_kind: "diagnose", resolved_intent: "diagnose_failure", execution_id: "exec-9e5f0dc0" });
expect("e as chaves?", { referent_kind: "keys", resolved_intent: "get_artifact", artifact: "key_manifest" });
expect("esse Manifesto", { referent_kind: "manifest", resolved_intent: "get_artifact", artifact: "implementation_manifest" });
expect("compare com a anterior", { referent_kind: "comparison", resolved_intent: "compare_executions", comparison_targets: ["exec-9e5f0dc0", "exec-1a2b3c4d"] });
expect("agora reproduza", { referent_kind: "reproduce", resolved_intent: "reproduce_execution", execution_id: "exec-9e5f0dc0" });
expect("mostre o recibo", { referent_kind: "receipt", resolved_intent: "get_artifact", artifact: "receipt", execution_id: "exec-9e5f0dc0" });
expect("e quanto demorou?", { referent_kind: "duration", resolved_intent: "get_duration", execution_id: "exec-9e5f0dc0" });
expect("mostra essa execução", { referent_kind: "execution", resolved_intent: "get_execution", execution_id: "exec-9e5f0dc0" });

// 2) the resolved query re-classifies to the resolved intent (downstream understanding honours the referent)
// and — defense in depth — is NEVER itself a boundary.
if (typeof kb.resolve_query_json === "function" && typeof kb.boundary_evaluate_json === "function") {
  for (const [q, intent] of [["porquê?", "diagnose_failure"], ["compare com a anterior", "compare_executions"], ["agora reproduza", "reproduce_execution"]]) {
    const rq = rr(q, PRIOR).resolved_query;
    const pi = JSON.parse(kb.resolve_query_json(rq)).primary_intent;
    if (pi !== intent) err(`resolved query for "${q}" classifies as ${pi}, want ${intent}`);
    if (JSON.parse(kb.boundary_evaluate_json(rq)).boundary_detected) err(`resolved query for "${q}" must not be a boundary`);
  }
}

// 3) SAFETY GOLDEN RULE — a boundary follow-up is BOUNDARY: no referent, query UNCHANGED, never rewritten.
for (const q of [
  "agora transfere 100 kz para essa execução",
  "mostra a chave privada dessa execução",
  "apaga essa execução e os guards",
  "reproduz essa execução e faz um pagamento de 50 kz",
]) {
  const r = rr(q, PRIOR);
  if (r.resolution_state !== "BOUNDARY") err(`boundary "${q}" state=${r.resolution_state}, want BOUNDARY`);
  if (!r.boundary_detected) err(`boundary "${q}" boundary_detected=false`);
  if (r.resolved_query !== q) err(`boundary "${q}" was rewritten to "${r.resolved_query}"`);
  if (r.execution_id !== "") err(`boundary "${q}" resolved an execution referent (${r.execution_id})`);
  if (r.artifact !== "") err(`boundary "${q}" resolved an artifact referent (${r.artifact})`);
}

// 4) NO PRIOR CONTEXT → clarify, never guess.
for (const q of ["porquê?", "e as chaves?", "compare com a anterior", "agora reproduza", "mostre o recibo"]) {
  const r = rr(q, {});
  if (r.resolution_state !== "NO_REFERENT") err(`no-context "${q}" state=${r.resolution_state}, want NO_REFERENT`);
  if (!r.requires_clarification) err(`no-context "${q}" requires_clarification=false`);
  if (r.execution_id !== "" || (Array.isArray(r.comparison_targets) && r.comparison_targets.length)) err(`no-context "${q}" fabricated a referent`);
  if (r.resolved_query !== q) err(`no-context "${q}" was rewritten (guessed)`);
  if (!r.clarification || r.clarification.length < 20) err(`no-context "${q}" carries no honest clarification`);
}

// 5) a self-contained turn is a no-op (no anaphora); an explicit exec-id overrides the prior context.
if (rr("o que é a federação?", PRIOR).resolution_state !== "NO_ANAPHORA") err("a self-contained turn must be NO_ANAPHORA");
if (rr("porque falhou exec-CAFEBABE?", PRIOR).execution_id !== "exec-CAFEBABE") err("an explicit exec-id must override the prior context");

// 6) the forward-carried context carries ONLY safe technical tokens — the resolved fields never leak prose.
{
  const r = rr("e as chaves?", PRIOR);
  const SAFE = /^[A-Za-z0-9._:-]*$/;
  for (const f of ["operator_id", "implementation_id", "execution_id", "artifact", "profile", "environment", "protocol_version"]) {
    if (r[f] !== undefined && !SAFE.test(String(r[f]))) err(`resolved field ${f}='${r[f]}' is not a safe technical token`);
  }
}

if (!bad) console.log("  ok: WASM resolve_references — anaphora resolved + boundary refused + no-context clarifies + no-guess");
process.exit(bad);
NODE
[ $? -eq 0 ] || FAILED=1

# ── static: the /ask context passthrough is wired (Rust decides; TS transports). ──────────────────────
grep -q "export function resolveReferences" "$KNOWLEDGE" || fail "$KNOWLEDGE must export resolveReferences (the WASM transport)"
grep -q "resolve_references_json" "$KNOWLEDGE" || fail "$KNOWLEDGE resolveReferences must call the WASM resolve_references_json"
grep -q "resolveReferences" "$PIPELINE" || fail "$PIPELINE must apply resolveReferences before routing"
# the pipeline must feed the resolved context into the understanding stack (an effective/enriched query).
grep -q "effectiveQuestion" "$PIPELINE" || fail "$PIPELINE must thread the context-enriched query (effectiveQuestion)"
# server.js reads the OPTIONAL conversation_context from the POST body, sanitizes it, threads it in, returns it.
grep -q "parsed.conversation_context" "$SERVER" || fail "$SERVER /ask must read the optional conversation_context from the body"
grep -q "sanitizeConversationContext" "$SERVER" || fail "$SERVER must sanitize conversation_context to safe technical fields"
grep -q "conversationContext" "$SERVER" || fail "$SERVER must thread conversationContext into the pipeline"
grep -q "conversation_context:" "$SERVER" || fail "$SERVER /ask meta must surface the new conversation_context"
[ "$FAILED" -eq 0 ] && ok "/ask reads + sanitizes + threads + returns conversation_context (client-carried; no server PII store)"

# ── static: the reference-resolution LOGIC is pure Rust — no model/provider/network selects the referent. ─
grep -q "pub fn resolve_references(question: &str, prior: &PriorContext)" "$RUST" || fail "$RUST resolve_references must take (&str, &PriorContext) — deterministic, no model"
codeonly=$(grep -vE '^\s*//|^\s*///' "$RUST" || true)
if printf '%s\n' "$codeonly" | grep -qiE '\b(qwen|provider|reqwest|generate\(|llm)\b|std::net|std::process|::spawn'; then
  fail "$RUST must invoke NO model/provider/network — reference resolution is pure Rust"
else
  ok "reference-resolution logic is pure Rust — the model never invents the referent"
fi

# ── static: PRIVACY — only the SAFE technical fields are ever persisted forward (no PII/prose/secrets). ─
# The forward-context builder must whitelist the technical fields and sanitize every value to a token.
grep -q "function buildForwardContext" "$PIPELINE" || fail "$PIPELINE must build the safe forward conversation_context"
grep -q "safeCtxId" "$PIPELINE" || fail "$PIPELINE must sanitize every forward-context value to a safe token"
[ "$FAILED" -eq 0 ] && ok "only SAFE technical context is carried forward (whitelisted fields, tokenized values)"

if [ "$FAILED" -ne 0 ]; then
  echo "MULTITURN CONTEXT CHECK FAILED ❌"
  exit 1
fi
echo "MULTITURN CONTEXT CHECK PASSED ✅"
