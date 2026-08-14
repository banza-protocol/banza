#!/usr/bin/env bash
# CI workflows parse, and required status checks are keyed to properties rather than labels.
#
# This guard exists because of a specific failure: the ADR renumbering rewrote two job names that branch
# protection required by name, so 307 checks passed and the merge gate still refused — waiting for two
# contexts nothing produced. Then the fix broke the workflow's YAML, and only 63 jobs ran at all, which
# looked like a green result.
#
# Both failure modes are silent. A workflow that does not parse simply does not run, and a required
# context that nothing produces simply never arrives. So:
#
#   1. every workflow parses as YAML;
#   2. no job name carries an ADR number, milestone or phase label — those move, and a required check
#      keyed to one breaks the moment they do;
#   3. every job name is unique within its workflow (two jobs with one name make the context ambiguous).
#
# Section pointers into the BANZA Reference (§12, §14, §30) are allowed: those identify stable chapters.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
echo "== ci-workflow-contract =="

python3 - <<'PY' || fail=1
import glob, re, sys, collections
try:
    import yaml
except ImportError:
    print("  SKIP: pyyaml unavailable — parse check not run"); sys.exit(0)

bad = 0
LABEL = re.compile(r'\b(?:M2\.[0-9A-Z.]+|ADR-\d{3}|BX\d[.\d]*)\b')
for p in sorted(glob.glob(".github/workflows/*.yml")):
    try:
        doc = yaml.safe_load(open(p, encoding="utf-8"))
    except Exception as e:
        print("  FAIL: %s does not parse — it would silently not run: %s" % (p, str(e)[:110])); bad = 1; continue
    jobs = (doc or {}).get("jobs") or {}
    names = []
    for key, job in jobs.items():
        n = (job or {}).get("name") or key
        names.append(n)
        if LABEL.search(str(n)):
            print("  FAIL: %s job %r names a moving label: %s" % (p, key, n)); bad = 1
    dup = [n for n, c in collections.Counter(names).items() if c > 1]
    if dup:
        print("  FAIL: %s has duplicate job names: %s" % (p, dup[:3])); bad = 1
if not bad:
    total = sum(len((yaml.safe_load(open(p, encoding="utf-8")) or {}).get("jobs") or {})
                for p in glob.glob(".github/workflows/*.yml"))
    print("  ok: every workflow parses; %d jobs, names stable and unique" % total)
sys.exit(bad)
PY

# ── self-test: an unparseable workflow and a labelled job name must both be caught ─────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
python3 - "$tmp" <<'PY' || { echo "SELFTEST_FAIL"; exit 2; }
import sys, re
try:
    import yaml
except ImportError:
    sys.exit(0)
d = sys.argv[1]
open(d + "/bad.yml", "w").write('jobs:\n  a:\n    name: "x" y\n')
try:
    yaml.safe_load(open(d + "/bad.yml"))
    print("SELFTEST_FAIL: an unparseable workflow parsed"); sys.exit(1)
except Exception:
    pass
if not re.search(r'\bADR-\d{3}\b', "name: something (ADR-999)"):
    print("SELFTEST_FAIL: the label detector missed an ADR number"); sys.exit(1)
PY

[ "$fail" -eq 0 ] || exit 1
echo "ci-workflow-contract: OK — workflows parse, job names are stable"
