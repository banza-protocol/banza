#!/usr/bin/env bash
# check-banzai-canonical-corpus-integrity.sh — BanzAI canonical corpus integrity guard (M2.18B.3A).
#
# Every public canonical document (ADR + RFC, discovered from the filesystem) must be reachable through
# every layer the grounded synthesis path depends on, so nothing the public site can be asked about is
# silently unanswerable:
#   discoverable — has chunks in the build-time doc-index (retrieval can find it);
#   resolvable   — Rust candidate generation proposes its canonical id for an explicit reference;
#   citable      — the Rust FactualPackage built for that id lists it in allowed_source_ids (Round B
#                  exact-source path), so an answer about it can actually cite it.
#
# The guard drives the REAL committed Rust/WASM engines (no model, no network) over the whole corpus via
# services/banzai-api/eval/corpus-integrity.mjs, asserts 100% integrity + explicit ADR-053/054 coverage,
# regenerates the truth-table manifest as evidence, and self-tests that a non-existent id is NOT citable
# (so the check cannot silently pass on a broken engine). Complements banzai-answer-quality-eval-check.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

EVAL="services/banzai-api/eval/corpus-integrity.mjs"
KNOWLEDGE="services/banzai-api/src/knowledge.js"
WASM_DIR="services/banzai-api/src/rustkb"

[ -f "$EVAL" ] || { echo "FAIL: $EVAL not found"; exit 1; }
[ -f "$KNOWLEDGE" ] || { echo "FAIL: $KNOWLEDGE not found"; exit 1; }
[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }

echo "== banzai-canonical-corpus-integrity-check (M2.18B.3A) =="

node --input-type=module -e '
import { runAudit, discoverCanonicalDocs } from "./services/banzai-api/eval/corpus-integrity.mjs";
import { buildFactualPackagePlanned as bfp } from "./services/banzai-api/src/knowledge.js";

let bad = 0;
const err = (m) => { console.log("  FAIL: " + m); bad++; };

const { summary, rows, gaps } = runAudit();
console.log(`  corpus: ${summary.adr} ADR + ${summary.rfc} RFC = ${summary.total} docs; ${summary.index_chunks} index chunks`);

// 1. every discovered doc passes every layer.
if (summary.total < 10) err(`suspiciously few docs discovered (${summary.total}) — discovery is broken`);
if (gaps.length) {
  for (const g of gaps) err(`gap: ${g.id} discoverable=${g.discoverable} resolvable=${g.resolvable} citable=${g.citable} | ${g.file}`);
} else {
  console.log(`  ok: all ${summary.total} canonical docs are discoverable + resolvable + citable`);
}
if (summary.ok !== summary.total) err(`integrity ${summary.ok}/${summary.total}`);

// 2. explicit coverage of the newest public policy documents (regression anchor).
for (const id of ["ADR-053", "ADR-054"]) {
  const r = rows.find((x) => x.id === id);
  if (!r) err(`${id} not discovered on disk`);
  else if (!r.ok) err(`${id} not fully integrated (${JSON.stringify(r)})`);
}
if (!bad) console.log("  ok: ADR-053 + ADR-054 fully integrated");

// 3. self-test — the audit is a real test, not a constant: a non-existent id must NOT be citable, and
//    discovery must actually read the filesystem (non-empty, all ids well-formed).
{
  const fake = bfp("selftest", "explain_document", "ADR-99999", "explica ADR-99999", "brief");
  const citableFake = fake && Array.isArray(fake.allowed_source_ids) && fake.allowed_source_ids.includes("ADR-99999");
  if (citableFake) err("selftest: a non-existent id must not be citable");
  const docs = discoverCanonicalDocs();
  if (!docs.length || !docs.every((d) => /^(ADR-\d{3}|RFC-\d{4})$/.test(d.id))) err("selftest: discovery produced malformed ids");
}
if (!bad) console.log("  ok: self-test holds (fake id not citable; discovery well-formed)");

process.exit(bad ? 1 : 0);
'
if [ $? -ne 0 ]; then fail "canonical corpus integrity violated (see above)"; else ok "canonical corpus integrity holds"; fi

# Regenerate the committed truth-table manifest as evidence (does not fail on write).
node "$EVAL" >/dev/null 2>&1 && ok "truth-table manifest regenerated (artifacts/m2-18b3/corpus-truth-table.json)" || true

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI CANONICAL CORPUS INTEGRITY CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI CANONICAL CORPUS INTEGRITY CHECK PASSED ✅"
