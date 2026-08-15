#!/usr/bin/env bash
#
# The trial target cannot move silently.
#
# An independent-implementation trial is only worth running if "package digest X" names a state nobody
# can change without the change being visible. Git governance protects one half of that (main is
# PR-only, enforced for administrators); this guard protects the other half: the manifest that names the
# target must still describe the package on disk.
#
# Properties:
#   1. the trial manifest exists, parses, and matches the package file-by-file
#   2. the package is deterministic: two exports from the SAME commit are byte-identical
#   3. self-containment holds: UNRESOLVED = 0
#   4. no prohibited material reached the package (engines, decision records, audits, internal tooling)
#   5. the required vector set is the one the profile registry derives, not a second hand-kept list
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

TRIAL=trials/banza-v1.0.0-l0-independent-trial-001
MAN="$TRIAL/TRIAL_MANIFEST.json"
PKG=clean-room/packages/l0
fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

echo "== trial-target-integrity =="

[ -f "$MAN" ] || { echo "  FAIL: $MAN is missing"; exit 1; }

# ── 1. the manifest describes the package that is actually there ────────────────────────────────────
# Checked against the RECORDED digests rather than by regenerating. The package stamps its own source
# commit, so a regeneration at any other commit — every pull request, where the checkout is a merge
# commit — would differ for a reason that has nothing to do with the target moving.
python3 tools/trial_target_checks.py describes || fail=1

# ── 2. package determinism ──────────────────────────────────────────────────────────────────────────
# The property is that two exports FROM THE SAME COMMIT agree byte for byte, not that an export at one
# commit equals an export at another. Export twice here, compare those two, then restore the committed
# package so the guard leaves the tree as it found it.
snap=$(mktemp -d)
python3 tools/gen-clean-room-package.py >/dev/null 2>&1 || bad "the package generator failed"
( cd "$PKG" && find . -type f | sort | xargs shasum -a 256 ) > "$snap/first"
python3 tools/gen-clean-room-package.py >/dev/null 2>&1 || bad "the package generator failed on re-export"
( cd "$PKG" && find . -type f | sort | xargs shasum -a 256 ) > "$snap/second"
if cmp -s "$snap/first" "$snap/second"; then
  ok "package generation is deterministic (two exports from this commit are byte-identical)"
else
  bad "package generation is not deterministic"
  diff "$snap/first" "$snap/second" | head -6 | sed 's/^/      /'
fi
rm -rf "$snap"
git checkout -- "$PKG" 2>/dev/null || true

# ── 3. self-containment ─────────────────────────────────────────────────────────────────────────────
python3 tools/trial_target_checks.py self-containment || fail=1

# ── 4. nothing prohibited reached the package ───────────────────────────────────────────────────────
# Checked as PATHS, not as prose: the package manifest names these in its own exclusion list, and a
# guard that grepped the text would report the declaration of an exclusion as the thing excluded.
leak=0
for pat in 'engines/*' '*/ADR-*' '*/audit/*' 'tools/*' '.github/*'; do
  if find "$PKG" -path "$PKG/$pat" 2>/dev/null | grep -q .; then
    bad "prohibited material in the package: $pat"; leak=1
  fi
done
[ "$leak" -eq 0 ] && ok "no engines, decision records, audits or internal tooling in the package"

# ── 5. the required vector set is derived ───────────────────────────────────────────────────────────
python3 tools/trial_target_checks.py vector-set || fail=1

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf 'a\n' > "$tmp/x"; printf 'b\n' > "$tmp/y"
cmp -s "$tmp/x" "$tmp/y" && { echo "SELFTEST_FAIL: cmp did not detect a difference" >&2; exit 2; }

[ "$fail" -eq 0 ] || exit 1
echo "trial-target-integrity: OK — the target is deterministic, self-contained and cannot move silently"
