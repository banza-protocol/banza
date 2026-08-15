#!/usr/bin/env bash
#
# Execute the registered executable evidence and record WHAT RAN, against WHICH SOURCE.
#
# "The test exists" is not evidence. "The test ran against exactly this source state and passed" is.
# Without this file the assurance engine can only confirm that a path resolves — and a suite of paths
# that all resolve, none of which anyone executed at this commit, is a sophisticated false green.
#
# The record binds each result to the source identity being assessed. A green result from an earlier
# commit cannot prove the current one, so the engine rejects it rather than inheriting it.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=assurance/execution-evidence.json
COMMIT="$(git rev-parse HEAD)"
# Only TRACKED modifications matter. An untracked scratch file changes nothing about the bytes under
# test; a modified tracked file means the tests ran on code that is not in this commit, and attributing
# that result to the commit is a false attribution.
DIRTY=false
[ -n "$(git status --porcelain --untracked-files=no)" ] && DIRTY=true

echo "== collecting execution evidence =="
echo "   source: $COMMIT (dirty=$DIRTY)"

python3 - "$COMMIT" "$DIRTY" "$OUT" <<'PY'
import json, os, re, subprocess, sys

commit, dirty, out = sys.argv[1], sys.argv[2] == "true", sys.argv[3]
reg = json.load(open('assurance/properties.json', encoding='utf8'))

# Which evidence categories are EXECUTABLE. A normative document is evidence of a rule; it is not
# something that runs, and pretending prose was executed would be its own false green.
EXECUTABLE = ("positive_evidence", "negative_evidence", "adversarial_evidence",
              "state_test", "resilience_test")

def run_rust(manifest, test_file, test_name):
    cmd = ["cargo", "test", "-q", "--manifest-path", manifest, "--test", test_file]
    if test_name:
        cmd.append(test_name)
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0

def run_shell(script):
    r = subprocess.run(["bash", script], capture_output=True, text=True)
    return r.returncode == 0

records, skipped = [], []
for p in reg['properties']:
    for cat in EXECUTABLE:
        for ref in (p.get(cat) or []):
            path = ref.split('::')[0].split('#')[0].strip().split()[0]
            name = ref.split('::')[1].strip() if '::' in ref else None
            kind, ok = None, None

            m = re.match(r'^(engines/[^/]+)/tests/([^/.]+)\.rs$', path)
            if m:
                kind = 'cargo-test'
                ok = run_rust(f"{m.group(1)}/Cargo.toml", m.group(2), name)
            elif path.endswith('.sh') and os.path.exists(path):
                kind = 'shell-guard'
                ok = run_shell(path)
            elif path.endswith('.json') and os.path.exists(path):
                # A vector file is executed by the suite that consumes it; its execution is recorded
                # through that suite, not by re-reading the file here.
                skipped.append({"evidence": ref, "why": "vector executed via its consuming suite"})
                continue
            else:
                skipped.append({"evidence": ref, "why": "no executable runner for this reference"})
                continue

            records.append({
                "property_id": p['property_id'],
                "evidence": ref,
                "category": cat,
                "runner": kind,
                "result": "PASS" if ok else "FAIL",
                "source_commit": commit,
            })
            print(f"  {'ok  ' if ok else 'FAIL'} {p['property_id']:<44} {ref[:70]}")

# The registry digest binds this run to the DEFINITION of the evidence. Change a property's required
# stages or its test targets and the old results stop applying, whatever commit they carry.
def fnv_digest(path):
    acc = 0xcbf29ce484222325
    for b in open(path, 'rb').read():
        acc ^= b
        acc = (acc * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return ''.join('%02x' % ((acc >> ((i % 8) * 8)) & 0xff) for i in range(32))
registry_digest = fnv_digest('assurance/properties.json')

doc = {
    "_spec": "BANZA assurance execution evidence",
    "registry_digest": registry_digest,
    "_status": "NON-NORMATIVE. Produced by tools/collect-execution-evidence.sh. Each record binds one executed piece of evidence to the source state it was executed against.",
    "source_commit": commit,
    "tree_dirty": dirty,
    "tool": "collect-execution-evidence",
    "tool_version": "0.1.0",
    "records": records,
    "not_executed": skipped,
}
json.dump(doc, open(out, 'w', encoding='utf8'), indent=2, ensure_ascii=False)
open(out, 'a', encoding='utf8').write("\n")
failed = [r for r in records if r['result'] != 'PASS']
print(f"\n  executed {len(records)} · passed {len(records)-len(failed)} · failed {len(failed)} · not executable {len(skipped)}")
sys.exit(1 if failed else 0)
PY
echo "   written to $OUT"
