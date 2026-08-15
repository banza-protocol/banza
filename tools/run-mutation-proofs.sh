#!/usr/bin/env bash
#
# Prove that every critical property guard can actually go red.
#
# A guard nobody has seen fail is an untested assertion. The common failure of a guard is not being
# wrong — it is being inert: matching nothing, scanning the wrong directory, or asserting a condition
# that no longer exists. Only a deliberate violation distinguishes a guard that works from one that has
# simply never been contradicted.
#
# ISOLATION. Every mutation runs in a throwaway git worktree created from HEAD and removed afterwards.
# The primary worktree is never touched. This is not a stylistic preference: an earlier session lost
# uncommitted work to a `git checkout .` used to probe a baseline, and the lesson is that the cost of
# proving a guard can fail must never be the tree you are working in.
#
# Usage:  tools/run-mutation-proofs.sh [mutation_id ...]
# Exit 1 if any guard stays green under its violation.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
SPEC=assurance/mutations.json

command -v git >/dev/null || { echo "git required"; exit 2; }

WANT=("$@")
mapfile -t IDS < <(python3 -c "
import json,sys
d=json.load(open('$SPEC'))
want=set(sys.argv[1:])
for m in d['mutations']:
    if not want or m['id'] in want: print(m['id'])
" "${WANT[@]}")

[ "${#IDS[@]}" -gt 0 ] || { echo "no mutations selected"; exit 2; }

echo "== mutation proofs (${#IDS[@]}) =="
echo "   primary worktree: $ROOT  —  never mutated"

fail=0
for id in "${IDS[@]}"; do
  apply="$(python3 -c "
import json
m={x['id']:x for x in json.load(open('$SPEC'))['mutations']}['$id']
print(m['apply'])")"
  guard="$(python3 -c "
import json
m={x['id']:x for x in json.load(open('$SPEC'))['mutations']}['$id']
print(m['guard'])")"
  prop="$(python3 -c "
import json
m={x['id']:x for x in json.load(open('$SPEC'))['mutations']}['$id']
print(m['property'])")"

  wt="$(mktemp -d)/wt"
  git worktree add -q --detach "$wt" HEAD 2>/dev/null

  # Apply the violation and run the guard INSIDE the isolated tree.
  set +e
  ( cd "$wt" && eval "$apply" ) >/dev/null 2>&1
  applied=$?
  ( cd "$wt" && eval "$guard" ) >/dev/null 2>&1
  guard_rc=$?
  set -e

  git worktree remove --force "$wt" >/dev/null 2>&1 || true
  rm -rf "$(dirname "$wt")"

  if [ "$applied" -ne 0 ]; then
    echo "  ERROR $id — the mutation could not be applied (the violation may no longer be expressible)"
    fail=1
  elif [ "$guard_rc" -eq 0 ]; then
    echo "  FAIL  $id — $guard stayed GREEN while $prop was violated"
    fail=1
  else
    echo "  ok    $id — $guard went red under: $prop"
  fi
done

# The primary tree must be exactly as it was.
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "  FAIL: the primary worktree is dirty after mutation testing — isolation was breached"
  fail=1
else
  echo "  ok: primary worktree clean — isolation held"
fi

[ "$fail" -eq 0 ] || { echo "mutation-proofs: FAIL — a guard cannot demonstrate failure"; exit 1; }
echo "mutation-proofs: OK — every guard proved it can go red"
