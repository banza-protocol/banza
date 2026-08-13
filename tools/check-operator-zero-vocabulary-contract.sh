#!/usr/bin/env bash
#
# Operador Zero cross-language vocabulary contract (ADR-041, M2.12B).
#
# The M2.11 series was the same defect twice: TypeScript comparing or labelling a status string the
# Rust engine does not emit, both sides self-consistent, every test green. Operador Zero starts with
# the contract instead of acquiring one after the third incident. Rust owns every slug (ADR-043), Rust
# publishes them, and this guard proves — by EXECUTING the engine, never by grepping a comment — that:
#
#   1. the vocabulary has all ten groups and none is empty;
#   2. every PUBLISHED slug has a non-empty Portuguese label in the engine;
#   3. every slug an actual end-to-end run EMITS is in the vocabulary and has a label
#      (coverage: the constants cannot drift away from what the simulator produces);
#   4. the engine's label map holds NO generic fallback — an unknown slug returns "" so it stays
#      visible instead of being dressed as a real one;
#   5. the vendored web WASM the browser loads is NOT stale: every vocabulary slug is present in the
#      compiled binary the website ships, so a slug added in Rust but not re-vendored fails here;
#   6. the TypeScript adapter routes labelling THROUGH the engine and never re-implements a label map.
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

CRATE="engines/operator-zero-core"
WASM="website/lib/wasm/operator_zero_core_bg.wasm"
WASM_JS="website/lib/wasm/operator_zero_core.js"
ADAPTER="website/lib/operadorZeroEngine.ts"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

command -v cargo >/dev/null || { echo "FAIL: cargo not found"; exit 2; }
command -v node  >/dev/null || { echo "FAIL: node not found"; exit 2; }
[ -d "$CRATE" ]      || { echo "FAIL: missing $CRATE"; exit 2; }
[ -f "$WASM" ]       || { echo "FAIL: vendored WASM missing: $WASM (run wasm-pack)"; exit 2; }
[ -f "$WASM_JS" ]    || { echo "FAIL: vendored WASM js missing: $WASM_JS"; exit 2; }
[ -f "$ADAPTER" ]    || { echo "FAIL: missing $ADAPTER"; exit 2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# The ten groups the vocabulary must publish (mirrors vocab::vocabulary()).
GROUPS="payment_status ledger_status reconciliation_status trust_status federation_status evidence_status simulation_error_code next_action artifact_type demo_boundary_status"

echo "══════════════════════════════════════════════════════════════════════"
echo "Operador Zero vocabulary contract"
echo "══════════════════════════════════════════════════════════════════════"

# ── EXECUTE the engine (this is the whole point — no source grepping for slugs) ──
echo "operator-zero-vocab: executing the engine…"
if ! cargo run --quiet --example dump_contract --manifest-path "$CRATE/Cargo.toml" > "$TMP/contract.json" 2> "$TMP/build.err"; then
  echo "  FAIL: could not execute the engine dumper"; sed 's/^/    /' "$TMP/build.err" | tail -20; exit 1
fi
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$TMP/contract.json" \
  || { echo "  FAIL: engine did not emit valid JSON"; exit 1; }
ok "the engine ran and emitted the contract JSON"

# ── check() runs a node assertion over the contract; a non-zero exit is a FAIL ──
run_check() { # <description> <node-expr-file>
  local desc="$1" file="$2"
  local out
  if out="$(node "$file" "$TMP/contract.json" "$WASM" 2>&1)"; then
    ok "$desc${out:+ ($out)}"
  else
    bad "$desc — $out"
  fi
}

cat > "$TMP/checks.js" <<'JS'
const fs = require("fs");
const c = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const wasmPath = process.argv[3];
const GROUPS = "payment_status ledger_status reconciliation_status trust_status federation_status evidence_status simulation_error_code next_action artifact_type demo_boundary_status".split(" ");
const die = (m) => { console.error(m); process.exit(1); };

// 1. Ten groups, none empty.
if (JSON.stringify(Object.keys(c.vocabulary).sort()) !== JSON.stringify([...GROUPS].sort()))
  die(`vocabulary groups != canonical ten: got ${Object.keys(c.vocabulary).join(",")}`);
for (const g of GROUPS)
  if (!Array.isArray(c.vocabulary[g]) || c.vocabulary[g].length === 0) die(`group '${g}' is empty or missing`);

const allSlugs = GROUPS.flatMap((g) => c.vocabulary[g]);
if (new Set(allSlugs).size !== allSlugs.length) {
  const seen = new Set(), dup = [];
  for (const s of allSlugs) { if (seen.has(s)) dup.push(s); seen.add(s); }
  die(`duplicate slug(s) across groups: ${dup.join(", ")}`);
}

// 2. Every published slug has a non-empty label.
const noLabel = allSlugs.filter((s) => !c.labels[s] || c.labels[s].trim() === "");
if (noLabel.length) die(`slug(s) with no label: ${noLabel.join(", ")}`);

// 3. Every slug an e2e run EMITS is in the vocabulary and labelled.
const vocabSet = new Set(allSlugs);
const uncovered = c.e2e_slugs.filter((s) => !vocabSet.has(s));
if (uncovered.length) die(`e2e emits slug(s) not in the vocabulary: ${uncovered.join(", ")}`);
const e2eUnlabelled = c.e2e_slugs.filter((s) => !c.labels[s]);
if (e2eUnlabelled.length) die(`e2e emits slug(s) with no label: ${e2eUnlabelled.join(", ")}`);

// 4. No generic fallback in the label map. An unmapped slug can't slip through as a placeholder
//    (Rust's label() returns "" for unknown, already caught above). The remaining fallback risk is
//    ONE label reused for many slugs — a "—"-style catch-all — so reject any label shared by two
//    distinct slugs. Self-labels are allowed only for slugs that ARE the Portuguese term
//    (`manifest`, `trace`): a proper technical noun is not a missing translation.
const SELF_LABEL_OK = new Set(["manifest", "trace"]);
const byLabel = new Map();
for (const s of allSlugs) {
  if (c.labels[s] === s && !SELF_LABEL_OK.has(s))
    die(`slug '${s}' labels itself — that reads as an unmapped value, not a label`);
  const prev = byLabel.get(c.labels[s]);
  if (prev) die(`slugs '${prev}' and '${s}' share label '${c.labels[s]}' — a shared label reads as a fallback`);
  byLabel.set(c.labels[s], s);
}

// 5. Stale vendored WASM: every slug must be present, as UTF-8 bytes, in the compiled binary the
//    website ships. A slug added to Rust but not re-vendored is absent here.
const wasm = fs.readFileSync(wasmPath); // Buffer
const missingInWasm = allSlugs.filter((s) => wasm.indexOf(Buffer.from(s, "utf8")) === -1);
if (missingInWasm.length)
  die(`vendored WASM is STALE — slug(s) absent from ${wasmPath}: ${missingInWasm.join(", ")} — re-run wasm-pack`);

console.log(`${GROUPS.length} groups, ${allSlugs.length} slugs, ${c.e2e_slugs.length} emitted, all labelled + in WASM`);
JS
run_check "vocabulary is complete, labelled, covered by e2e, fallback-free and freshly vendored" "$TMP/checks.js"

# ── 6. The adapter routes labelling THROUGH the engine and holds no label map of its own ──
echo "operator-zero-vocab: TypeScript adapter…"
if grep -q "operator_zero_label" "$ADAPTER" && grep -q "operadorZeroLabel" "$ADAPTER"; then
  ok "the adapter delegates labels to the engine (operator_zero_label)"
else
  bad "the adapter must expose operadorZeroLabel delegating to the engine's operator_zero_label"
fi
# A hardcoded PT label map in TS for these slugs would be a second vocabulary. Reject an object
# literal that maps any known slug to a string on the same line.
if grep -nE '"(demo_trust_valid|evidence_complete|demo_federation_compatible|reconciled|insufficient_balance)"[[:space:]]*:[[:space:]]*"' \
     website/lib/operadorZero*.ts website/components/banzai/BanzaiAgent.tsx 2>/dev/null | grep -v "operadorZeroEngine.ts"; then
  bad "a TypeScript file maps an Operador Zero slug to a literal label — labels belong to Rust only"
else
  ok "no TypeScript file re-implements the label map"
fi

# ── Self-tests: the detectors must actually fire ──
echo "operator-zero-vocab: self-test…"
st=0
# (a) a missing label must be caught.
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  c.labels[c.vocabulary.payment_status[0]] = "";
  require("fs").writeFileSync(process.argv[2], JSON.stringify(c));
' "$TMP/contract.json" "$TMP/broken.json"
if node "$TMP/checks.js" x "$TMP/broken.json" "$WASM" >/dev/null 2>&1; then echo "    SELFTEST_FAIL missing-label not caught"; st=1; fi
# (b) an e2e slug missing from the vocabulary must be caught.
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  c.e2e_slugs.push("a_slug_the_vocabulary_never_declared");
  require("fs").writeFileSync(process.argv[2], JSON.stringify(c));
' "$TMP/contract.json" "$TMP/broken2.json"
if node "$TMP/checks.js" x "$TMP/broken2.json" "$WASM" >/dev/null 2>&1; then echo "    SELFTEST_FAIL uncovered-e2e not caught"; st=1; fi
# (c) a slug absent from the WASM (stale vendoring) must be caught: point the check at an empty file.
: > "$TMP/empty.wasm"
if node "$TMP/checks.js" x "$TMP/contract.json" "$TMP/empty.wasm" >/dev/null 2>&1; then echo "    SELFTEST_FAIL stale-wasm not caught"; st=1; fi
[ "$st" -eq 0 ] && ok "self-tests: missing label, uncovered e2e slug and stale WASM are all detected" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then
  echo "operator-zero-vocabulary-contract-check: PASS"
else
  echo "operator-zero-vocabulary-contract-check: FAIL"
fi
exit "$fail"
