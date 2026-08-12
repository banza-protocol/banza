#!/usr/bin/env bash
# BANZA — normative-surface integrity guard.
#
# Protects the invariants established by the normative-completeness remediation (ADR-081, ADR-082),
# which close audit findings F-01 (P0), F-02, F-03 and F-04:
#
#   1. The normative manifest exists, is well formed, and every path it lists exists.
#   2. No contract declares implementation code as its source of truth.
#   3. The canonicalization specification and its public vectors exist and are wired to the version.
#   4. The BCP 14 keyword convention is declared.
#   5. The manifest does not claim reference-implementation code as normative.
#
# Discovery-only guard: it reads, it never writes. A failure means the published surface has drifted
# back towards depending on the reference implementation.
set -euo pipefail
cd "$(dirname "$0")/.."

MANIFEST=contracts/production/normative-manifest.json
CANON_SPEC=spec/canonicalization.md
CANON_VECTORS=conformance/vectors/canonicalization.json
VERSION=contracts/production/protocol-version.json

fail=0
ok()  { printf '  ok: %s\n' "$1"; }
bad() { printf '  X %s\n' "$1"; fail=1; }

echo "== normative-surface-integrity =="

# ── self-test: the detectors must catch synthetic violations ─────────────────────────────────────
selftest() {
  local d
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  # A synthetic contract that points at implementation code: the detector MUST reject it (exit 1).
  printf '{"_source_of_truth":"engines/banza-trust/src/lib.rs"}' > "$d/bad.json"
  if python3 - "$d/bad.json" <<'PY'
import json, sys, re
s = json.load(open(sys.argv[1])).get('_source_of_truth', '')
sys.exit(1 if re.search(r'\.py\b|\.rs\b|\.mjs\b|engines/|core/crates|reference/|tools/', s) else 0)
PY
  then
    echo "  SELFTEST_FAIL: code-source detector did not fire on a code source_of_truth"
    return 1
  fi
  # A clean contract: the detector MUST accept it (exit 0).
  printf '{"_source_of_truth":"This contract."}' > "$d/good.json"
  if ! python3 - "$d/good.json" <<'PY'
import json, sys, re
s = json.load(open(sys.argv[1])).get('_source_of_truth', '')
sys.exit(1 if re.search(r'\.py\b|\.rs\b|\.mjs\b|engines/|core/crates|reference/|tools/', s) else 0)
PY
  then
    echo "  SELFTEST_FAIL: code-source detector fired on a clean source_of_truth"
    return 1
  fi
  return 0
}
selftest || { echo "normative-surface-integrity: SELFTEST FAILED"; exit 1; }

# ── 1. manifest exists, parses, and every listed path exists ─────────────────────────────────────
if [ ! -f "$MANIFEST" ]; then
  bad "normative manifest missing ($MANIFEST) — the normative surface is unidentifiable (F-02)"
else
  python3 - "$MANIFEST" <<'PY' || fail=1
import hashlib, io, json, os, sys
m = json.load(open(sys.argv[1]))
missing = [a["path"] for a in m["artifacts"] if not os.path.exists(a["path"])]
if missing:
    print("  X %d manifest path(s) do not exist: %s" % (len(missing), ", ".join(missing[:5])))
    sys.exit(1)
# The manifest asserts a digest for every artifact. A stale digest is worse than none: it would let a
# normative artifact change without the manifest that identifies it noticing. Regenerate with
# `make normative-manifest` (tools/gen-normative-manifest.py) after changing any listed artifact.
drifted = [a["path"] for a in m["artifacts"]
           if hashlib.sha256(io.open(a["path"], "rb").read()).hexdigest() != a["sha256"]]
if drifted:
    print("  X %d manifest digest(s) stale — run `make normative-manifest`: %s"
          % (len(drifted), ", ".join(drifted[:5])))
    sys.exit(1)
if any(a["path"].endswith("normative-manifest.json") for a in m["artifacts"]):
    print("  X the manifest lists itself; its own digest cannot be self-consistent"); sys.exit(1)
print("  ok: every manifest digest matches the artifact on disk")
code = [a["path"] for a in m["artifacts"]
        if a["path"].startswith(("engines/", "services/", "website/", "tools/"))]
if code:
    print("  X manifest lists implementation code as normative: %s" % ", ".join(code[:5]))
    sys.exit(1)
print("  ok: normative manifest lists %d artifacts, all present, none of them code" % len(m["artifacts"]))
for k in ("protocol_version", "canonicalization", "normative_keywords", "precedence", "not_normative"):
    if k not in m:
        print("  X manifest missing required key: %s" % k); sys.exit(1)
print("  ok: manifest declares version %s, canonicalization %s, precedence and exclusions"
      % (m["protocol_version"], m["canonicalization"]))
PY
fi

# ── 2. no contract may declare implementation code as its source of truth (F-04) ─────────────────
python3 - <<'PY' || fail=1
import json, glob, re, sys
bad = []
for f in glob.glob('contracts/**/*.json', recursive=True):
    try:
        d = json.load(open(f))
    except Exception:
        continue
    if not isinstance(d, dict):
        continue
    s = d.get('_source_of_truth', '')
    if s and re.search(r'\.py\b|\.rs\b|\.mjs\b|engines/|core/crates|reference/|tools/', s):
        bad.append((f, s[:70]))
if bad:
    for f, s in bad:
        print("  X %s declares code as its source of truth: %s" % (f, s))
    sys.exit(1)
print("  ok: no contract declares implementation code as its source of truth")
PY

# ── 3. canonicalization specification, vectors and wiring ────────────────────────────────────────
[ -f "$CANON_SPEC" ] && ok "canonicalization specification present ($CANON_SPEC)" \
  || bad "canonicalization specification missing — F-01 (P0) would be reopened"
[ -f "$CANON_VECTORS" ] && ok "canonicalization vectors present ($CANON_VECTORS)" \
  || bad "canonicalization vectors missing"

python3 - "$VERSION" "$CANON_VECTORS" <<'PY' || fail=1
import json, sys
v = json.load(open(sys.argv[1]))
c = v.get("canonicalization")
if not isinstance(c, dict) or c.get("id") != "BCJ/1":
    print("  X protocol-version.json does not declare the canonicalization in force"); sys.exit(1)
if v.get("normative_manifest") != "contracts/production/normative-manifest.json":
    print("  X protocol-version.json does not point at the normative manifest"); sys.exit(1)
vec = json.load(open(sys.argv[2]))
if vec.get("canonicalization") != "BCJ/1":
    print("  X vectors declare a different canonicalization than the version in force"); sys.exit(1)
n_acc = sum(1 for x in vec["vectors"] if x["expect"] == "accept")
n_rej = sum(1 for x in vec["vectors"] if x["expect"] == "reject")
if n_acc < 10 or n_rej < 4:
    print("  X canonicalization vector coverage too thin (%d accept, %d reject)" % (n_acc, n_rej))
    sys.exit(1)
print("  ok: version declares BCJ/1 + manifest; vectors cover %d accept / %d reject" % (n_acc, n_rej))
PY

# ── 4. BCP 14 convention declared (F-03) ─────────────────────────────────────────────────────────
if grep -q "BCP 14" contracts/README.md && grep -q "BCP 14" "$CANON_SPEC"; then
  ok "BCP 14 normative-keyword convention declared"
else
  bad "BCP 14 convention not declared — MUST/SHALL carry no established meaning (F-03)"
fi

if [ "$fail" -ne 0 ]; then
  echo "normative-surface-integrity: FAIL"
  exit 1
fi
echo "normative-surface-integrity: OK — surface identifiable, self-sufficient and free of code-as-authority"
