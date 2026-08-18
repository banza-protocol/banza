#!/usr/bin/env bash
# The lexical keyword index is derived from the canonical entries, and nothing else decides membership.
#
# `engines/banzai-query-core/src/entries-index.json` is the candidate set for `retrieve_topk_ids` — the
# keyword-scoring path. It used to be a hand-maintained list of 27 with no rule stated anywhere, while
# the Rust core claimed it was "generated from ENTRIES". Both halves were a problem: the list could drift
# from the source silently, and the comment invited the opposite mistake — concluding that a file with 27
# rows next to 163 entries must simply be stale and should be expanded.
#
# Membership is now declared at the source, one entry at a time, with `lexicalCandidate: true`.
#
# Three properties:
#
#   DERIVED   The committed index matches a fresh generation, byte for byte. A hand edit is stale.
#   CURATED   Membership is NOT `critical`. Most critical entries are deliberately outside this index and
#             are resolved by other paths; a check that accepted `critical` as the rule would invite a
#             generator to add 136 entries and silently change routing across the knowledge base.
#   ORDERED   The index follows `ENTRIES` order, because `retrieve_topk_ids` breaks score ties by index
#             position. Reordering is a behavioural change, not a formatting one.
#
# Observational (PR C): it regenerates to a temporary path and compares. It never repairs the index.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== banzai-entries-index =="

INDEX="engines/banzai-query-core/src/entries-index.json"
GEN="tools/gen-banzai-entries-index.mjs"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

node "$GEN" --stdout > "$tmp/fresh.json" 2>"$tmp/err" || {
  echo "  FAIL: $GEN failed"
  sed 's/^/        /' "$tmp/err"
  echo "banzai-entries-index: FAILED"
  exit 1
}
# Determinism: the same source must produce the same bytes.
node "$GEN" --stdout > "$tmp/again.json" 2>/dev/null
if ! cmp -s "$tmp/fresh.json" "$tmp/again.json"; then
  echo "  FAIL: $GEN is not deterministic — two generations differ"
  echo "banzai-entries-index: FAILED"
  exit 1
fi

if ! cmp -s "$tmp/fresh.json" "$INDEX"; then
  echo "  FAIL: $INDEX is stale — it does not match a fresh generation."
  echo "        Membership is declared in services/banzai-api/src/knowledge.js with"
  echo "        \`lexicalCandidate: true\`. Run \`make banzai-entries-index\` — do not hand-edit a"
  echo "        derived file."
  diff <(python3 -c "import json,sys;print('\n'.join(e['id'] for e in json.load(open('$INDEX'))))") \
       <(python3 -c "import json,sys;print('\n'.join(e['id'] for e in json.load(open('$tmp/fresh.json'))))") \
    | sed 's/^/        /' | head -12
  echo "banzai-entries-index: FAILED"
  exit 1
fi

python3 - "$INDEX" <<'PY'
import json, subprocess, sys

index = json.load(open(sys.argv[1], encoding='utf-8'))
ids = [e['id'] for e in index]

problems = []

# CURATED — membership must not have collapsed into `critical`, in either direction.
js = subprocess.run(
    ['node', '-e', """
const k = await import('/Users/fm65/banza/services/banzai-api/src/knowledge.js');
const rows = k.ENTRIES.map(e => [e.id, e.critical === true, e.lexicalCandidate === true]);
console.log(JSON.stringify(rows));
""".replace('/Users/fm65/banza/', './')],
    capture_output=True, text=True)
if js.returncode != 0:
    # Re-run without the path rewrite: the module is resolved relative to the repository root either way.
    js = subprocess.run(['node', '--input-type=module', '-e',
        "const k = await import('./services/banzai-api/src/knowledge.js');"
        "console.log(JSON.stringify(k.ENTRIES.map(e=>[e.id, e.critical===true, e.lexicalCandidate===true])));"],
        capture_output=True, text=True)
if js.returncode != 0:
    print('  FAIL: could not read ENTRIES: %s' % js.stderr.strip()[:200])
    sys.exit(1)

rows = json.loads(js.stdout)
order = [r[0] for r in rows]
eligible = [r[0] for r in rows if r[2]]
critical = {r[0] for r in rows if r[1]}

if ids != eligible:
    problems.append('the index does not match the entries marked lexicalCandidate')

# ORDERED — ties are broken by index position, so order must follow ENTRIES.
if ids != [i for i in order if i in set(ids)]:
    problems.append('the index is not in ENTRIES order; retrieve_topk_ids breaks score ties by index '
                    'position, so a different order is a behavioural change')

# CURATED — the rule is not `critical`. If it ever becomes identical to the critical set, either the
# generator started deriving from the wrong property or someone added 136 entries at once.
crit_outside = [i for i in critical if i not in set(ids)]
if not crit_outside:
    problems.append('every critical entry is in the index. Membership is a curated routing-eligibility '
                    'decision, not `critical` — deriving it from `critical` would change which entry '
                    'wins the keyword path for the whole knowledge base')

# Every indexed entry must be able to score at all.
for e in index:
    if not e.get('keywords'):
        problems.append('%s has no keywords, so it can never score' % e['id'])

if problems:
    print()
    for p in problems:
        print('  FAIL: %s' % p)
    sys.exit(1)

print('  ok: %d lexically eligible entries, derived and in ENTRIES order' % len(ids))
print('  ok: membership is curated, not `critical` — %d critical entries are deliberately outside this'
      ' index and resolved by other paths' % len(crit_outside))
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "banzai-entries-index: OK"; else echo "banzai-entries-index: FAILED"; fi
exit "$rc"
