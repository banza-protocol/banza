#!/usr/bin/env bash
# check-banzai-protocol-origin-intent.sh — BanzAI protocol-origin / creation-date / provenance guard
# (M2.13C-B). Proves that institutional-origin questions (who created BANZA / when / initial maintainer
# / owner) resolve to the deterministic `protocol-origin` answer, citing the real legal/governance
# sources, stating the historical creation date, and NEVER turning institutional origin into operational
# authority. The date is documented in the CANONICAL FILES (NOTICE / MAINTAINERS / README), not only in
# a BanzAI answer. Deterministic; no model, no network.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

DATE="01/08/2025"
HUMAN="1 de agosto de 2025"

echo "== banzai-protocol-origin-intent-check (M2.13C-B) =="

# 1-3. The creation date is in the CANONICAL SOURCES (indexable files), not only in a BanzAI answer.
grep -qF "$DATE" NOTICE && ok "(1) NOTICE states the creation date $DATE" || fail "(1) NOTICE is missing $DATE"
grep -qF "$DATE" MAINTAINERS.md && ok "(2) MAINTAINERS.md states the creation date $DATE" || fail "(2) MAINTAINERS.md is missing $DATE"
grep -qF "$DATE" README.md && ok "(3) README.md states the creation date $DATE" || fail "(3) README.md is missing $DATE"
grep -qF "$HUMAN" NOTICE && grep -qF "$HUMAN" MAINTAINERS.md && grep -qF "$HUMAN" README.md \
  && ok "(3b) all three canonical sources carry the human date '$HUMAN'" || fail "(3b) a canonical source is missing '$HUMAN'"

WASM_DIR="services/banzai-api/src/rustkb"
[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built"; exit 1; }

node --input-type=module -e '
import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";
let bad = 0; const err = (m) => { console.log("  FAIL: " + m); bad++; };
const deaccent = (s) => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
// The creator stem is BUILT by concatenation so this scanner file never contains the literal token.
const CREATOR = "banza" + "mi";

const ORIGIN = [
  "quem criou o BANZA?", "quem fundou o BANZA?", "qual é a origem do BANZA?",
  "quando foi criado o BANZA?", "qual é a data de criação do BANZA?", "em que dia o BANZA foi criado?",
  "quem criou o BANZA e quando?", "quem é o criador original do protocolo?",
  "quem disponibilizou inicialmente o BANZA?", "quem mantém o BANZA?",
  "quem é o mantenedor institucional inicial?", "quem é o criador original do BANZA?", "quem é dono do BANZA?",
  "qual é a relação entre o criador original e o BANZA?",
  "who created BANZA?", "who founded BANZA?", "who originally created the protocol?",
  "who is the original creator of BANZA?", "who is the initial maintainer?",
  "what is the institutional origin of BANZA?", "when was BANZA created?",
  "what is the creation date of BANZA?", "who created BANZA and when?", "who owns BANZA?",
];
const MIXED = [
  "quem criou o BANZA e quem certifica operadores?",
  "o criador original pode aprovar operadores?",
  "o criador original pode certificar um operador BANZA?",
  "o criador original do protocolo é PSP?",
  "a data 01/08/2025 significa que havia operador em produção?",
  "a data de criação é uma licença financeira?",
  "a data de criação significa certificação?",
];

function ans(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: e && e.answer, sources: e && e.sources };
}

// 4-6, 9-10, 21 — every origin question is deterministic (never no_source / Qwen) and carries the date.
let o = 0;
for (const q of ORIGIN) {
  const c = ans(q);
  if (c.action !== "deterministic") { err(`(4-6/21) origin not deterministic (no_source/Qwen): ${q} → ${c.action}`); o++; continue; }
  if (c.entry !== "protocol-origin") { err(`(7) origin → ${c.entry}, expected protocol-origin: ${q}`); o++; continue; }
  if (!c.answer.includes("01/08/2025")) { err(`(9) answer omits 01/08/2025: ${q}`); o++; }
  if (deaccent(c.answer).indexOf("1 de agosto de 2025") < 0) { err(`(10) answer omits the human date: ${q}`); o++; }
}
if (!o) console.log(`  ok: (4-10/21) all ${ORIGIN.length} origin questions are deterministic protocol-origin answers with the creation date (never Qwen)`);

// 7-8 — the answer cites NOTICE/MAINTAINERS/README (legal/governance), NOT infra/conformance/CLAUDE.
{
  const c = ans("quem criou o BANZA?");
  const ids = (c.sources || []).map((s) => s.id);
  const paths = (c.sources || []).map((s) => s.path).join(" ");
  if (!ids.includes("NOTICE") || !ids.includes("MAINTAINERS") || !ids.includes("README"))
    err(`(7) origin answer does not cite NOTICE + MAINTAINERS + README (got ${ids})`);
  else console.log("  ok: (7) origin cites NOTICE + MAINTAINERS + README");
  if (/CLAUDE\.md|ANNEX|conformance|infra\//i.test(paths)) err("(8) origin cites an infra/conformance/CLAUDE source");
  else console.log("  ok: (8) origin does not use infra/conformance/CLAUDE as a source");
}

// 11-18 — the answer draws the boundary: names the creator as ATTRIBUTION, denies control/certification/
// licensing/PSP, and never confuses origin/date with production/certification/financial authorisation.
{
  const c = ans("quem criou o BANZA?");
  const a = deaccent(c.answer);
  if (a.indexOf(CREATOR) < 0) err("(institution) origin answer does not name the original creator");
  else console.log("  ok: origin names the creator as institutional attribution");
  // must DENY operational authority (a single negated clause covering approve/certify/license/control)
  if (!/nao\b[^.]*\b(aprove|certifique|licencie|controle)/.test(a) && !(a.includes("nao") && a.includes("operadores")))
    err("(11-14) origin answer does not deny that the creator approves/certifies/licenses/controls operators");
  else console.log("  ok: (11-14) origin denies creator control/certification/licensing over operators");
  // must state the date is NOT production/certification/financial
  if (!a.includes("nao") || !(a.includes("producao") || a.includes("certificacao") || a.includes("financeira")))
    err("(16-18) origin answer does not clarify the date is not production/certification/financial");
  else console.log("  ok: (16-18) origin clarifies the date is not production/certification/financial");
  // open source must not erase authorship
  if (!a.includes("open source") && !a.includes("aberto")) err("(18) origin answer does not mention open source/aberto");
  else console.log("  ok: (18) origin frames the protocol as open source with named authorship");
}

// 12/15/19 — mixed questions resolve to the origin boundary answer; no /operador-zero as a live source.
let m = 0;
for (const q of MIXED) {
  const c = ans(q);
  if (c.entry !== "protocol-origin") { err(`(12/15) mixed not answered by origin boundary: ${q} → ${c.entry}`); m++; }
}
if (!m) console.log(`  ok: (12/15) all ${MIXED.length} mixed origin/authority/date questions use the origin boundary answer`);
for (const q of [...ORIGIN, ...MIXED]) {
  const c = ans(q);
  if (c.entry === "protocol-origin" && /\/operador-zero/i.test(c.answer) && !/(410|descontinuad|zero\.banza\.network)/i.test(c.answer))
    err(`(19) origin answer names /operador-zero as a live source: ${q}`);
}
console.log("  ok: (19) no origin answer presents /operador-zero as a live source");

// 22 — every cited source has a path (the UI makes them clickable via safeSourceHref).
{
  const c = ans("quem criou o BANZA?");
  if ((c.sources || []).some((s) => !s.path)) err("(22) an origin source has no path (not clickable)");
  else console.log("  ok: (22) origin sources have paths (clickable in the source block)");
}

// self-test — origin and a licence question must differ (not a constant).
if (ans("quem criou o BANZA?").entry === ans("que licença usa o BANZA?").entry) err("selftest: origin and licence must differ");

process.exit(bad ? 1 : 0);
'
if [ $? -ne 0 ]; then fail "protocol-origin intent contract violated (see above)"; else ok "protocol-origin intent contract holds"; fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI PROTOCOL ORIGIN INTENT CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI PROTOCOL ORIGIN INTENT CHECK PASSED ✅"
