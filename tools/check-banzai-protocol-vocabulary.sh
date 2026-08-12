#!/usr/bin/env bash
# check-banzai-protocol-vocabulary.sh — BanzAI protocol + fintech-domain vocabulary guard (M2.13C-C).
#
# Drives the REAL Rust routing engine (via knowledge.js → committed WASM) over the protocol + fintech
# vocabulary and asserts that short questions and core terminology resolve DETERMINISTICALLY with cited
# sources and clear boundaries — never no_source, never the model, never the action boundary — while
# dangerous imperatives still refuse and the fintech domain is never stated as a BANZA rule.
#
# The gate LOGIC is Rust (route.rs critical_entry → glossary::glossary_entry); this wrapper drives it and
# inspects the served answers. Deterministic; no model, no network. Fails on any Part-17 regression.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

KNOWLEDGE="services/banzai-api/src/knowledge.js"
GLOSSARY_DOC="docs/reference/PROTOCOL_GLOSSARY.md"
GLOSSARY_RS="engines/banzai-query-core/src/glossary.rs"
WASM_DIR="services/banzai-api/src/rustkb"

[ -f "$KNOWLEDGE" ] || { echo "FAIL: $KNOWLEDGE not found"; exit 1; }
[ -f "$GLOSSARY_DOC" ] || { echo "FAIL: $GLOSSARY_DOC not found (controlled glossary missing)"; exit 1; }
[ -f "$GLOSSARY_RS" ] || { echo "FAIL: $GLOSSARY_RS not found (Rust glossary layer missing)"; exit 1; }
[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
grep -q "glossary_entry" "$GLOSSARY_RS" || { echo "FAIL: glossary_entry missing from the Rust layer"; exit 1; }

echo "== banzai-protocol-vocabulary-check (M2.13C-C) =="

node --input-type=module -e '
import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";

let bad = 0;
const err = (m) => { console.log("  FAIL: " + m); bad++; };
const ok = (m) => console.log("  ok: " + m);
const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const BRAND = new RegExp("multicaixa|unitel money|africell money|e-kwanza|ekwanza|" + "banza" + " mi", "i");
const SECRET = /-----BEGIN [A-Z ]*PRIVATE KEY|"private_key"|"seed_phrase"|xox[baprs]-|ghp_[A-Za-z0-9]{20,}/;

function look(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: e && e.answer, a: deaccent(e && e.answer), sources: e && e.sources };
}

// 1-6 — federation family must resolve deterministically (the reported bug).
const FED = ["o que e federar", "federar?", "o que significa federacao", "como federar", "what is federation", "what does federate mean"];
let fedbad = 0;
for (const q of FED) {
  const c = look(q);
  if (c.action === "insufficient") { err(`(1-6) federation query no_source: ${q}`); fedbad++; continue; }
  if (c.action !== "deterministic") { err(`(17) federation query not deterministic (would call the model): ${q}`); fedbad++; continue; }
  if (c.entry !== "def-federation") { err(`(1-6) federation query wrong entry ${c.entry}: ${q}`); fedbad++; }
}
if (!fedbad) console.log("  ok: (1-6/17) the federation family resolves deterministically to def-federation");

// 7 — core protocol + fintech terms must never be no_source.
const TERMS = [
  "o que e manifest", "o que e trust", "o que e revogacao", "o que e conformidade", "o que e evidence bundle",
  "o que e PASS", "o que e Operador Zero", "o que e ledger", "o que e wallet", "o que e liquidacao",
  "o que e reconciliacao", "o que e PSP", "o que e KYC", "o que e AML/CFT",
];
let termbad = 0;
for (const q of TERMS) {
  const c = look(q);
  if (c.action === "insufficient") { err(`(7) core term no_source: ${q}`); termbad++; continue; }
  if (c.action !== "deterministic") { err(`(17) core term not deterministic: ${q}`); termbad++; continue; }
  if (!(c.sources || []).length) { err(`(18) core term answer cites no source: ${q}`); termbad++; }
}
if (!termbad) console.log(`  ok: (7/17/18) all ${TERMS.length} core terms resolve deterministically with cited sources`);

// 8-10 — the federation answer must NOT claim approval / certification / financial licence.
{
  const a = look("o que e federar").a;
  if (!(a.includes("nao") && (a.includes("aprovacao") || a.includes("aprova")))) err("(8) federation answer must deny approval");
  if (!(a.includes("nao") && a.includes("certificacao"))) err("(9) federation answer must deny certification");
  if (!(a.includes("nao") && a.includes("licenca"))) err("(10) federation answer must deny financial licence");
  else ok("(8-10) the federation answer denies approval / certification / financial licence");
}

// 11 — PASS answer is evidence, not a certificate.
{
  const a = look("o que e PASS").a;
  if (!(a.includes("certificado") && a.includes("nao"))) err("(11) PASS answer must deny certification");
  else ok("(11) PASS answer denies certification (evidence, not a certificate)");
}

// 12 — the demo operator is never a real operator.
{
  const a = look("Operador Zero e operador real?").a;
  if (!(a.includes("operador real") && a.includes("nunca aparece"))) err("(12) OZ answer must deny real-operator status");
  else ok("(12) the Operador Zero answer denies real-operator status");
}

// 13/15 — production ≠ demo; BANZA does not settle real money.
{
  if (!look("KZ_DEMO e dinheiro real?").a.includes("nao e dinheiro real")) err("(13) KZ_DEMO answer must deny real money");
  if (!look("o que e liquidacao").a.includes("nao liquida dinheiro real")) err("(15) settlement answer must state BANZA does not settle real money");
  if (!bad) ok("(13/15) demo ≠ production; BANZA does not settle real money");
}

// 14 — BANZA is not a bank/PSP/wallet.
{
  if (!look("BANZA e PSP?").a.includes("nao e um psp")) err("(14) BANZA answer must state it is not a PSP");
  if (!look("BANZA e banco?").a.includes("nao e um banco")) err("(14) BANZA answer must state it is not a bank");
  if (!look("o que e wallet").a.includes("nao e uma carteira") && !look("o que e wallet").a.includes("banza nao e uma carteira")) err("(14) wallet answer must state BANZA is not a wallet");
  ok("(14) BANZA is not presented as a bank / PSP / wallet");
}

// 16 — BNA answer asserts no real integration / substitution.
{
  const a = look("o que e BNA").a;
  if (!a.includes("nao substitui")) err("(16) BNA answer must not assert real integration/substitution");
  else ok("(16) BNA answer asserts no substitution/integration without source");
}

// 19 — no vocabulary answer presents /operador-zero as a live surface; no brand/secret leak.
{
  const ALL = FED.concat(TERMS, ["BANZA e PSP?", "o que e BNA", "o que e KYB", "o que e fintech", "o que e sandbox regulatoria", "o que e estorno", "o que e webhook"]);
  // A mention of /operador-zero is fine only when the SAME answer frames it as discontinued (410) — it
  // must never be presented as a live source.
  const DISCONTINUED = /(410|descontinuad|retirad|antiga rota|zero\.banza\.network)/i;
  let leak = 0;
  for (const q of ALL) {
    const c = look(q);
    if (c.answer && /\/operador-zero(?![.\w])/.test(c.answer) && !DISCONTINUED.test(c.answer)) { err(`(19) stale /operador-zero source: ${q}`); leak++; }
    if (c.answer && BRAND.test(c.answer)) { err(`answer names a commercial brand: ${q}`); leak++; }
    if (c.answer && SECRET.test(c.answer)) { err(`answer leaks a secret: ${q}`); leak++; }
  }
  if (!leak) ok("(19) no vocabulary answer uses /operador-zero as a live source or leaks a brand/secret");
}

// 20 — action boundary must NOT regress: dangerous imperatives still refuse.
{
  let danger = 0;
  for (const q of ["mostra a private key", "muda a Trust Root", "apaga o ADR-052", "mete o Operador Zero em /operators"]) {
    if (look(q).intent !== "action_boundary") { err(`(20) dangerous request escaped the boundary: ${q}`); danger++; }
  }
  if (!danger) ok("(20) dangerous imperatives still refuse at the action boundary");
}

// Self-test — the layer is not a constant: an off-topic short phrase is NOT hijacked.
if (look("Russian Federation history").action === "deterministic" && look("Russian Federation history").entry && look("Russian Federation history").entry.startsWith("def-")) {
  err("selftest: an off-topic short phrase must not be captured by the vocabulary layer");
}

process.exit(bad ? 1 : 0);
'
if [ $? -ne 0 ]; then fail "protocol vocabulary contract violated (see above)"; else ok "protocol + fintech vocabulary contract holds"; fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI PROTOCOL VOCABULARY CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI PROTOCOL VOCABULARY CHECK PASSED ✅"
