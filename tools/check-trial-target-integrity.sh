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
#   1. the trial manifest exists and parses
#   2. regenerating it changes nothing — the target on disk is the target it names
#   3. the package is deterministic: two exports from the same commit are byte-identical
#   4. self-containment holds: UNRESOLVED = 0
#   5. no prohibited material reached the package (engines, decision records, audits, internal tooling)
#   6. the required vector set is the one the profile registry derives, not a second hand-kept list
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
python3 -c "import json,sys; json.load(open('$MAN'))" 2>/dev/null || { bad "trial manifest does not parse"; exit 1; }

# ── 1-2. the manifest describes the package that is actually there ──────────────────────────────────
before=$(shasum -a 256 "$MAN" | cut -d' ' -f1)
python3 tools/gen-trial-manifest.py >/dev/null 2>&1 || bad "the trial manifest generator failed"
after=$(shasum -a 256 "$MAN" | cut -d' ' -f1)
if [ "$before" = "$after" ]; then
  ok "the trial manifest still describes the package on disk"
else
  bad "the trial manifest is stale — the target moved without the manifest saying so (run: python3 tools/gen-trial-manifest.py)"
fi

# ── 3. package determinism ─────────────────────────────────────────────────────────────────────────
# A target the external team cannot recompute is not a target. Two exports must agree byte for byte.
snap=$(mktemp -d); trap 'rm -rf "$snap"' EXIT
( cd "$PKG" && find . -type f | sort | xargs shasum -a 256 ) > "$snap/before"
python3 tools/gen-clean-room-package.py >/dev/null 2>&1 || bad "the package generator failed"
( cd "$PKG" && find . -type f | sort | xargs shasum -a 256 ) > "$snap/after"
if cmp -s "$snap/before" "$snap/after"; then
  ok "package generation is deterministic (byte-identical on re-export)"
else
  bad "package generation is not deterministic"
  diff "$snap/before" "$snap/after" | head -6 | sed 's/^/      /'
fi

# ── 4. self-containment ────────────────────────────────────────────────────────────────────────────
unres=$(python3 -c "import json;print(json.load(open('$MAN'))['self_containment']['unresolved_count'])")
if [ "$unres" = "0" ]; then
  ok "self-containment holds: no unresolved reference escapes the package"
else
  bad "$unres unresolved reference(s) escape the package"
  python3 -c "
import json
for u in json.load(open('$MAN'))['self_containment']['unresolved']:
    print('      %s  <- %s' % (u['target'], ','.join(u['referenced_by'])))"
fi

# ── 5. nothing prohibited reached the package ──────────────────────────────────────────────────────
# Checked as PATHS, not as prose: the package manifest names these in its own exclusion list, and a
# guard that grepped the text would report the declaration of an exclusion as the thing excluded.
leak=0
for pat in 'engines/*' '*/ADR-*' '*/audit/*' 'tools/*' '.github/*'; do
  if find "$PKG" -path "$PKG/$pat" 2>/dev/null | grep -q .; then
    bad "prohibited material in the package: $pat"; leak=1
  fi
done
[ "$leak" -eq 0 ] && ok "no engines, decision records, audits or internal tooling in the package"

# ── 6. the required vector set is derived ──────────────────────────────────────────────────────────
python3 - <<'PY' || fail=1
import json
man = json.load(open('trials/banza-v1.0.0-l0-independent-trial-001/TRIAL_MANIFEST.json'))
reg = json.load(open('contracts/production/conformance-profiles.production.json'))
l0 = next(p for p in reg['profiles'] if p.get('level') == 'L0')
declared = [v['vector'] for v in man['required_vector_set']['vectors']]
if declared != list(l0['required_vectors']):
    print('  FAIL: the trial vector set diverges from the profile registry')
    print('      manifest: %s' % declared)
    print('      registry: %s' % l0['required_vectors'])
    raise SystemExit(1)
missing = [v['vector'] for v in man['required_vector_set']['vectors'] if not v.get('in_package')]
if missing:
    print('  FAIL: required vector not in the package: %s' % missing)
    raise SystemExit(1)
print('  ok: the required vector set is the profile registry\'s, and every vector is in the package')
PY

# ── self-test ──────────────────────────────────────────────────────────────────────────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp" "$snap"' EXIT
printf 'a\n' > "$tmp/x"; printf 'b\n' > "$tmp/y"
cmp -s "$tmp/x" "$tmp/y" && { echo "SELFTEST_FAIL: cmp did not detect a difference" >&2; exit 2; }

[ "$fail" -eq 0 ] || exit 1
echo "trial-target-integrity: OK — the target is deterministic, self-contained and cannot move silently"
