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
#
# CI does not only call scripts. It also calls `make` targets, and this runner used to ignore them —
# which is how a Makefile broken by an edit in this branch went unnoticed while the runner reported a
# clean count: `make` could not even parse, so every `make` step in CI would have failed, and nothing
# here looked. A local runner that models CI must run what CI runs, not the subset that is convenient.
#
# A third form exists and is NOT extractable: some jobs build a binary and invoke it directly from a
# multi-line `run: |` block. Pattern-matching arbitrary run blocks would be guesswork, so those gates are
# listed explicitly below — with the make target that runs the same logic, and a reason. The list is short
# and visible on purpose: an unlisted gate is a gate this runner reports nothing about, which is how three
# real Rust-rule failures sat behind a "0 FAIL" result.
EXPLICIT_INVOCATIONS='make rust-rule-check'
INVOCATION_LIST="$(
  {
    grep -ohE "bash tools/check-[a-z0-9._-]+\.sh[^\"']*" .github/workflows/*.yml
    grep -ohE "run: make [a-z0-9-]+" .github/workflows/*.yml | sed 's/run: //'
    printf '%s\n' "$EXPLICIT_INVOCATIONS"
  } | sed 's/[[:space:]]*$//' | sort -u
)"

# Every workflow must be represented. A new workflow whose gate this runner cannot see is a silent gap, so
# it is named here rather than discovered later by a red pull request.
for wf in .github/workflows/*.yml; do
  name="$(basename "$wf" .yml)"
  case "$name" in
    # Not guard jobs: build/deploy/release pipelines have no check for this runner to mirror.
    deploy*|release*|publish*|pages*) continue ;;
  esac
  if ! grep -qE "bash tools/check-|run: make " "$wf"; then
    case " $EXPLICIT_INVOCATIONS " in
      *"rust-rule"*) [ "$name" = "rust-rule-guard" ] && continue ;;
    esac
    echo "  NOTE: $name has no extractable guard invocation and is not listed explicitly — its gate is unmodelled here" >&2
  fi
done

pass=0; fail=0; skipped=0
FAILED=""
while IFS= read -r inv; do
  [ -z "$inv" ] && continue
  case "$inv" in
    "make "*) script="$inv" ;;
    *) script="${inv#bash tools/}"; script="${script%% *}" ;;
  esac
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
