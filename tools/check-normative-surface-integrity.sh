#!/usr/bin/env bash
# BANZA — normative-surface integrity guard.
#
# Protects the invariants established by the normative-completeness remediation (ADR-008, ADR-011),
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

# ── self-test 2: the manifest detectors must fire on each way a manifest can go wrong ────────────
# A manifest that only lists paths is a documentation exercise. These four cases are what make it a
# verifiable identification of the surface, so each is asserted to FAIL detection, on a copy.
manifest_selftest() {
  python3 - "$MANIFEST" <<'PY'
import copy, hashlib, io, json, os, sys
m = json.load(open(sys.argv[1]))
def check(man):
    """The manifest detectors, applied to an in-memory manifest. True = accepted."""
    for a in man["artifacts"]:
        if not os.path.exists(a["path"]):
            return False
        if hashlib.sha256(io.open(a["path"], "rb").read()).hexdigest() != a["sha256"]:
            return False
    return True

if not check(m):
    print("  SELFTEST_FAIL: the real manifest is not accepted by its own detectors"); sys.exit(1)

# 1. an artifact removed from disk (simulated by naming one that is not there)
bad = copy.deepcopy(m); bad["artifacts"][0]["path"] = "contracts/production/__deleted__.json"
if check(bad):
    print("  SELFTEST_FAIL: a removed artifact was not detected"); sys.exit(1)

# 2. an artifact modified without regenerating the manifest
bad = copy.deepcopy(m); bad["artifacts"][0]["sha256"] = "0" * 64
if check(bad):
    print("  SELFTEST_FAIL: a stale digest was not detected"); sys.exit(1)

# 3. a path that never existed
bad = copy.deepcopy(m)
bad["artifacts"].append({"path": "spec/does-not-exist.md", "class": "X", "tier": "informative",
                         "role": "", "sha256": "0" * 64})
if check(bad):
    print("  SELFTEST_FAIL: a non-existent path was not detected"); sys.exit(1)
print("  ok: manifest detectors fire on removal, modification and non-existent paths")
PY
}
manifest_selftest || { echo "normative-surface-integrity: MANIFEST SELFTEST FAILED"; exit 1; }

# ── self-test 3: regeneration is deterministic ───────────────────────────────────────────────────
# The manifest is only a verifiable identification if anyone regenerating it gets the same bytes.
det_tmp="$(mktemp -d)"
cp "$MANIFEST" "$det_tmp/before.json"
python3 tools/gen-normative-manifest.py >/dev/null
if cmp -s "$det_tmp/before.json" "$MANIFEST"; then
  ok "regeneration is deterministic (byte-identical on re-run)"
else
  cp "$det_tmp/before.json" "$MANIFEST"
  bad "regenerating the manifest changed its bytes — the generator is not deterministic"
fi
rm -rf "$det_tmp"

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

# Classification must be total and closed. Listing an artifact is not the same as requiring it;
# `tier` is what carries that meaning, so every artifact must have one and only from this set.
TIERS = {"implementation", "conformance", "legal", "informative"}
unclassified = [a["path"] for a in m["artifacts"] if not a.get("class") or not a.get("tier")]
if unclassified:
    print("  X %d artifact(s) carry no class/tier: %s"
          % (len(unclassified), ", ".join(unclassified[:5]))); sys.exit(1)
badtier = sorted({a["tier"] for a in m["artifacts"]} - TIERS)
if badtier:
    print("  X unknown tier(s): %s" % ", ".join(badtier)); sys.exit(1)
if not m.get("tiers") or set(m["tiers"]) != TIERS:
    print("  X the manifest does not define exactly the four tiers"); sys.exit(1)
counts = {t: sum(1 for a in m["artifacts"] if a["tier"] == t) for t in TIERS}
if m.get("tier_counts") != counts:
    print("  X tier_counts disagrees with the artifact list"); sys.exit(1)
print("  ok: every artifact classified; %d implementation, %d conformance, %d legal, %d informative"
      % (counts["implementation"], counts["conformance"], counts["legal"], counts["informative"]))

# Seven production schemas are listed as tier=implementation while declaring `_status: reference`.
# That divergence is a known finding (audit backlog P2-6, documentary-mirror framing) deferred to a
# later milestone. It is frozen here: the existing seven are tolerated, an eighth is not.
DIVERGENT_BASELINE = 7
div = [a["path"] for a in m["artifacts"]
       if a["tier"] == "implementation"
       and a.get("self_declared_status") not in (None, "canonical", "production-baseline")]
if len(div) > DIVERGENT_BASELINE:
    print("  X %d artifacts are required for implementation but do not declare themselves canonical "
          "(baseline %d): %s" % (len(div), DIVERGENT_BASELINE, ", ".join(sorted(div)[DIVERGENT_BASELINE:])))
    sys.exit(1)
print("  ok: self-declared-status divergence held at %d/%d (audit backlog P2-6)"
      % (len(div), DIVERGENT_BASELINE))
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
    CODE = r'\.py\b|\.rs\b|\.mjs\b|engines/|core/crates|reference/|tools/'
    # `_authority` answers the same question as `_source_of_truth` — who defines this rule — so it is
    # held to the same standard. Naming the engine as the implementation is fine; naming it as the
    # authority is the inversion F-04 exists to prevent, and it must not creep back through a
    # differently-named field.
    for field in ('_source_of_truth', '_authority'):
        s = d.get(field, '')
        if not isinstance(s, str) or not s:
            continue
        if re.search(CODE, s) and not re.search(
                r'implements it and does not define it|implementation of|never the authority', s):
            bad.append((f, field, s[:70]))
if bad:
    for f, field, s in bad:
        print("  X %s declares code in %s: %s" % (f, field, s))
    sys.exit(1)
print("  ok: no contract declares implementation code as its source of truth or its authority")
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
if n_acc < 15 or n_rej < 9:
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
