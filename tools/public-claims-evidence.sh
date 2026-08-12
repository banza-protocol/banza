#!/usr/bin/env bash
# BANZA — public technical claims evidence gate.
#
# Runs the executable evidence battery that backs the material public technical claims and rebuilds the
# hashed evidence bundle manifest (evidence/manifest.json) pinned to the current git commit. The evidence
# is only valid from a CLEAN working tree. This gate proves the claims that CAN be executed hermetically;
# the full claim classification lives in docs/verification/PUBLIC_TECHNICAL_CLAIMS_EVIDENCE.md +
# evidence/claims/claims-matrix.json.
set -euo pipefail
cd "$(dirname "$0")/.."

EV=evidence
mkdir -p "$EV"/{claims,test-results,security,federation,determinism}

fail=0
note() { printf '  %s\n' "$1"; }

# 1. Rust evidence-engine tests (the load-bearing trust/fetch/conformance/certification/OZ engines)
echo "== [1/4] Rust engine test battery =="
: > "$EV/test-results/rust-engine-tests.txt"
RUST_ENGINES="banza-artifact-fetcher banza-trust banza-conformance banza-certification banza-evidence-bundle banza-operator-manifest banza-l1-readiness banza-l2-readiness banza-l3-readiness banza-l4-readiness banza-target-registry banza-security-assurance banza-root-ceremony operator-zero-core operator-zero-e2e-root banzai-operator-journey banzai-evidence banza-reference-trust-model"
for c in $RUST_ENGINES; do
  echo "--- $c" >> "$EV/test-results/rust-engine-tests.txt"
  # strip the volatile "finished in Xs" so the committed evidence snapshot is deterministic
  ( cd "engines/$c" && cargo test --quiet 2>&1 | grep -E "test result|^error|panicked" | sed -E "s/; finished in [0-9.]+s//" ) >> "$EV/test-results/rust-engine-tests.txt" 2>&1 || fail=1
done
if grep -qE "^error|panicked|FAILED| failed" "$EV/test-results/rust-engine-tests.txt" && grep -qE "[1-9][0-9]* failed" "$EV/test-results/rust-engine-tests.txt"; then
  echo "  ✗ Rust engine tests reported failures"; fail=1
else
  PASS=$(grep -oE "test result: ok\. [0-9]+ passed" "$EV/test-results/rust-engine-tests.txt" | grep -oE "[0-9]+" | paste -sd+ - | bc 2>/dev/null || echo "?")
  note "ok: Rust engine tests green ($PASS passed, 0 failed)"
fi

# 2. Conformance vectors (offline) + federation runner (in-process banza-trust)
echo "== [2/4] Conformance + federation =="
CBIN=engines/banza-conformance/target/release/banza-conformance-rs
( cd engines/banza-conformance && cargo build --release --quiet ) 2>&1 | tail -1
"$CBIN" check-vectors > "$EV/test-results/conformance-vectors.json" 2>&1 && note "ok: conformance vectors validated" || { echo "  ✗ conformance vectors"; fail=1; }
"$CBIN" run-fed > "$EV/federation/federation-run.json" 2>&1
python3 - "$EV/federation/federation-run.json" <<'PY' || fail=1
import json,sys
d=json.load(open(sys.argv[1]))
t=d["totals"]
assert t["fail"]==0 and t["error"]==0 and t["pass"]>=7, f"federation runner not clean: {t}"
print(f"  ok: federation runner {t['pass']}/{t['total']} pass (INV-FEDEVAL-005 fecho-por-omissão)")
PY

# 2b. Committed federation fixtures executed as vectors (Track C) + drift audit
"$CBIN" run-fed-fixtures > "$EV/federation/federation-fixtures-run.json" 2>&1
python3 - "$EV/federation/federation-fixtures-run.json" <<'PY' || fail=1
import json,sys
d=json.load(open(sys.argv[1]))
t=d["report"]["totals"]
assert t["fail"]==0 and t["error"]==0, f"fixture runner not clean: {t}"
assert d["drift"]["clean"] and not d["drift"]["unreferenced_fixtures"], f"fixture drift: {d['drift']}"
print(f"  ok: {t['pass']}/{t['total']} committed federation fixtures executed as vectors; 0 drift")
PY

# 2c. Consolidated A→B multi-operator scenario executed end-to-end + independent replay (Track D)
"$CBIN" run-ab > "$EV/federation/federation-ab-scenario.json" 2>&1
python3 - "$EV/federation/federation-ab-scenario.json" <<'PY' || fail=1
import json,sys
d=json.load(open(sys.argv[1]))
assert d["pass"], "A→B scenario did not pass"
assert d["result"]["mutual_ote"]["routing_allowed"], "mutual OTE not ROUTING_ALLOWED"
negs=d["result"]["negatives"]
for k in ("revoked_peer_outcome","capability_mismatch_outcome","tampered_metadata_outcome"):
    assert negs[k]!="ROUTING_ALLOWED", f"negative {k} was routing-allowed; expected the fecho-por-omissão outcome"
assert d["replay"]["byte_identical"], "independent replay not byte-identical"
print(f"  ok: A→B end-to-end; mutual ROUTING_ALLOWED; negatives fecho-por-omissão; replay byte-identical ({d['replay']['result_sha256'][:12]})")
PY

# 2d. Federation Open Trust Evaluation — the positive ROUTING_ALLOWED path (Track A+B, 10/10 checks)
engines/banza-trust/target/release/banza-trust federation-ote-demo > "$EV/federation/federation-ote-routing-allowed.json" 2>&1 || true
( cd engines/banza-trust && cargo build --release --quiet ) 2>&1 | tail -1
engines/banza-trust/target/release/banza-trust federation-ote-demo > "$EV/federation/federation-ote-routing-allowed.json" 2>&1
python3 - "$EV/federation/federation-ote-routing-allowed.json" <<'PY' || fail=1
import json,sys
d=json.load(open(sys.argv[1]))
assert d["outcome"]=="ROUTING_ALLOWED", f"OTE outcome {d['outcome']}"
assert len(d["checks"])==10 and all(d["checks"].values()), "not all ten OTE checks passed"
print("  ok: federation OTE ROUTING_ALLOWED with all ten fecho-por-omissão checks (authenticated BRL)")
PY

# 3. Negative-test rosters (SSRF / Model-A / OZ e2e — the executed negative evidence)
echo "== [3/4] Negative-test rosters =="
{ echo "# Negative-test rosters (executed engine sources)"; echo;
  echo "## SSRF/fetcher (banza-artifact-fetcher/tests/fetch_pipeline.rs)"; grep -oE "fn [a-z0-9_]+" engines/banza-artifact-fetcher/tests/fetch_pipeline.rs | sed 's/fn /- /';
  echo; echo "## Trust Model A (banza-trust/tests/signing_chain.rs)"; grep -oE "fn [a-z0-9_]+" engines/banza-trust/tests/signing_chain.rs | sed 's/fn /- /';
  echo; echo "## Operator Zero e2e (operator-zero-e2e-root/tests/e2e_root.rs)"; grep -oE "fn [a-z0-9_]+" engines/operator-zero-e2e-root/tests/e2e_root.rs | sed 's/fn /- /';
} > "$EV/security/negative-test-rosters.md"
note "ok: negative-test rosters captured"

# 4. Rebuild the hashed manifest (commit-pinned; secrets-audited)
echo "== [4/4] Bundle manifest =="
if grep -rqE "BEGIN [A-Z ]*PRIVATE KEY|-----BEGIN (RSA|EC|OPENSSH)" "$EV" 2>/dev/null; then
  echo "  ✗ SECRET MATERIAL in the evidence bundle — refusing to write manifest"; exit 1; fi
python3 - <<'PY' || fail=1
import json, subprocess, hashlib, os
commit=subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
claims=json.load(open('evidence/claims/claims-matrix.json'))
from collections import Counter
m={"artifact":"BANZA public technical claims — evidence bundle","git_commit":commit,
   "note": "Evidence generated by running the battery against the committed engine code at git_commit; the manifest is the only artifact written after generation.","protocol_version":"1.0","scope":"reference implementation / pre-production",
   "engines":{"banza-trust":"0.1.0","banza-conformance":"0.1.0"},
   "claim_totals":{"total":len(claims),**{k:v for k,v in Counter(c['status'] for c in claims).items()}},
   "load_bearing":sum(1 for c in claims if c.get('load_bearing')),"files":{}}
for root,_,fs in os.walk('evidence'):
    for f in fs:
        if f=='manifest.json': continue
        p=os.path.join(root,f); m["files"][os.path.relpath(p,'evidence')]=hashlib.sha256(open(p,'rb').read()).hexdigest()
json.dump(m,open('evidence/manifest.json','w'),ensure_ascii=False,indent=2)
print(f"  ok: manifest pinned to {commit[:12]}; {m['claim_totals']['total']} claims, {m['load_bearing']} load-bearing")
PY

echo
[ "$fail" -eq 0 ] && echo "public-claims-evidence: ✓ executable evidence battery green; bundle manifest rebuilt" \
                  || { echo "public-claims-evidence: ✗ FAIL"; exit 1; }
