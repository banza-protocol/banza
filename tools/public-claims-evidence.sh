#!/usr/bin/env bash
# BANZA — public technical claims evidence gate.
#
# Runs the executable evidence battery that backs the material public technical claims and rebuilds the
# hashed evidence bundle manifest (evidence/manifest.json) pinned to the current git commit. The evidence
# is only valid from a CLEAN working tree. This gate proves the claims that CAN be executed hermetically;
# the full claim classification lives in docs/verification/PUBLIC_TECHNICAL_CLAIMS_EVIDENCE.md +
# evidence/claims/claims-matrix.json.
#
# TWO MODES, AND THE DEFAULT IS THE SAFE ONE.
#
#   --generate   run the battery and WRITE the tracked bundle. A deliberate act, after the sources
#                legitimately change.
#   (no flag)    run the battery into a temporary tree and COMPARE it against the tracked bundle.
#                Writes nothing tracked. This is what CI runs.
#
# The default used to be --generate, and the required CI context ran it. A stale or tampered tracked
# manifest was therefore overwritten by the very command meant to check it, and the gate went green:
# a corrupted digest was silently repaired and the context reported success. A check that repairs what
# it inspects proves nothing about the tracked state, so the default is now the observer.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=check
case "${1:-}" in
  --generate) MODE=generate ;;
  --check|"") MODE=check ;;
  *) echo "usage: $0 [--generate|--check]" >&2; exit 2 ;;
esac

TRACKED=evidence
if [ "$MODE" = generate ]; then
  EV="$TRACKED"
else
  # The curated files under evidence/ are inputs, not outputs — the battery overwrites only some of
  # them. Seeding the temporary tree from the tracked one lets a fresh run be compared like for like.
  EV="$(mktemp -d)"
  trap 'rm -rf "$EV"' EXIT
  cp -R "$TRACKED"/. "$EV"/
fi
mkdir -p "$EV"/{claims,test-results,security,federation,determinism}

# Snapshot of tracked evidence before anything runs, so the purity assertion at the end can tell
# "the tree was already dirty" from "this command dirtied it".
DIRTY_BEFORE="$(git status --porcelain -- "$TRACKED" 2>/dev/null | grep -v '^??' || true)"

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
MODE="$MODE" EV="$EV" TRACKED="$TRACKED" python3 - <<'PY' || fail=1
import json, subprocess, hashlib, os, sys
mode, ev, tracked = os.environ['MODE'], os.environ['EV'], os.environ['TRACKED']
commit=subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
claims=json.load(open(os.path.join(ev,'claims','claims-matrix.json')))
from collections import Counter

def build(root, git_commit):
    m={"artifact":"BANZA public technical claims — evidence bundle","git_commit":git_commit,
       "note": "Evidence generated by running the battery against the committed engine code at git_commit; the manifest is the only artifact written after generation.","protocol_version":"1.0","scope":"reference implementation / pre-production",
       "engines":{"banza-trust":"0.1.0","banza-conformance":"0.1.0"},
       "claim_totals":{"total":len(claims),**{k:v for k,v in Counter(c['status'] for c in claims).items()}},
       "load_bearing":sum(1 for c in claims if c.get('load_bearing')),"files":{}}
    for dirpath,_,fs in os.walk(root):
        for f in fs:
            if f=='manifest.json': continue
            p=os.path.join(dirpath,f)
            m["files"][os.path.relpath(p,root)]=hashlib.sha256(open(p,'rb').read()).hexdigest()
    return m

if mode=='generate':
    m=build(ev, commit)
    json.dump(m,open(os.path.join(ev,'manifest.json'),'w'),ensure_ascii=False,indent=2)
    print(f"  ok: manifest pinned to {commit[:12]}; {m['claim_totals']['total']} claims, {m['load_bearing']} load-bearing")
    sys.exit(0)

# ── verification ────────────────────────────────────────────────────────────────────────────────
# Compare what a fresh run produces against what is committed. git_commit is provenance — it records
# where the bundle was generated — so it is required to be a real commit but not required to equal
# HEAD; demanding equality would make every subsequent commit fail for no integrity reason. The
# binding that matters is the file digests: if an evidence file changed, the bundle must have been
# regenerated, and this is what detects that it was not.
fresh=build(ev, commit)
tracked_manifest=os.path.join(tracked,'manifest.json')
if not os.path.exists(tracked_manifest):
    print("  FAIL: %s does not exist — the bundle was never generated" % tracked_manifest); sys.exit(1)
have=json.load(open(tracked_manifest))

problems=[]
hf, ff = have.get('files',{}), fresh['files']
for path in sorted(set(hf) | set(ff)):
    if path not in ff:   problems.append("declared but absent from a fresh run: %s" % path)
    elif path not in hf: problems.append("produced by a fresh run but not declared: %s" % path)
    elif hf[path]!=ff[path]:
        problems.append("digest differs: %s\n      declared %s\n      actual   %s" % (path, hf[path][:32], ff[path][:32]))
for k in ('claim_totals','load_bearing'):
    if have.get(k)!=fresh[k]:
        problems.append("%s differs: declared %r, actual %r" % (k, have.get(k), fresh[k]))
gc=have.get('git_commit','')
if not gc or subprocess.run(['git','cat-file','-e','%s^{commit}'%gc],capture_output=True).returncode!=0:
    problems.append("git_commit is missing or not a commit in this repository: %r" % gc)

if problems:
    print("  FAIL: the tracked evidence bundle is not what the sources produce.")
    for p in problems[:12]: print("    - %s" % p)
    if len(problems)>12: print("    … and %d more" % (len(problems)-12))
    print()
    print("  Verification does NOT regenerate the bundle. Regenerate it deliberately:")
    print("      make public-claims-evidence-generate")
    sys.exit(1)
print(f"  ok: bundle reproduces — {len(ff)} files, {fresh['claim_totals']['total']} claims, "
      f"{fresh['load_bearing']} load-bearing; generated at {gc[:12]}")
PY

echo
if [ "$fail" -ne 0 ]; then echo "public-claims-evidence: ✗ FAIL"; exit 1; fi

# Purity is asserted here rather than by the assurance purity guard. That guard runs each subject in an
# isolated worktree, where cargo has no cache, so this battery would rebuild eighteen crates from cold
# on every assurance run — a check painful enough to get worked around is worse than one that is cheap
# and honest. This costs nothing and runs everywhere the check runs, including CI.
if [ "$MODE" = check ]; then
  if [ -n "$(git status --porcelain -- "$TRACKED" 2>/dev/null | grep -v '^??' || true)" ] \
     && [ -z "$DIRTY_BEFORE" ]; then
    echo "public-claims-evidence: ✗ PURITY VIOLATION — verification modified $TRACKED/" >&2
    exit 1
  fi
fi
if [ "$MODE" = generate ]; then
  echo "public-claims-evidence: ✓ battery green; tracked bundle regenerated"
else
  echo "public-claims-evidence: ✓ battery green; tracked bundle reproduces (nothing written)"
fi
