#!/usr/bin/env bash
# A factual unit is FULLY PASSING only when EVERY item mapped to it passes.
#
# The metric once read `semantic_id in covered_units`, and `covered_units` was populated whenever ANY
# item passed. Against src-acb0f1b it reported 173/176 while 51 factual items were failing — a number
# that cannot be reconciled with its own failure list, and it was the headline figure for release
# readiness. The honest count for that run was 143/176.
#
# This proves the definition rather than trusting it: one unit, two items, exactly one made to fail.
# The unit must stop being fully passing and the aggregate must go DOWN.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."
echo "== factual-unit-metric =="

python3 - <<'PY'
import json, subprocess, sys, tempfile, os, re
ROOT = "assurance/banzai-knowledge"
bench = json.load(open(f"{ROOT}/benchmark-v2.json"))

# A factual unit with MORE THAN ONE item, chosen from the corpus itself rather than named here, so this
# cannot go stale when the corpus changes.
by_unit = {}
for i in bench["items"]:
    for u in i["semantic_unit_ids"]:
        by_unit.setdefault(u, []).append(i)
target, items = next(
    (u, v) for u, v in sorted(by_unit.items())
    if len(v) >= 2 and not u.startswith("capability.")
)

def run(rows, tag):
    tf = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    for r in rows:
        tf.write(json.dumps(r) + "\n")
    tf.close()
    out = subprocess.run([sys.executable, f"{ROOT}/score-v2.py", tf.name], capture_output=True, text=True).stdout
    os.unlink(tf.name)
    m = re.search(r"FULLY-passing factual units \(every item\): (\d+)/", out)
    if not m:
        print(f"  FAIL: scorer printed no fully-passing count for {tag}")
        sys.exit(1)
    return int(m.group(1))

def row(item, good):
    # A PASSING row satisfies every assertion the item declares; a failing one is an honest refusal.
    ans = "" if not good else " ".join(
        [item["question"]] + [f"({x})" for x in item.get("must", [])] + [f"({x})" for x in item.get("must_any", [])]
    )
    return {"question_id": item["question_id"], "locale": item["locale"],
            "records": [{"question": item["question"], "status": 200, "latency_ms": 1,
                         "answer": ans or None, "answer_locale": item["locale"],
                         "terminal_kind": "canonical_definition" if good else "insufficient_evidence",
                         "local_model_called": False,
                         "sources": [{"id": "invariants", "path": "contracts/invariants.json"}],
                         "sources_count": 1}]}

# Only the target unit's items are in the run, so the aggregate moves for one reason only.
all_pass = [row(i, True) for i in items]
one_fail = [row(i, k > 0) for k, i in enumerate(items)]

base = run(all_pass, "all passing")
mut = run(one_fail, "one item failing")
print(f"  unit under test: {target}  ({len(items)} items)")
print(f"  every item passing        -> fully-passing units = {base}")
print(f"  exactly one item failing  -> fully-passing units = {mut}")
if mut >= base:
    print("  FAIL: one failing item did not remove the unit from the fully-passing count.")
    print("        The metric has regressed to 'any passing item means the unit passes'.")
    sys.exit(1)
print("factual-unit-metric: OK")
PY
