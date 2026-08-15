#!/usr/bin/env bash
#
# The Root authority model stays real, at every layer.
#
# v1.0.0 declared a three-authority threshold and implemented a single root key, and nothing caught it
# for as long as the claim lived only in prose. This guard protects the PROPERTIES that make the claim
# true, not the sentences that state it:
#
#   1. three authorities, threshold two — in the contract, not just in a document
#   2. the Key Manifest is authorised by a SET, never by a single root key
#   3. a successor is authorised by its PREDECESSOR (the self-signed set is rejected)
#   4. no single-signer bypass exists anywhere in the trust engine
#   5. no organisation name takes part in Root validity
#   6. the invariant registry does not contradict itself about the root again
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

echo "== root-authority-model =="

SET_SCHEMA=contracts/production/root-authority-set.production.schema.json
KM_SCHEMA=contracts/production/key-manifest.production.schema.json

python3 - <<'PY' || fail=1
import json, sys

bad = []

# 1. the shape is in the contract
s = json.load(open('contracts/production/root-authority-set.production.schema.json'))
a = s['properties']['authorities']
if a.get('minItems') != 3 or a.get('maxItems') != 3:
    bad.append('the contract must fix exactly three authorities')
if s['properties']['threshold'].get('const') != 2:
    bad.append('the contract must fix threshold 2')

# 2. the Key Manifest is authorised by a set, and the single-key root reference is gone
km = json.load(open('contracts/production/key-manifest.production.schema.json'))
p = km['properties']
if 'root_signatures' not in p:
    bad.append('the Key Manifest must carry root_signatures')
elif p['root_signatures'].get('minItems', 0) < 2:
    bad.append('root_signatures must require at least the threshold')
if 'root_authority_set' not in p:
    bad.append('the Key Manifest must name its authorising Root Authority Set')
if 'root' in p and 'kid' in json.dumps(p.get('root', {})):
    bad.append('the single-key root reference must not return to the Key Manifest')

# 6. the invariant registry must not say "the root key" as the basis of manifest trust again
inv = {i['id']: i for i in json.load(open('contracts/invariants.json'))['invariants']}
for i in ('INV-ROOT-011', 'INV-ROOT-012', 'INV-ROOT-013', 'INV-ROOT-014'):
    if i not in inv:
        bad.append(f'{i} is missing from the invariant registry')
km2 = inv.get('INV-ROOT-002', {}).get('statement', '')
if 'sole basis' in km2 and 'set' not in km2.lower():
    bad.append('INV-ROOT-002 still makes a single root key the sole basis of trust')

for b in bad:
    print('  FAIL: %s' % b)
if bad:
    sys.exit(1)
print('  ok: contract fixes 3 authorities / threshold 2; manifest is set-authorised; INV-ROOT-011..014 present')
PY

# 3. the self-signed set must be rejected — asserted by driving the engine, not by reading it
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test authority_succession \
     a_self_signed_set_authorises_nothing >/dev/null 2>&1; then
  ok "a set signed only by its own authorities is rejected (engine-verified)"
else
  bad "the self-signed-set rejection does not hold"
fi
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test authority_succession \
     removed_authority_is_never_required >/dev/null 2>&1; then
  ok "a removed authority is never required to authorise its own removal (engine-verified)"
else
  bad "the removed-authority property does not hold"
fi
# Counting signature ENTRIES rather than distinct authorities is the quiet way back to a one-party root:
# a single custodian signing twice reaches the threshold alone. A mutation that switches the signer set
# to a list must fail here.
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test authority_succession \
     a_duplicate_signer_counts_once >/dev/null 2>&1; then
  ok "one custodian signing twice is one approval, not two (engine-verified)"
else
  bad "duplicate signature entries can reach the threshold"
fi
# The published vectors are the external implementation's definition of correct. If they stop matching
# the engine, an implementer validates against something the reference implementation does not do.
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test authority_set_vectors \
     >/dev/null 2>&1; then
  ok "every published Root Authority Set vector matches the engine (engine-verified)"
else
  bad "the published vectors and the engine disagree"
fi

# The state-update path: classifying a conflict is not enough if the caller may still write the digest.
# Everything dangerous — first arrival wins, last arrival wins, lower digest wins, this source wins —
# lives in the apply step, so the apply step must be the thing that is tested.
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test trusted_state_transitions \
     >/dev/null 2>&1; then
  ok "an equivocating successor never replaces trusted state, and arrival order decides nothing (engine-verified)"
else
  bad "trusted state can be replaced by a conflicting successor"
fi
# Genesis is trusted because it was PINNED, never because it arrived first. This check was absent until
# a mutation proof showed the guard stayed green while trust-on-first-use was reintroduced — the guard
# protected succession and left the anchor the whole lineage hangs from unprotected.
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test authority_succession \
     trust_on_first_use_is_refused >/dev/null 2>&1 && \
   cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test authority_succession \
     genesis_is_accepted_only_against_the_pinned_digest >/dev/null 2>&1; then
  ok "genesis is accepted only against a pinned digest; trust on first use is refused (engine-verified)"
else
  bad "the genesis pinning property does not hold"
fi
# A future protocol version must not become trusted for starting with the right number.
if cargo test -q --manifest-path engines/banza-trust/Cargo.toml --test protocol_version_compatibility \
     >/dev/null 2>&1; then
  ok "an unknown future protocol version is not compatible (engine-verified)"
else
  bad "an unpublished future version is accepted by prefix"
fi

# 4. no single-signer bypass. Named escapes, searched as identifiers rather than prose so that a
#    document DESCRIBING the prohibition is not mistaken for an implementation of one.
leak=0
for pat in 'emergency_key' 'master_key' 'override_threshold' 'break_glass' 'recovery_key' 'bypass_threshold'; do
  if grep -rqi "$pat" engines/banza-trust/src engines/banza-root-ceremony/src 2>/dev/null; then
    bad "a single-signer bypass identifier appears in the trust engines: $pat"; leak=1
  fi
done
[ "$leak" -eq 0 ] && ok "no emergency key, override or break-glass path in the trust engines"

# 5. Root validity must not depend on an organisation name
BRAND="$(printf 'banz'; printf 'ami')"
if grep -rqi "$BRAND" "$SET_SCHEMA" "$KM_SCHEMA" engines/banza-trust/src/authority_set.rs 2>/dev/null; then
  bad "an organisation name appears in the Root authority surface"
else
  ok "Root validity is cryptographic: no organisation name in the set, the manifest or the verifier"
fi

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf 'emergency_key\n' > "$tmp/probe"
grep -qi 'emergency_key' "$tmp/probe" || { echo "SELFTEST_FAIL: bypass detector" >&2; exit 2; }

[ "$fail" -eq 0 ] || exit 1
echo "root-authority-model: OK — three authorities, threshold two, predecessor-authorised, no bypass"
