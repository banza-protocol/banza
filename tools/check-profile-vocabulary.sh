#!/usr/bin/env bash
# There is one canonical L0–L4 profile vocabulary, and current metadata agrees with it.
#
# Two properties, because each one alone fails in a different direction:
#
#   POSITIVE  The registry defines exactly L0–L4 with their canonical names, and every derived
#             surface reproduces that mapping. Without this, deleting the whole profile table would
#             pass — nothing wrong would be found because nothing would be left to find it in.
#   BOUNDARY  No profile NAME encodes a certification state, an operational status, a regulatory
#             permission or a production approval. Without this, "L4 — Production Certified" is a
#             valid five-row table.
#
# The check compares STRUCTURED DATA, not prose: the registry, the generated Rust constant, and the
# engine's own output. Prose describing profiles is a different surface with a different guard.
#
# Observational purity (PR C): the derived file is regenerated to a TEMPORARY path and compared.
# A check that regenerates in place cannot fail on stale evidence — it repairs it, then reports
# green.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== profile-vocabulary =="

python3 - <<'PY'
import json, os, re, subprocess, sys, tempfile

REGISTRY = 'contracts/production/conformance-profiles.production.json'
DERIVED = 'engines/banza-conformance/src/canonical_profiles.rs'
KB_DERIVED = 'engines/banzai-query-core/src/canonical_profiles.generated.rs'
KB_FACTS = 'services/banzai-api/src/canonicalProfiles.generated.json'
GENERATOR = 'tools/gen-canonical-profiles-rs.py'

# A profile is a technical capability. These words belong to certification, operational status and
# regulatory permission — separate axes that must not be collapsed into a capability's name.
BANNED = ['certif', 'production', 'produc', 'produç', 'approv', 'authoris', 'authoriz', 'autoriz',
          'licen', 'regulator', 'regulat', 'live', 'real money', 'real-money', 'operational']

problems = []


def registry_profiles():
    reg = json.load(open(REGISTRY, encoding='utf-8'))
    return [(p['level'], p['name']) for p in reg['profiles']]


def derived_profiles(path):
    """Read the (level, name) pairs out of the generated Rust constant."""
    text = open(path, encoding='utf-8').read()
    return re.findall(r'CanonicalProfile \{ level: "([^"]+)", name: "([^"]+)" \}', text)


def check_names(pairs, where):
    for level, name in pairs:
        low = name.lower()
        for b in BANNED:
            if b in low:
                problems.append('%s: profile name encodes %r, which is not a capability: %s — %s'
                                % (where, b, level, name))


def selftest():
    # A guard that cannot fail is not a guard. Each fixture must be caught by the rule that exists
    # for it, so a rule that silently stops matching is visible.
    cases = [
        ([('L0', 'Protocol Sandbox'), ('L1', 'Core Payment Capability'),
          ('L2', 'Payment Initiation Capability'), ('L3', 'Inter-Operator Interoperability'),
          ('L4', 'External Interoperability')], None),
        ([('L4', 'Production Certified')], 'certif'),
        ([('L4', 'Certified Production')], 'certif'),
        ([('L0', 'Regulatory Sandbox')], 'regulat'),
        ([('L4', 'Produção certificada')], 'produ'),
        ([('L1', 'Live Operator')], 'live'),
        ([('L3', 'Authorized Interoperability')], 'authoriz'),
    ]
    for pairs, expect in cases:
        found = []
        for level, name in pairs:
            low = name.lower()
            found += [b for b in BANNED if b in low]
        if expect is None:
            if found:
                print('SELFTEST FAIL: canonical vocabulary rejected (%s)' % found, file=sys.stderr)
                sys.exit(2)
        else:
            if not found:
                print('SELFTEST FAIL: %r not detected' % (pairs,), file=sys.stderr)
                sys.exit(2)
            if not any(expect in f for f in found):
                print('SELFTEST FAIL: %r caught by the wrong rule (%s), expected %s'
                      % (pairs, found, expect), file=sys.stderr)
                sys.exit(2)
    print('  selftest ok — canonical set accepted, 6 stale labels each caught by their own rule')


selftest()

canonical = registry_profiles()

# POSITIVE — the registry is a complete, exact, unique L0..Ln set. An empty or truncated registry
# must not read as "nothing wrong found".
levels = [lv for lv, _ in canonical]
if len(canonical) < 2:
    problems.append('%s: profile set is empty or degenerate (%d profiles)' % (REGISTRY, len(canonical)))
if len(set(levels)) != len(levels):
    problems.append('%s: duplicate profile identifiers: %s' % (REGISTRY, levels))
expected_seq = ['L%d' % i for i in range(len(canonical))]
if levels != expected_seq:
    problems.append('%s: profile identifiers are %s, expected the contiguous set %s'
                    % (REGISTRY, levels, expected_seq))
for lv, name in canonical:
    if not name.strip():
        problems.append('%s: %s has no name' % (REGISTRY, lv))

# BOUNDARY — on the registry itself.
check_names(canonical, REGISTRY)

# The derived Rust constant reproduces the registry exactly, and is not hand-edited: regenerate to
# a temporary tree and compare. Nothing tracked is written.
with tempfile.TemporaryDirectory() as tmp:
    fresh = os.path.join(tmp, 'canonical_profiles.rs')
    r = subprocess.run([sys.executable, GENERATOR, '--stdout'], capture_output=True, text=True)
    if r.returncode != 0:
        problems.append('%s failed: %s' % (GENERATOR, r.stderr.strip()[:200]))
    else:
        open(fresh, 'w', encoding='utf-8').write(r.stdout)
        # Determinism: the same source generates the same bytes.
        again = subprocess.run([sys.executable, GENERATOR, '--stdout'], capture_output=True, text=True)
        if again.stdout != r.stdout:
            problems.append('%s is not deterministic: two generations differ' % GENERATOR)
        if not os.path.exists(DERIVED):
            problems.append('%s is missing — the derived vocabulary does not exist' % DERIVED)
        elif open(DERIVED, encoding='utf-8').read() != r.stdout:
            problems.append('%s is stale: it does not match a fresh generation from %s. '
                            'Run `make canonical-profiles-rs` — do not hand-edit a derived file.'
                            % (DERIVED, REGISTRY))
        else:
            derived = derived_profiles(DERIVED)
            if derived != canonical:
                problems.append('%s disagrees with the registry: %s vs %s' % (DERIVED, derived, canonical))
            check_names(derived, DERIVED)

    # EVERY derived artifact, not just the first one. A mutation that added L7 to the BanzAI closed set
    # while the registry still held L0-L4 SURVIVED this check, because only the conformance engine's file
    # was compared: the two artifacts BanzAI reads had been generated and then never observed. A freshness
    # check that covers some of what a generator writes reports success for the parts it never looked at.
    for flag, target in (('--stdout-kb', KB_DERIVED), ('--stdout-kb-facts', KB_FACTS)):
        g = subprocess.run([sys.executable, GENERATOR, flag], capture_output=True, text=True)
        if g.returncode != 0:
            problems.append('%s %s failed: %s' % (GENERATOR, flag, g.stderr.strip()[:200]))
            continue
        if not os.path.exists(target):
            problems.append('%s is missing — a derived profile artifact does not exist' % target)
        elif open(target, encoding='utf-8').read() != g.stdout:
            problems.append('%s is stale: it does not match a fresh generation from %s. '
                            'Run `make canonical-profiles-rs` — do not hand-edit a derived file.'
                            % (target, REGISTRY))

if problems:
    print()
    for p in problems:
        print('  FAIL: %s' % p)
    print()
    print('  One canonical profile vocabulary: %s.' % REGISTRY)
    print('  A profile is a technical capability — never a certification, an operational status or')
    print('  a regulatory permission. See docs/governance/certification-boundary.md.')
    sys.exit(1)

print('  ok: %d profiles, %s — registry and derived Rust constant agree exactly'
      % (len(canonical), ' '.join('%s=%s' % (lv, n) for lv, n in canonical)))
print('  ok: no profile name encodes certification, operational status or regulatory permission')
PY
rc=$?
[ "$rc" -ne 0 ] && { echo "profile-vocabulary: FAILED"; exit "$rc"; }

# The engine's own output, executed rather than read: the names it reports must be the canonical
# ones. This is the surface a consumer would actually see.
out="$(cargo test -q --manifest-path engines/banza-conformance/Cargo.toml \
        --test tool level_names_are_the_canonical_profile_vocabulary 2>&1)" || {
  echo "  FAIL: the conformance engine does not report the canonical profile vocabulary"
  echo "$out" | tail -12
  echo "profile-vocabulary: FAILED"
  exit 1
}
echo "  ok: banza-conformance reports the canonical names at runtime (executed, not read)"
echo "profile-vocabulary: OK"
