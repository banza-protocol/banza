#!/usr/bin/env bash
#
# BanzAI is auxiliary, and must stay auxiliary.
#
# The risk is not that someone declares BanzAI normative. It is that a verification path acquires a
# dependency on it by convenience — an engine importing it, a normative artifact naming it as a required
# step, or a validity decision routed through a language model when the deterministic path is unsure.
# Each would make an optional component required, and a protocol whose correctness depends on a model is
# a protocol whose correctness cannot be independently reproduced.
#
# Properties:
#   1. no Rust protocol engine depends on the BanzAI service or its crates
#   2. no artifact on the normative surface requires BanzAI to reach a decision
#   3. the assurance registry classifies BanzAI as auxiliary, with an outage row that says so
#
# Exit 1 on violation. Exit 2 if the self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== banzai-outside-critical-path =="

check() {
  local root="$1" bad=0 f
  # 1 — protocol engines must not depend on BanzAI. The BanzAI engines themselves are excluded by name:
  #     banzai-* IS the assistant, and depending on itself is not a critical-path leak.
  for f in "$root"/engines/*/Cargo.toml; do
    [ -f "$f" ] || continue
    case "$(basename "$(dirname "$f")")" in banzai-*) continue ;; esac
    if grep -qE '^\s*banzai[-_]' "$f" 2>/dev/null; then
      echo "  FAIL: $(basename "$(dirname "$f")") depends on a BanzAI crate; verification would need the assistant"
      bad=1
    fi
  done

  # 2 — no normative artifact may require BanzAI. Mentioning it as a non-authority is fine and expected;
  #     REQUIRING it is not. The distinction is the verb, so the check reads the manifest's own list of
  #     required artifacts rather than grepping prose.
  python3 - "$root" <<'PY' || bad=1
import json, os, re, sys
root = sys.argv[1]
mpath = os.path.join(root, 'contracts/production/normative-manifest.json')
if not os.path.exists(mpath):
    sys.exit(0)
m = json.load(open(mpath, encoding='utf8'))
bad = 0
for a in m.get('artifacts', []):
    if a.get('tier') != 'implementation':
        continue
    p = os.path.join(root, a['path'])
    if not os.path.exists(p):
        continue
    body = open(p, encoding='utf8', errors='replace').read()
    # A REQUIRING construction: BanzAI named inside a normative obligation.
    for mm in re.finditer(r'[^.\n]*\bBanzAI\b[^.\n]*[.\n]', body):
        s = mm.group(0)
        if re.search(r'\b(MUST|SHALL|REQUIRED)\b', s) and not re.search(r'\b(MUST NOT|SHALL NOT|never|não)\b', s):
            print(f"  FAIL: {a['path']} places BanzAI inside a normative obligation: {s.strip()[:110]}")
            bad = 1
sys.exit(bad)
PY

  # 3 — the assurance registry must carry the outage row that states the containment.
  if [ -f "$root/assurance/resilience-matrix.json" ]; then
    python3 - "$root" <<'PY' || bad=1
import json, sys
d = json.load(open(sys.argv[1] + '/assurance/resilience-matrix.json', encoding='utf8'))
row = next((r for r in d.get('rows', []) if r.get('id') == 'banzai_outage'), None)
if not row:
    print('  FAIL: the resilience matrix has no banzai_outage row'); sys.exit(1)
if 'unaffected' not in row.get('safe_behaviour', ''):
    print('  FAIL: the banzai_outage row does not state that the protocol core is unaffected'); sys.exit(1)
PY
  fi
  return $bad
}

selftest() {
  local d st=0 g b
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  for base in "$g" "$b"; do
    mkdir -p "$base/engines/banza-trust" "$base/assurance"
    printf '[package]\nname="banza-trust"\n[dependencies]\nserde="1"\n' > "$base/engines/banza-trust/Cargo.toml"
    cat > "$base/assurance/resilience-matrix.json" <<'EOF'
{"rows":[{"id":"banzai_outage","safe_behaviour":"the protocol core is unaffected"}]}
EOF
  done
  printf '[package]\nname="banza-trust"\n[dependencies]\nbanzai-query-core={path="../x"}\n' > "$b/engines/banza-trust/Cargo.toml"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: a clean tree was rejected" >&2; st=1; }
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an engine depending on BanzAI was accepted" >&2; st=1; }
  return $st
}

if ! selftest; then echo "banzai-outside-critical-path: guard self-test broken"; exit 2; fi
check "$PWD" || exit 1
echo "  ok: no protocol engine depends on BanzAI; no normative artifact requires it; the outage row states the containment"
echo "banzai-outside-critical-path: OK — auxiliary, and still auxiliary"
