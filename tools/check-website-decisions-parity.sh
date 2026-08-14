#!/usr/bin/env bash
# The website's decision records are a derivation, not a second copy.
#
# The site renders ADRs and RFCs and its Docker build context is website/, so the documents must exist
# inside it. That is packaging, not editing. This guard proves the mirror is byte-identical to
# decisions/{adr,rfc}/ and covers exactly the same set — which is what makes it safe for other guards
# to treat the mirror as derived rather than re-scanning it as authored copy.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
echo "== website-decisions-parity =="
for kind in adr rfc; do
  src="decisions/$kind"; dst="website/content/decisions/$kind"
  [ -d "$src" ] || continue
  [ -d "$dst" ] || { echo "  FAIL: $dst is missing"; fail=1; continue; }
  a=$(ls "$src" | grep -E '\.md$' | grep -v '^README.md$' | sort)
  b=$(ls "$dst" | grep -E '\.md$' | sort)
  if [ "$a" != "$b" ]; then
    echo "  FAIL: $kind mirror does not cover the same set"; diff <(echo "$a") <(echo "$b") | head -6 | sed 's/^/    /'; fail=1; continue
  fi
  while IFS= read -r f; do
    cmp -s "$src/$f" "$dst/$f" || { echo "  FAIL: $kind/$f differs from its canonical source"; fail=1; }
  done <<< "$a"
  echo "  ok: $kind — $(echo "$a" | wc -l | tr -d ' ') records, byte-identical"
done
[ "$fail" -eq 0 ] || exit 1
echo "website-decisions-parity: OK — the mirror is a derivation and cannot drift"
