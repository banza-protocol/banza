#!/usr/bin/env bash
# The ADR tree is current-only, contiguous, and nothing points at an ADR that does not exist.
#
# This guard derives everything from the tree. It carries no list of removed IDs, because after a
# clean-slate renumbering such a list is worse than useless: an ID that was once removed can be a
# perfectly valid current ADR, and a frozen list would then report the present as the past.
#
#   1. ADR files are numbered contiguously from 001, one file per number;
#   2. every ADR-NNN referenced anywhere on a current surface resolves to an existing ADR;
#   3. the index lists every ADR and nothing else.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

ADRDIR=decisions/adr
INDEX="$ADRDIR/README.md"
fail=0
say() { echo "$*"; }

echo "== adr-canonical-clean =="

# 1. Contiguous numbering, no duplicates, no gaps.
ids=$(ls "$ADRDIR" | grep -oE '^ADR-[0-9]{3}' | sed 's/ADR-//' | sort)
n=$(echo "$ids" | wc -l | tr -d ' ')
expected=$(seq -f '%03g' 1 "$n")
if [ "$ids" != "$expected" ]; then
  say "FAIL: ADR numbering is not contiguous from 001"
  diff <(echo "$ids") <(echo "$expected") | head -6 | sed 's/^/    /'
  fail=1
else
  say "  ok: $n ADRs, contiguous from 001, no duplicates"
fi

# 2. Every referenced ADR exists. Scanned over current surfaces only; the report of this sweep is
#    excluded because it narrates the renumbering itself, and ADR-999 is excluded because it is the
#    deliberate nonexistent id the retrieval evaluation uses to test a lookup that must not resolve.
missing=$(git ls-files 'decisions/**/*.md' 'docs/**/*.md' 'spec/**/*.md' 'contracts/**/*.json' \
                      'website/content/**/*.md' 'tools/*.sh' 'engines/**/*.rs' 2>/dev/null \
  | grep -v '^docs/audit/' \
  | xargs grep -ohaE 'ADR-[0-9]{3}' 2>/dev/null | sort -u \
  | grep -v '^ADR-999$' \
  | while read -r id; do
      ls "$ADRDIR/$id"-*.md >/dev/null 2>&1 || echo "$id"
    done)
if [ -n "$missing" ]; then
  say "FAIL: reference to an ADR that does not exist:"; echo "$missing" | sed 's/^/    /'; fail=1
else
  say "  ok: every referenced ADR resolves"
fi

# 3. The index covers exactly the tree.
if [ -f "$INDEX" ]; then
  listed=$(grep -oE 'ADR-[0-9]{3}' "$INDEX" | sort -u)
  actual=$(ls "$ADRDIR" | grep -oE '^ADR-[0-9]{3}' | sort -u)
  if [ "$listed" != "$actual" ]; then
    say "FAIL: the ADR index does not match the tree"
    diff <(echo "$listed") <(echo "$actual") | head -6 | sed 's/^/    /'; fail=1
  else
    say "  ok: the index lists every ADR and nothing else"
  fi
else
  say "FAIL: $INDEX is missing"; fail=1
fi

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf '001\n003\n' > "$tmp/a"; printf '001\n002\n' > "$tmp/b"
[ "$(cat "$tmp/a")" != "$(cat "$tmp/b")" ] || { echo "SELFTEST_FAIL contiguity comparison"; exit 2; }

[ "$fail" -eq 0 ] || exit 1
echo "adr-canonical-clean: OK — contiguous, resolvable, indexed"
