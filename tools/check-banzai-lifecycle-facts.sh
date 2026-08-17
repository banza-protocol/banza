#!/usr/bin/env bash
# BanzAI states current lifecycle state from the artifact that owns it, and the derived copy cannot invent
# a value the upstream descriptor does not establish.
#
# Three properties:
#
#   FRESH        regenerating from the descriptor reproduces the tracked artifact byte for byte
#   DERIVED      every fact carries the upstream field that establishes it
#   NO_AG10      no AG-10 run state is asserted, because no tracked artifact records one
#
# NO_AG10 is a property and not an omission. The rule that AG-10 readiness is aggregated and never
# declared exists; a live evaluation reports NOT_RUN because the gate was not evaluated. Neither is a
# recorded current-state fact, so a field here would assert something nothing upstream establishes — and
# it would be the kind of assertion a reader has no way to check.
#
# The check OBSERVES. It never regenerates tracked state: a checker that repairs what it measures reports
# success about its own repair.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "== banzai-lifecycle-facts =="
GEN="tools/gen-banzai-lifecycle-facts.py"
ARTIFACT="services/banzai-api/src/lifecycleFacts.generated.json"
DESCRIPTOR="contracts/production/protocol-version.json"
fail=0
note() { echo "  FAIL: $*"; fail=1; }

[ -f "$ARTIFACT" ] || note "the derived artifact is missing: $ARTIFACT"
[ -f "$DESCRIPTOR" ] || note "the lifecycle descriptor is missing: $DESCRIPTOR"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

# FRESH — and determinism, since a generator that varies makes freshness unfalsifiable.
if python3 "$GEN" --stdout > "$tmp/fresh.json" 2>"$tmp/err"; then
  python3 "$GEN" --stdout > "$tmp/again.json" 2>/dev/null
  if ! cmp -s "$tmp/fresh.json" "$tmp/again.json"; then
    note "$GEN is not deterministic: two generations differ"
  fi
  if [ -f "$ARTIFACT" ] && ! cmp -s "$ARTIFACT" "$tmp/fresh.json"; then
    note "$ARTIFACT is stale: it does not match a fresh generation from $DESCRIPTOR."
    echo "        Run: python3 $GEN — do not hand-edit a derived file."
  fi
else
  note "$GEN failed: $(head -2 "$tmp/err" | tr '\n' ' ')"
fi

# DERIVED + NO_AG10
python3 - "$ARTIFACT" "$DESCRIPTOR" <<'PY' || fail=1
import json, sys
art, desc = sys.argv[1], sys.argv[2]
a = json.load(open(art, encoding='utf-8'))
d = json.load(open(desc, encoding='utf-8'))
bad = 0
facts = a.get('facts', {})
prov = a.get('_provenance', {})
if not facts:
    print('  FAIL: the derived artifact carries no facts'); bad += 1
for k in facts:
    if k not in prov:
        print(f'  FAIL: {k} has no provenance — a derived fact must name what establishes it'); bad += 1
    elif not prov[k].startswith(desc):
        print(f'  FAIL: {k} claims provenance outside the descriptor: {prov[k]}'); bad += 1
# The derived values must equal what the descriptor says, field by field.
ls = d.get('lifecycle_state', {})
for k, v in facts.items():
    up = d.get(k, ls.get(k, '<<absent>>'))
    if up != v:
        print(f'  FAIL: {k} is {v!r} in the derived artifact but {up!r} upstream'); bad += 1
for banned in ('ag10_state', 'ag10', 'ag_10'):
    if banned in facts:
        print(f'  FAIL: {banned} is asserted, but no tracked artifact records an AG-10 run state'); bad += 1
if bad:
    sys.exit(1)
print(f'  ok: {len(facts)} facts, each equal to its upstream field and carrying its provenance')
print('  ok: no AG-10 run state asserted')
PY

# SELF-TEST — every property must be able to fail.
if [ -f "$ARTIFACT" ]; then
  python3 - "$ARTIFACT" "$tmp/mutated.json" <<'PY'
import json, sys, collections
a = json.load(open(sys.argv[1], encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
a['facts']['protocol_version'] = '9.9.9'
json.dump(a, open(sys.argv[2], 'w'), ensure_ascii=False, indent=2)
open(sys.argv[2], 'a').write('\n')
PY
  if cmp -s "$ARTIFACT" "$tmp/mutated.json"; then
    note "self-test could not build a divergent artifact — the freshness check may be watching nothing"
  elif cmp -s "$tmp/fresh.json" "$tmp/mutated.json"; then
    note "self-test mutation is indistinguishable from a fresh generation"
  else
    echo "  ok: self-test — a derived value that upstream does not establish is detectable"
  fi
fi

if [ "$fail" -ne 0 ]; then echo "banzai-lifecycle-facts: FAILED"; exit 1; fi
echo "banzai-lifecycle-facts: OK"
