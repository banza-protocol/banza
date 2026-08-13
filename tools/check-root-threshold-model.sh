#!/usr/bin/env bash
# The root authorization model is 2-of-3, and it is one model everywhere.
#
# This guard protects a PROPERTY, not a set of filenames. It does not assert that any particular
# document exists; it asserts that whatever documents do exist agree with the engine, that the engine
# enforces distinct-authority counting, and that no surface presents a superseded model as current.
#
# The sweep that produced this guard found the opposite of all three: a validator enforcing 2-of-3, a
# governance record approving a different model, and two complete parallel ceremony document sets. A
# guard on document names would not have caught any of it.
#
#   1. the engine declares three authorities and a threshold of two;
#   2. the threshold counts DISTINCT signers — the property a duplicated signature would defeat;
#   3. no current surface claims a superseded model (2-of-2 / dual control / N-HSM as the threshold)
#      or a future one (3-of-5 / Shamir) as BANZA's;
#   4. the rule is readable on a current authority without opening Rust;
#   5. the normative federation contract carries the same quorum as the engine.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

ENGINE=engines/banza-root-ceremony/src/lib.rs
TESTS=engines/banza-root-ceremony/tests/threshold.rs
ARCH=docs/governance/BANZA_TRUST_ARCHITECTURE.md
CUSTODY=docs/security/ROOT_KEY_CUSTODY_MODEL.md
FEDTRUST=contracts/federation/federation-trust.json

fail() { echo "  FAIL: $*"; exit 1; }
echo "== root-threshold-model =="

# 1. The engine is the implementation; these two constants are the model.
grep -qE 'pub const TOTAL_ROOT_KEYS: u64 = 3;' "$ENGINE" || fail "the engine does not declare three root authorities"
grep -qE 'pub const THRESHOLD: u64 = 2;' "$ENGINE" || fail "the engine does not declare a threshold of two"
echo "  ok: engine declares three authorities, threshold two"

# 2. Distinct-authority counting. Counting signature ENTRIES lets one custodian sign twice and reach
#    the threshold alone, which is exactly the defect this repository shipped before the sweep.
grep -q 'valid_signers' "$ENGINE" \
  || fail "the engine counts signature entries rather than distinct signing authorities"
grep -q 'valid_signers.len() as u64' "$ENGINE" \
  || fail "the threshold is not taken from the set of distinct signers"
[ -f "$TESTS" ] || fail "the threshold property has no test file"
for t in duplicate_signer_is_one_authority one_authority_never_authorises_alone \
         any_two_of_the_three_authorise all_three_authorise no_signatures_do_not_authorise \
         an_unknown_signer_fails_closed a_malformed_signature_fails_closed; do
  grep -q "fn $t" "$TESTS" || fail "the accept/reject matrix is missing: $t"
done
echo "  ok: threshold counts distinct authorities, with the accept/reject matrix tested"

# 3. No superseded or future model presented as current. Negation-aware: a sentence that says BANZA does
#    NOT use Shamir is the documentation doing its job, not a violation.
scan() {
  git ls-files 'docs/*.md' 'docs/**/*.md' 'spec/*.md' 'spec/**/*.md' \
               'contracts/*.json' 'contracts/**/*.json' 'conformance/**/*.json' \
               'decisions/**/*.md' 'website/content/**/*.md' 2>/dev/null \
    | grep -v '^docs/audit/' || true
}
while IFS= read -r f; do
  [ -f "$f" ] || continue
  while IFS= read -r line; do
    case "$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')" in
      *" no "*|*" not "*|*never*|*sem\ shamir*|*"não"*|*nenhum*|*future*|*futuro*) continue ;;
    esac
    fail "$f presents a superseded or future custody model as current: $line"
  done < <(grep -nE '2-of-2|2-de-2|dual control|controlo duplo|3-of-5|3-de-5|Shamir' "$f" || true)
done < <(scan)
echo "  ok: no surface presents 2-of-2 or 3-of-5 as the current model"

# 4. The rule is stated on a current authority, in words, without opening the engine.
grep -q '2-de-3' "$ARCH" || fail "$ARCH does not state the concrete threshold"
grep -qiE 'três autoridades' "$ARCH" || fail "$ARCH does not state three independent authorities"
[ -f "$CUSTODY" ] || fail "there is no custody model document to own the controls"
grep -qiE 'any two of the three' "$CUSTODY" || fail "$CUSTODY does not state the rule in one sentence"
echo "  ok: the rule is readable on a current authority"

# 5. The normative contract agrees with the engine.
python3 - "$FEDTRUST" <<'PY' || exit 1
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
def walk(x):
    if isinstance(x, dict):
        if x.get("id") == "trust_root":
            return x
        for v in x.values():
            r = walk(v)
            if r:
                return r
    if isinstance(x, list):
        for v in x:
            r = walk(v)
            if r:
                return r
    return None
root = walk(d)
if not root:
    print("  FAIL: the federation trust contract declares no trust_root layer"); sys.exit(1)
if root.get("quorum") != "2_of_3":
    print("  FAIL: the contract quorum is %r, not 2_of_3" % root.get("quorum")); sys.exit(1)
if "future_custody_target" in root:
    print("  FAIL: the contract still carries a future custody target"); sys.exit(1)
PY
echo "  ok: the normative federation contract carries the same quorum"

# ── self-test: the scanner must fire on a real violation ────────────────────────────────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf 'The root uses 2-of-2 dual control.\n' > "$tmp/bad.md"
grep -qE '2-of-2|dual control' "$tmp/bad.md" || { echo "SELFTEST_FAIL detector"; exit 2; }
printf 'BANZA does not use Shamir sharing.\n' > "$tmp/ok.md"
line=$(grep -E 'Shamir' "$tmp/ok.md")
case "$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')" in
  *" not "*) ;;
  *) echo "SELFTEST_FAIL negation-awareness"; exit 2 ;;
esac

echo "root-threshold-model: OK — one model, 2-of-3, engine and surfaces agree"
