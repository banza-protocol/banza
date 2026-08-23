#!/usr/bin/env bash
# The oracle tests the CLAIM, not one preferred word.
#
# A single required token fails in both directions at once. "Does Operator Zero define the protocol?"
# was answered "Operator Zero does not define the protocol" — semantically exact — and failed for
# lacking the string "reference|implement". Meanwhile "Evidence is important for conformance" contains
# the word and asserts nothing.
#
# Nine adversarial cases: a correct paraphrase that avoids the keyword must PASS, a keyword without the
# semantics must go RED, an inverted claim must go RED, and the recorded production answers must land
# where the diagnosis says they land.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."
echo "== semantic-oracle =="
python3 - <<'PY'
import json, subprocess, sys, tempfile, os
ROOT = "assurance/banzai-knowledge"
exp = json.load(open(f"{ROOT}/oracle-adversarial.expect.json"))
rows = [json.loads(l) for l in open(f"{ROOT}/oracle-adversarial.jsonl")]
bad = 0
for e, row in zip(exp, rows):
    tf = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    tf.write(json.dumps(row) + "\n"); tf.close()
    subprocess.run([sys.executable, f"{ROOT}/score-v2.py", tf.name, "--emit", tf.name + ".json"],
                   capture_output=True, text=True)
    v = json.load(open(tf.name + ".json"))["results"][0]
    ok = v["pass"] == e["expect_pass"]
    if not ok:
        bad += 1
        print(f"  FAIL {e['name']}: expected {'PASS' if e['expect_pass'] else 'RED'}, got {'PASS' if v['pass'] else 'RED'}")
    os.unlink(tf.name); os.unlink(tf.name + ".json")
if bad:
    print(f"semantic-oracle: FAILED ({bad} of {len(exp)} adversarial cases wrong)")
    sys.exit(1)
print(f"  ok: {len(exp)} adversarial cases — paraphrase passes, keyword-without-semantics and inversion go red")
print("semantic-oracle: OK")
PY
