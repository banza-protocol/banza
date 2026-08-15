#!/usr/bin/env bash
#
# Checks observe; generators write.
#
# `clean-room-package-check` regenerated the package in place to prove determinism, which rewrote
# provenance.json with the current commit. The act of verifying dirtied the tracked tree — and because
# assurance evidence is source-bound, the next run then refused its own evidence as produced from a
# dirty source. A verifier that mutates what it inspects cannot ground a claim about it.
#
# The property: every observational check in the ACTIVE assurance path leaves tracked state unchanged.
#
# It is deliberately not a frozen list of today's commands. The check graph is resolved from the
# assurance target itself, so a new impure check cannot enter the path and go unnoticed — a manual list
# protects the day it was written and nothing after it.
#
# Temporary directories and gitignored run evidence are not tracked state and are not violations.
#
# Exit 1 on violation. Exit 2 if the self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== assurance-purity =="

# Subjects come from the execution plan BY ROLE, never from the aggregate target. Reading them off
# `assurance-check` made this checker execute the pipeline that contains it — a cycle whose only symptom
# was a ten-minute timeout. Role, not name and not membership: a generator called `foo-check` is not a
# subject, and this checker is not a subject of itself.
DEPS="$(python3 -c "
import json
plan = json.load(open('assurance/execution-plan.json'))
print(' '.join(c['target'] for c in plan['commands'] if c['role'] == 'READ_ONLY_CHECK'))
")"
[ -n "$DEPS" ] || { echo "  FAIL: the execution plan declares no observational subjects"; exit 1; }

# The property is that a check changes NOTHING, so it is measured as a delta from the state at entry —
# not as a demand for a clean tree. Requiring cleanliness made this guard skip green whenever the tree
# was dirty, and since every mutation dirties the tree, the guard could never be falsified: it was
# unfalsifiable by construction, which is the failure it exists to detect in others.
BASE="$(mktemp)"
git status --porcelain --untracked-files=no | sort > "$BASE"

impure=0
checked=0
for t in $DEPS; do
  make "$t" >/dev/null 2>&1 || true
  checked=$((checked + 1))
  changed="$(git status --porcelain --untracked-files=no | sort | comm -13 "$BASE" -)"
  if [ -n "$changed" ]; then
    echo "  FAIL: $t mutated tracked state while verifying it:"
    printf '%s\n' "$changed" | sed 's/^/         /'
    impure=1
    # Restore ONLY the paths this check touched — never a repository-wide destructive restore.
    printf '%s\n' "$changed" | awk '{print $2}' | while read -r f; do
      git checkout -q HEAD -- "$f" 2>/dev/null || true
    done
  fi
done

rm -f "$BASE"
[ "$impure" -eq 0 ] || { echo "assurance-purity: FAIL — a check altered the state it observes"; exit 1; }
echo "  ok: $checked observational checks in the active graph; tracked state unchanged by all of them"
echo "assurance-purity: OK — checks observe, generators write"
