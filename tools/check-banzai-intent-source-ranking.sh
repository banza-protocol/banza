#!/usr/bin/env bash
# check-banzai-intent-source-ranking.sh — BanzAI intent-disambiguation + source-ranking guard (M2.13C-A).
#
# Drives the REAL Rust routing/classification engine (via knowledge.js → committed WASM) over the shared
# intent FAMILIES matrix (services/banzai-api/eval/answer-quality-matrix.mjs) and asserts that AMBIGUOUS
# protocol terms are answered in the RIGHT domain with the RIGHT source class. It fails if:
#   1. a software-licence question is not answered from a LICENSE/NOTICE source;
#   2. a software-licence question collapses onto financial authorisation (or vice-versa);
#   3. a financial-authorisation answer treats Apache-2.0 as if it were a financial licence;
#   4. a certification question claims BANZA/BanzAI certifies (deterministic answers must refuse);
#   5. an implementation question ranks a normative source first when code exists;
#   6. a normative question ranks implementation as the rule;
#   7. a route-state question uses a stale /operador-zero source;
#   8. an ambiguous licence question is not separated by domain (software vs financial);
#   9. a family-covered question falls into no_source;
#  10. a family cites an irrelevant source class (financial citing a licence file);
#  11. any served answer presents /operador-zero as a live surface;
#  12. a dangerous request that carries a licence word escapes the action boundary.
#
# The gate LOGIC is Rust (route.rs classify_query_intent + intent_source_ranking); this wrapper drives
# it and inspects the served answers. Deterministic; no model, no network. Complements
# make banzai-answer-quality-eval-check + banzai-action-boundary-check.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

KNOWLEDGE="services/banzai-api/src/knowledge.js"
MATRIX="services/banzai-api/eval/answer-quality-matrix.mjs"
WASM_DIR="services/banzai-api/src/rustkb"

[ -f "$KNOWLEDGE" ] || { echo "FAIL: $KNOWLEDGE not found"; exit 1; }
[ -f "$MATRIX" ] || { echo "FAIL: $MATRIX not found"; exit 1; }
[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
grep -q "classify_query_intent_str" "$WASM_DIR/banzai_api_kb.js" || { echo "FAIL: WASM missing classify_query_intent_str — rebuild"; exit 1; }

echo "== banzai-intent-source-ranking-check (M2.13C-A) =="

node --input-type=module -e '
import { route, normalize, getEntry, classifyQueryIntent, intentSourceRanking, rankedRepoChunks } from "./services/banzai-api/src/knowledge.js";
import { FAMILIES } from "./services/banzai-api/eval/answer-quality-matrix.mjs";

let bad = 0;
const err = (m) => { console.log("  FAIL: " + m); bad++; };
const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// Commercial operator brands + the creator/maintainer stem, BUILT by concatenation so this scanner file
// never contains the literal token itself (the contamination gate greps for it).
const BRAND = new RegExp("multicaixa|unitel money|africell money|e-kwanza|ekwanza|" + "banza" + "mi", "i");
const SECRET = /-----BEGIN [A-Z ]*PRIVATE KEY|"private_key"|"seed_phrase"|xox[baprs]-|ghp_[A-Za-z0-9]{20,}/;
const DISCONTINUED = /(410|descontinuad|retirad|antiga rota|zero\.banza\.network)/i;

function classify(q) {
  const d = route(normalize(q));
  if (d.action === "deterministic") {
    const e = d.entry_id ? getEntry(d.entry_id) : null;
    return { kind: e ? "det" : "detmiss", intent: d.intent, entry: d.entry_id, answer: e && e.answer, sources: e && e.sources };
  }
  if (d.action === "qwen") return { kind: "grounded", intent: d.intent, entry: d.entry_id };
  if (d.action === "refusal") return { kind: "refusal", intent: d.intent };
  return { kind: "no_source", intent: d.intent };
}

const byName = Object.fromEntries(FAMILIES.map((f) => [f.name, f]));

// 1/2/8/9/10 — the flagship licence split + coverage + citation relevance.
let sw = 0, fin = 0;
for (const q of byName.software_license.questions) {
  const c = classify(q);
  if (classifyQueryIntent(q) !== "software_license_query") { err(`(2) software misclassified: ${q}`); sw++; }
  if (c.entry !== "protocol-license") { err(`(2/8) software fell to ${c.entry}: ${q}`); sw++; continue; }
  const cited = (c.sources || []).map((s) => s.id + " " + s.path).join(" ");
  if (!/LICENSE|NOTICE|licenc/i.test(cited)) { err(`(1) software not from a licence source: ${q}`); sw++; }
  const a = deaccent(c.answer);
  if (!a.includes("apache")) { err(`(1) software answer omits Apache: ${q}`); sw++; }
  if (!a.includes("financeira")) { err(`(8) software answer does not distinguish the financial domain: ${q}`); sw++; }
}
if (!sw) console.log(`  ok: (1/2/8) all ${byName.software_license.questions.length} software-licence questions cite a licence source and separate the financial domain`);

for (const q of byName.financial_authorization.questions) {
  const c = classify(q);
  if (classifyQueryIntent(q) !== "financial_authorization_query") { err(`(2) financial misclassified: ${q}`); fin++; }
  if (c.entry !== "financial-authorization") { err(`(2/8) financial fell to ${c.entry}: ${q}`); fin++; continue; }
  const a = deaccent(c.answer);
  if (!a.includes("nao licencia")) { err(`(3) financial answer does not state BANZA does not license: ${q}`); fin++; }
  if (!a.includes("apache")) { err(`(3) financial answer does not name Apache to contrast it: ${q}`); fin++; }
  const cited = (c.sources || []).map((s) => s.path).join(" ");
  if (/(^|\s|\/)LICENSE(\s|$)|NOTICE/.test(cited)) { err(`(10) financial cites a licence file as source: ${q}`); fin++; }
}
if (!fin) console.log(`  ok: (3/10) all ${byName.financial_authorization.questions.length} financial-authorisation questions state Apache != financial and cite governance/decision sources`);

// 4 — certification questions must never claim BANZA/BanzAI certifies (deterministic answers refuse).
let cert = 0;
for (const q of byName.operator_certification.questions) {
  const c = classify(q);
  if (c.kind === "no_source") { err(`(9) certification no_source: ${q}`); cert++; }
  if (c.kind === "det") {
    const a = deaccent(c.answer);
    if (!/\bnao\b/.test(a) && !a.includes("evidencia") && !a.includes("nao certifica")) {
      err(`(4) certification answer may claim certification (no refusal/evidence framing): ${q}`);
      cert++;
    }
  }
}
if (!cert) console.log(`  ok: (4) certification questions are boundary-safe — none claims BANZA/BanzAI certifies`);

// 5/6 — source ranking picks the right class per family (implementation != normative-as-rule; norm != impl).
let rank = 0;
for (const f of FAMILIES) {
  if (!f.primary) continue;
  for (const q of f.questions) {
    const top = rankedRepoChunks(q, 1)[0];
    if (!top) continue;
    if (!f.primary.includes(top.category)) { err(`(5/6) ${f.name} ranked ${top.category} not in [${f.primary}]: ${q}`); rank++; }
  }
}
if (!rank) console.log("  ok: (5/6) source ranking picks the right source class for every family (implementation vs normative kept apart)");

// 7/11 — no family answer presents /operador-zero as a live surface.
let stale = 0;
for (const f of FAMILIES) for (const q of f.questions) {
  const c = classify(q);
  if (c.kind === "det" && /\/operador-zero/i.test(c.answer || "") && !DISCONTINUED.test(c.answer)) { err(`(7/11) stale /operador-zero: ${q}`); stale++; }
}
if (!stale) console.log("  ok: (7/11) no family answer presents /operador-zero as a live surface");

// 9 — coverage: no family question is no_source.
let ns = 0;
for (const f of FAMILIES) for (const q of f.questions) {
  if (classify(q).kind === "no_source") { err(`(9) no_source: ${q}`); ns++; }
}
if (!ns) console.log("  ok: (9) no family-covered question falls into no_source");

// BRAND / SECRET hygiene on every served deterministic family answer.
let hy = 0;
// The protocol-origin answer names the creator as INSTITUTIONAL ATTRIBUTION (ADR-044 / M2.13C-B),
// an allowlisted governance/legal role — not a commercial operator brand; exempt it (like notice).
const ATTRIB_ENTRIES = new Set(["protocol-origin", "notice-content"]);
for (const f of FAMILIES) for (const q of f.questions) {
  const c = classify(q);
  if (c.kind !== "det") continue;
  if (SECRET.test(c.answer)) { err(`answer leaks a secret marker: ${q}`); hy++; }
  if (BRAND.test(c.answer) && !ATTRIB_ENTRIES.has(c.entry)) { err(`answer names a commercial/creator brand: ${q}`); hy++; }
}
if (!hy) console.log("  ok: no family answer leaks a secret marker or a commercial brand");

// 12 — a dangerous request carrying a licence word must still hit the action boundary, never a licence answer.
let danger = 0;
for (const q of ["licencia este operador", "certifica este operador", "aprova este operador"]) {
  const c = classify(q);
  if (c.intent !== "action_boundary") { err(`(12) dangerous licence request escaped the boundary: ${q} (${c.intent})`); danger++; }
}
if (!danger) console.log("  ok: (12) dangerous licence/authority requests still refuse at the action boundary");

// Self-test — the classifier is not a constant: a software-licence question and a financial one differ.
if (classifyQueryIntent("que licenca usa o banza?") === classifyQueryIntent("um operador precisa de licenca?")) {
  err("selftest: software licence and financial authorisation must classify differently");
}

process.exit(bad ? 1 : 0);
'
if [ $? -ne 0 ]; then fail "intent disambiguation / source-ranking contract violated (see above)"; else ok "intent disambiguation + source-ranking contract holds"; fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI INTENT SOURCE RANKING CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI INTENT SOURCE RANKING CHECK PASSED ✅"
