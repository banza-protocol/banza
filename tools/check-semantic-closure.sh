#!/usr/bin/env bash
#
# Self-containment is not enough.
#
# The L0 clean-room package was self-contained in the only sense anyone had checked: every reference it
# included resolved. It also contained no root trust plane at all — the entire Root Authority Set, the
# Key Manifest contract and the succession vectors were absent, because the package is built from profile
# closures and those artifacts are correctly classified as non-profile. "Not scoped to a profile" had
# silently become "not in any package", and the delete-the-reference gate could not see it: that gate
# checks that what is present resolves, never that what matters is present.
#
# Semantic closure is the missing half:
#
#     globally required  ∪  profile required  ∪  transitive normative dependencies
#
# Properties:
#   1. every GLOBAL required artifact is in the package
#   2. every profile-required artifact for that profile is in the package
#   3. every normative dependency reachable from an included artifact is included
#   4. nothing internal leaks in (engines, decision records, the assistant)
#   5. no rule an implementer needs exists only outside the package
#
# Exit 1 on violation. Exit 2 if the self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== semantic-closure =="

check() {
  python3 - "$1" <<'PY'
import json, os, re, sys

root = sys.argv[1]
bad = []

closure_path = os.path.join(root, 'assurance/semantic-closure.json')
if not os.path.exists(closure_path):
    print('  FAIL: assurance/semantic-closure.json is missing — nothing declares what is globally required')
    sys.exit(1)
spec = json.load(open(closure_path, encoding='utf8'))
globals_required = spec.get('global_required', [])
declared_pointers = {p['path'] for p in spec.get('out_of_profile_pointers', {}).get('pointers', [])}

pkg_root = os.path.join(root, 'clean-room/packages')
if not os.path.isdir(pkg_root):
    print('  ok: no clean-room package built; nothing to close over')
    sys.exit(0)

for level in sorted(os.listdir(pkg_root)):
    pkg = os.path.join(pkg_root, level)
    if not os.path.isdir(pkg):
        continue
    present = set()
    for dp, _, fs in os.walk(pkg):
        for f in fs:
            present.add(os.path.relpath(os.path.join(dp, f), pkg))

    # 1 — every globally required artifact.
    for entry in globals_required:
        p = entry['path'] if isinstance(entry, dict) else entry
        if p not in present:
            why = entry.get('why', '') if isinstance(entry, dict) else ''
            bad.append(f'{level}: GLOBAL required artifact missing: {p} ({why})')

    # 2 — profile-required artifacts, taken from the implementation sets rather than restated here.
    sets_path = os.path.join(root, 'docs/derived/implementation-sets.json')
    if os.path.exists(sets_path):
        sets = json.load(open(sets_path, encoding='utf8'))
        for s in sets.get('implementation_sets', []):
            if s.get('level', '').lower() != level.lower():
                continue
            for p in s.get('transitive_normative_closure', []):
                if p not in present:
                    bad.append(f'{level}: profile-required artifact missing: {p}')

    # 3 — every normative dependency reachable from an included artifact must itself be included.
    #     A relative link from an included document to a repository path that is normative, but absent
    #     from the package, is a rule the implementer cannot reach.
    for rel in sorted(present):
        if not rel.endswith(('.md', '.json')):
            continue
        body = open(os.path.join(pkg, rel), encoding='utf8', errors='replace').read()
        for m in re.finditer(r'\]\(([^)#\s]+\.(?:md|json))[^)]*\)', body):
            target = m.group(1)
            if target.startswith(('http://', 'https://')):
                continue
            resolved = os.path.normpath(os.path.join(os.path.dirname(rel), target))
            if resolved in present:
                continue
            # Only NORMATIVE targets matter: a link to a guide or a record is out of scope by design.
            if not resolved.startswith(('spec/', 'contracts/', 'conformance/')):
                continue
            # A pointer at material this profile does not require is legitimate — but only when it is a
            # DECLARED decision. An undeclared one is the L0 gap repeating itself.
            if resolved in declared_pointers:
                continue
            bad.append(f'{level}: {rel} depends on {resolved}, which is neither included nor a declared out-of-profile pointer')

    # 4 — nothing internal leaked in.
    for forbidden in ('engines/', 'decisions/', 'services/', 'website/', 'docs/audit/'):
        leaked = [p for p in present if p.startswith(forbidden)]
        if leaked:
            bad.append(f'{level}: internal material leaked into the package: {leaked[:3]}')

    print(f'  ok: {level} — {len(present)} files, {len(globals_required)} global required artifacts present')

for b in bad:
    print(f'  FAIL: {b}')
if bad:
    sys.exit(1)
PY
}

selftest() {
  local d st=0 g b base
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  for base in "$g" "$b"; do
    mkdir -p "$base/assurance" "$base/clean-room/packages/l0/spec" "$base/clean-room/packages/l0/contracts"
    cat > "$base/assurance/semantic-closure.json" <<'EOF'
{"global_required":[{"path":"spec/root-authority-set.md","why":"the root trust plane is required by every profile"}]}
EOF
    printf '# Root Authority Set\n' > "$base/clean-room/packages/l0/spec/root-authority-set.md"
  done
  # the bad tree drops the global artifact — exactly the L0 defect
  rm -f "$b/clean-room/packages/l0/spec/root-authority-set.md"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: a closed package was rejected" >&2; st=1; }
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a missing global artifact was accepted" >&2; st=1; }
  # and a leaked engine
  printf '# Root Authority Set\n' > "$b/clean-room/packages/l0/spec/root-authority-set.md"
  mkdir -p "$b/clean-room/packages/l0/engines/x"; printf 'fn main(){}\n' > "$b/clean-room/packages/l0/engines/x/main.rs"
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: leaked internal material was accepted" >&2; st=1; }
  return $st
}

if ! selftest; then echo "semantic-closure: guard self-test broken"; exit 2; fi
check "$PWD" || exit 1
echo "semantic-closure: OK — global ∪ profile ∪ transitive, and nothing internal leaked"
