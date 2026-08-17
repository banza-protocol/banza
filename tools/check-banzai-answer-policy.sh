#!/usr/bin/env bash
# The answer policy is DECLARED on the canonical entry, derived into the index, and never inferred.
#
# It used to be inferred: the router read `id.starts_with("def-")`, so a naming convention decided whether
# a settled fact was served model-free or handed to the model. That is a rule nobody can see, and it cannot
# express either case that matters — a definition that should NOT be settled, or a settled fact whose id is
# not a definition.
#
# Three properties, and the third is the one that keeps the migration honest:
#
#   DERIVED    every indexed entry's `deterministic` equals the canonical entry's declaration
#   EVIDENCE   a declared-deterministic entry has an answer AND at least one registered source
#   DECLARED   the router's policy read consults the declaration, not the id prefix
#
# EVIDENCE exists because "deterministic" without evidence is just a hardcoded sentence: the engine would
# state a protocol fact confidently with nothing behind it, which is worse than sending it to a model.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "== banzai-answer-policy =="
fail=0
note() { echo "  FAIL: $*"; fail=1; }

KB="services/banzai-api/src/knowledge.js"
IDX="engines/banzai-query-core/src/entries-index.json"
ROUTE="engines/banzai-query-core/src/route.rs"

# ── DERIVED + EVIDENCE ────────────────────────────────────────────────────────────────────────────
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { ENTRIES, SOURCES } from "./services/banzai-api/src/knowledge.js";
const idx = JSON.parse(readFileSync("engines/banzai-query-core/src/entries-index.json", "utf8"));
const byId = new Map(ENTRIES.map((e) => [e.id, e]));
const declared = ENTRIES.filter((e) => e.deterministic === true);
let bad = 0;

// DERIVED — the index must carry exactly what the canonical entry declares.
for (const row of idx) {
  const e = byId.get(row.id);
  if (!e) { console.log(`  FAIL: indexed entry ${row.id} is not in ENTRIES`); bad++; continue; }
  const want = e.deterministic === true;
  if ((row.deterministic === true) !== want) {
    console.log(`  FAIL: ${row.id} indexed deterministic=${row.deterministic}, canonical declares ${want}`);
    bad++;
  }
}

// EVIDENCE — a settled fact must have something behind it.
const known = new Set(Object.values(SOURCES).map((s) => s.id));
for (const e of declared) {
  if (!e.answer || !String(e.answer).trim()) {
    console.log(`  FAIL: ${e.id} is declared deterministic with no answer`); bad++;
  }
  const srcs = e.sources || [];
  if (!srcs.length) {
    console.log(`  FAIL: ${e.id} is declared deterministic with no establishing source`); bad++;
  }
  for (const s of srcs) {
    const id = s && (s.id || s.key);
    if (!id || !known.has(id)) {
      console.log(`  FAIL: ${e.id} cites an unregistered source: ${JSON.stringify(id)}`); bad++;
    }
  }
}
if (bad) { console.log(`  ${bad} policy problem(s)`); process.exit(1); }
console.log(`  ok: ${declared.length} declared-deterministic entries, each with an answer and registered sources`);
console.log(`  ok: all ${idx.length} indexed entries carry the policy their canonical entry declares`);
' || fail=1

# ── DECLARED — the prefix must no longer decide execution ──────────────────────────────────────────
# The migrated read. Grep for the DECISION, not for the string "def-": the prefix legitimately remains in
# the file for precedence (a generic definition yielding to a numbered document reference) and for intent
# labelling, and forbidding it outright would flag those.
if grep -qE 'if top\.starts_with\("def-"\) && keyword_is_the_question' "$ROUTE"; then
  note "the lexical policy site still infers the answer policy from the id prefix"
fi
if ! grep -qE 'entry_is_deterministic\(top\) && keyword_is_the_question' "$ROUTE"; then
  note "the lexical policy site does not consult the declared policy"
fi
if ! grep -q 'deterministic: e.deterministic === true' tools/gen-banzai-entries-index.mjs; then
  note "the generator does not project the declared policy into the index"
fi
[ "$fail" -eq 0 ] && echo "  ok: the policy read consults the declaration; the id prefix decides no execution"

# ── SELF-TEST — each property must be able to fail ────────────────────────────────────────────────
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cp "$ROUTE" "$tmp/route.rs"
# The `crate::` qualifier matters: replacing only the function name left `crate::top.starts_with(...)`,
# which the pattern below does not match — so the self-test reported that its own mutation had not landed,
# which is precisely what a self-test is for.
sed 's/crate::entry_is_deterministic(top)/top.starts_with("def-")/' "$ROUTE" > "$tmp/mutated.rs"
if cmp -s "$ROUTE" "$tmp/mutated.rs"; then
  note "self-test could not build the prefix-authority mutation — the check may be watching nothing"
elif ! grep -qE 'if top\.starts_with\("def-"\) && keyword_is_the_question' "$tmp/mutated.rs"; then
  note "self-test mutation did not land on the policy site"
else
  echo "  ok: self-test — the prefix-authority mutation is detectable at the site this check reads"
fi

if [ "$fail" -ne 0 ]; then echo "banzai-answer-policy: FAILED"; exit 1; fi
echo "banzai-answer-policy: OK"
