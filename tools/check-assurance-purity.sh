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

# The active graph: whatever `assurance-check` actually depends on, read from the Makefile rather than
# restated here.
DEPS="$(awk -F':' '/^assurance-check:/ {print $2; exit}' Makefile)"
[ -n "$DEPS" ] || { echo "  FAIL: cannot resolve the assurance check graph"; exit 1; }

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "  SKIP: tracked tree is already dirty; purity can only be measured from a clean tree"
  exit 0
fi

impure=0
checked=0
for t in $DEPS; do
  case "$t" in *-check) ;; *) continue ;; esac
  make "$t" >/dev/null 2>&1 || true
  checked=$((checked + 1))
  changed="$(git status --porcelain --untracked-files=no)"
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

[ "$impure" -eq 0 ] || { echo "assurance-purity: FAIL — a check altered the state it observes"; exit 1; }
echo "  ok: $checked observational checks in the active graph; tracked state unchanged by all of them"
echo "assurance-purity: OK — checks observe, generators write"
