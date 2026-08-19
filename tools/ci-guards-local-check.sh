#!/usr/bin/env bash
# ci-guards-local-check.sh — run the repository's CI guard surface the way CI runs it.
#
# WHY THIS EXISTS. Website Phase 2 was developed across five blocks, each declared complete against a
# self-selected subset — the Website suite, tsc, the production build, the route registry, the BanzAI
# battery and `make assurance-check`. That subset excludes the repository's LARGEST assurance surface: the
# ~190 guards the workflows invoke. PR #32 ran them for the first time and found 43 branch-introduced
# failures that every local gate had passed over. This runner closes that gap.
#
# WORKFLOW-FAITHFUL, deliberately. The authority is the workflow file, not a glob: a guard is run here if
# and only if a workflow invokes it, WITH the arguments the workflow passes. Globbing `tools/check-*.sh`
# and calling each with no arguments is not the same thing and produces false failures —
# `check-openapi-compatibility.sh` takes a generated file path and reports a defect when called bare.
#
# THREE OUTCOMES, never two. A guard that cannot run on this host is NOT_RUN_LOCALLY, never a pass: the
# hermetic whitepaper job needs Linux apt and poppler, and calling its absence "green" would be the same
# category of error as reading a build log instead of an exit code.
#
# It holds no gate logic of its own — it invokes the same scripts CI does.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ONLY="${1:-}"

# Guards whose workflow step cannot be reproduced on this host, with the reason. Anything listed here is
# reported NOT_RUN_LOCALLY and is the CI run's responsibility — it is never counted as a pass.
NOT_LOCAL_REASON="
check-whitepaper-hermetic.sh|the workflow step installs poppler-utils via apt (ubuntu-latest); not available on this host
check-openapi-compatibility.sh|CI generates its input (/tmp/openapi-old.yaml) in an earlier workflow step; without that artifact the invocation is not the one CI performs"
not_local_reason() {
  local g="$1" e
  while IFS= read -r e; do
    [ -z "$e" ] && continue
    [ "${e%%|*}" = "$g" ] && { echo "${e#*|}"; return 0; }
  done <<< "$NOT_LOCAL_REASON"
  return 1
}

# The invocation list, extracted from the workflows themselves so it cannot drift from CI.
# `mapfile` is bash 4+; macOS ships bash 3.2, so read the list portably.
INVOCATION_LIST="$(grep -ohE "bash tools/check-[a-z0-9._-]+\.sh[^\"']*" .github/workflows/*.yml | sed 's/[[:space:]]*$//' | sort -u)"

pass=0; fail=0; skipped=0
FAILED=""
while IFS= read -r inv; do
  [ -z "$inv" ] && continue
  script="${inv#bash tools/}"; script="${script%% *}"
  [ -n "$ONLY" ] && [[ "$script" != *"$ONLY"* ]] && continue
  if reason="$(not_local_reason "$script")"; then
    printf '  %-58s %s\n' "$script" "NOT_RUN_LOCALLY — $reason"
    skipped=$((skipped+1)); continue
  fi
  if out="$(eval "$inv" 2>&1)"; then
    pass=$((pass+1))
  else
    fail=$((fail+1)); FAILED="$FAILED $script"
    printf '  %-58s FAIL\n' "$script"
    echo "$out" | grep -iE "^[[:space:]]*(FAIL|✗)" | grep -viE "advisory" | head -2 | sed 's/^/      /'
  fi
done <<< "$INVOCATION_LIST"

echo
echo "ci-guards-local-check: ${pass} PASS · ${fail} FAIL · ${skipped} NOT_RUN_LOCALLY"
if [ "$fail" -gt 0 ]; then
  echo "failing:$FAILED"
  echo "ci-guards-local-check: FAIL — these guards gate the pull request."
  exit 1
fi
echo "ci-guards-local-check: OK"
