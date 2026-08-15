#!/usr/bin/env bash
#
# One protocol version, declared in one place.
#
# The Root Authority milestone found `protocol_version` written as a literal in four engines, and one of
# them ALSO wrote its major as "1." — so a bumped constant would still have accepted the previous major's
# documents. A version restated in N places is a version that will disagree with itself in N-1 of them.
#
# This guard protects three properties:
#
#   1. `contracts/production/protocol-version.json` is the single source; every engine that names a
#      version agrees with it
#   2. no current/normative surface declares a version the contract does not
#   3. major-version compatibility is DERIVED, never written as a literal prefix
#
# Historical evidence is out of scope by construction: a recorded run legitimately carries the version it
# ran under, and rewriting it to match today would falsify the record. Those paths are listed and
# reported, never edited.
#
# Exit 1 on violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== protocol-version-consistency =="

CONTRACT=contracts/production/protocol-version.json

# Paths whose version strings record what WAS true for a past run, not what is true now.
HISTORICAL=(
  'evidence/'
  'artifacts/banzai/'
  'docs/audit/'
  'clean-room/questions.jsonl'
  'services/banzai-api/eval/'
  'engines/banzai-query-core/src/repoindex/'
  'engines/banzai-query-core/src/doc-index.json'
)

check() {
  local root="$1"
  python3 - "$root" "${HISTORICAL[@]}" <<'PY'
import json, os, re, sys

root = sys.argv[1]
historical = tuple(sys.argv[2:])
bad = []

contract = os.path.join(root, 'contracts/production/protocol-version.json')
declared = json.load(open(contract, encoding='utf8'))['protocol_version']
major = declared.split('.')[0]

# 1 — every engine constant agrees with the contract.
const = re.compile(r'pub const PROTOCOL_VERSION:\s*&str\s*=\s*"([^"]+)"')
engines = 0
for dirpath, _, files in os.walk(os.path.join(root, 'engines')):
    if '/target' in dirpath:
        continue
    for f in files:
        if not f.endswith('.rs'):
            continue
        p = os.path.join(dirpath, f)
        for m in const.finditer(open(p, encoding='utf8', errors='replace').read()):
            engines += 1
            if m.group(1) != declared:
                bad.append(f"{os.path.relpath(p, root)} declares {m.group(1)}, the contract declares {declared}")

# 2 — no current surface declares a different protocol version.
#     `since_protocol_version` records when a capability appeared and is deliberately not checked.
member = re.compile(r'"protocol_version"\s*:\s*"([0-9]+\.[0-9]+\.[0-9]+)"')
scanned = skipped = 0
for sub in ('contracts', 'conformance/vectors', 'spec', 'docs/derived'):
    base = os.path.join(root, sub)
    for dirpath, _, files in os.walk(base):
        for f in files:
            if not f.endswith(('.json', '.md')):
                continue
            p = os.path.join(dirpath, f)
            rel = os.path.relpath(p, root)
            if rel.startswith(historical):
                skipped += 1
                continue
            body = open(p, encoding='utf8', errors='replace').read()
            if f.endswith('.json'):
                # Structural walk: a NEGATIVE fixture may legitimately carry an incompatible version,
                # but only where the surrounding case says that is what it is. A text window around the
                # match is not enough — a large `input` object pushes the case's own label out of range,
                # which is exactly how this check first mis-fired.
                try:
                    doc = json.loads(body)
                except ValueError:
                    doc = None
                if doc is not None:
                    def walk(node, negative):
                        global scanned
                        if isinstance(node, dict):
                            marker = ' '.join(
                                str(v) for k, v in node.items()
                                if k in ('key', 'id', 'label', 'title', 'expected', 'expect', '_note')
                            ).lower()
                            here = negative or 'incompatible' in marker
                            pv = node.get('protocol_version')
                            if isinstance(pv, str) and re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', pv):
                                scanned += 1
                                if pv != declared and not here:
                                    bad.append(f"{rel} declares protocol_version {pv}; the contract declares {declared}")
                            for v in node.values():
                                walk(v, here)
                        elif isinstance(node, list):
                            for v in node:
                                walk(v, negative)
                    walk(doc, False)
                    continue
            for m in member.finditer(body):
                scanned += 1
                if m.group(1) == declared:
                    continue
                bad.append(f"{rel} declares protocol_version {m.group(1)}; the contract declares {declared}")

# 3 — the major must not be written as a literal prefix anywhere a compatibility decision is made.
literal_major = re.compile(r'starts_with\("' + re.escape(major) + r'\."\)')
for dirpath, _, files in os.walk(os.path.join(root, 'engines')):
    if '/target' in dirpath:
        continue
    for f in files:
        if not f.endswith('.rs'):
            continue
        p = os.path.join(dirpath, f)
        if literal_major.search(open(p, encoding='utf8', errors='replace').read()):
            bad.append(f"{os.path.relpath(p, root)} hardcodes the major as a literal prefix; derive it from PROTOCOL_VERSION")

for b in bad:
    print(f"  FAIL: {b}")
if bad:
    sys.exit(1)
print(f"  ok: protocol_version = {declared} — {engines} engine constants agree, "
      f"{scanned} declarations on the current surface agree, major derived not hardcoded")
print(f"  note: {skipped} historical-evidence paths carry the version of the run that produced them, by design")
PY
}

# ── self-test: each property must actually fail when violated ────────────────────────────────────────
selftest() {
  local d st=0 g b base
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  for base in "$g" "$b"; do
    mkdir -p "$base/contracts/production" "$base/engines/e/src" "$base/conformance/vectors" "$base/spec" "$base/docs/derived"
    printf '{"protocol_version": "1.0.0"}\n' > "$base/contracts/production/protocol-version.json"
    printf 'pub const PROTOCOL_VERSION: &str = "1.0.0";\n' > "$base/engines/e/src/lib.rs"
    printf '{"protocol_version": "1.0.0"}\n' > "$base/conformance/vectors/v.json"
  done
  # the bad tree drifts one engine constant away from the contract
  printf 'pub const PROTOCOL_VERSION: &str = "2.0.0";\n' > "$b/engines/e/src/lib.rs"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: a consistent tree was rejected" >&2; st=1; }
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: engine drift was accepted" >&2; st=1; }
  # and a stale declaration on the current surface
  printf 'pub const PROTOCOL_VERSION: &str = "1.0.0";\n' > "$b/engines/e/src/lib.rs"
  printf '{"protocol_version": "2.0.0"}\n' > "$b/conformance/vectors/v.json"
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a stale surface declaration was accepted" >&2; st=1; }
  # and a hardcoded major
  printf '{"protocol_version": "1.0.0"}\n' > "$b/conformance/vectors/v.json"
  printf 'pub const PROTOCOL_VERSION: &str = "1.0.0";\nfn c(pv:&str)->bool{ pv.starts_with("1.") }\n' > "$b/engines/e/src/lib.rs"
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a hardcoded major was accepted" >&2; st=1; }
  return $st
}

if ! selftest; then echo "protocol-version-consistency: guard self-test broken"; exit 2; fi

check "$PWD" || exit 1
echo "protocol-version-consistency: OK — one version, one source, major derived"
