#!/usr/bin/env bash
# The normative surface must be navigable by someone who has never seen the reference code.
#
# Phase D of the external-review closure asks one question: can an external implementer determine
# exactly what to implement for a profile, without reading engines/, without reading ADRs, without
# the README and without the BanzAI? This guard is that question, executed.
#
#   1. the profile registry is the single normative definition, and agrees with the material it names
#   2. derived views declare themselves derived, and no derived view acquires authority
#   3. generation is deterministic and free of drift
#   4. no orphan on the normative surface is left unexplained
#   5. the public conformance package is genuinely self-contained (isolation test)
#   6. no requirement depends on engines/, an ADR, the README, or the BanzAI
set -euo pipefail
cd "$(dirname "$0")/.."

REG=contracts/production/conformance-profiles.production.json
SETS=docs/derived/implementation-sets.json
GUIDE=docs/guides/implement-l0.md
PKG=conformance/package
fail() { echo "  FAIL: $*"; exit 1; }

echo "== normative-discoverability =="

for f in "$REG" "$SETS" "$GUIDE" "$PKG/package-manifest.json"; do
  [ -f "$f" ] || fail "missing: $f (run: make implementation-sets)"
done

# ---- 1. the registry is the authority, and it agrees with what it names -------------------------
python3 - "$REG" <<'PY' || exit 1
import json, os, sys, re
reg = json.load(open(sys.argv[1]))
inv = json.load(open('contracts/invariants.json'))
ids = {i['id'] for i in inv['invariants']} if isinstance(inv['invariants'], list) else set(inv['invariants'])
manifest = json.load(open('contracts/production/normative-manifest.json'))
surface = {a['path'] for a in manifest['artifacts']}
NON_PATH = ('required_capabilities', 'required_invariants', 'required_endpoints', 'required_publication')
bad = []
for p in reg['profiles']:
    for i in p['required_invariants']:
        if i not in ids:
            bad.append("%s names invariant %s, which is not in contracts/invariants.json" % (p['level'], i))
    for k, v in p.items():
        if k.startswith('required_') and k not in NON_PATH and isinstance(v, list):
            for path in v:
                if not os.path.exists(path):
                    bad.append("%s names %s, which does not exist" % (p['level'], path))
                elif path not in surface:
                    bad.append("%s names %s, which is not on the normative surface" % (p['level'], path))
# the closure must be a real partial order: no profile may include itself, directly or otherwise
by = {p['level']: p for p in reg['profiles']}
for lvl in by:
    seen, stack = set(), list(by[lvl]['includes'])
    while stack:
        x = stack.pop()
        if x == lvl:
            bad.append("%s includes itself transitively" % lvl)
            break
        if x in seen:
            continue
        seen.add(x)
        stack.extend(by[x]['includes'])
# every profile must say what it does NOT require
for p in reg['profiles']:
    if p['level'] != 'L4' and not p['not_required']:
        bad.append("%s states no not_required — a level that only lists obligations cannot be scoped" % p['level'])
if bad:
    for b in bad:
        print("  FAIL: %s" % b)
    sys.exit(1)
print("  ok: profile registry — %d profiles, every invariant and path resolves on the surface" % len(reg['profiles']))
PY

# The registry, not prose, defines the levels. A normative artifact must not derive the level model
# from a document that is not itself normative.
if grep -rn 'certification-boundary\.md' conformance/*.json conformance/*/*.json contracts/ 2>/dev/null \
   | grep -viE 'explains|companion|human reader' | grep -q .; then
  fail "a normative artifact still derives the level model from docs/governance/certification-boundary.md"
fi
grep -q 'conformance-profiles.production.json' docs/governance/certification-boundary.md \
  || fail "certification-boundary.md must point at the normative registry it explains"
echo "  ok: the level model is defined by the registry; prose points at it, not the reverse"

# ---- 2. derived views declare themselves derived -------------------------------------------------
HDR='Derived informative view. The BANZA Normative Manifest remains authoritative.'
for f in docs/derived/implementation-sets.md docs/derived/implementation-sets.json "$GUIDE"; do
  grep -q "$HDR" "$f" || fail "$f does not carry the derived-view header"
done
# A derived view must not speak normatively in its own voice.
if grep -nE '^\s*(-|\*|[0-9]+\.)?\s*[A-Za-z][^|]*\b(MUST|SHALL|REQUIRED)\b' "$GUIDE" \
   | grep -viE 'normative|governs|per |defined in|BCP 14|artifact' | grep -q .; then
  fail "$GUIDE states a requirement in its own voice instead of citing the artifact that imposes it"
fi
echo "  ok: derived views declare themselves derived and impose nothing"

# ---- 3. determinism and drift --------------------------------------------------------------------
# Compared against the WORKING TREE, not against git HEAD. The property under test is that the
# generated files match the sources they are generated from; whether those sources are committed yet
# is a different question, and using HEAD as the baseline would fail every honest work-in-progress
# while passing a stale file that happens to be committed.
SNAP=$(mktemp -d)
cp "$SETS" "$SNAP/sets.json"
find "$PKG" -type f -exec shasum -a 256 {} \; | sort > "$SNAP/pkg.before"
python3 tools/gen-implementation-sets.py > /dev/null
python3 tools/gen-conformance-package.py > /dev/null
cmp -s "$SNAP/sets.json" "$SETS" \
  || { rm -rf "$SNAP"; fail "implementation sets are stale: regeneration changes them"; }
find "$PKG" -type f -exec shasum -a 256 {} \; | sort > "$SNAP/pkg.after"
cmp -s "$SNAP/pkg.before" "$SNAP/pkg.after" \
  || { rm -rf "$SNAP"; fail "conformance package is stale: regeneration changes it (run: make implementation-sets)"; }
rm -rf "$SNAP"
echo "  ok: generation is deterministic and the committed views are current"

# ---- 4. no unexplained orphan --------------------------------------------------------------------
python3 - "$SETS" <<'PY' || exit 1
import json, sys
o = json.load(open(sys.argv[1]))['orphans']
hard = ('implementation_tier_without_profile_or_consumer', 'schema_never_referenced',
        'vector_not_required_by_any_profile', 'manifest_entry_whose_file_is_missing',
        'unresolved_references', 'declared_but_absent_from_the_surface')
bad = {k: o[k] for k in hard if o.get(k)}
if bad:
    for k, v in bad.items():
        print("  FAIL: %s: %s" % (k, v[:6]))
    print("  (an orphan is either a profile-registry gap or a declared non-profile artifact; "
          "silence is not one of the options)")
    sys.exit(1)
print("  ok: zero unexplained orphans; %d artifacts declared non-profile with a stated reason"
      % len(o.get('declared_non_profile_artifacts', [])))
PY

# ---- 5. isolation test: the package alone, in an empty directory ---------------------------------
ISO=$(mktemp -d)
trap 'rm -rf "$ISO"' EXIT
cp -R "$PKG/." "$ISO/"
python3 - "$ISO" <<'PY' || exit 1
import hashlib, json, os, re, sys
iso = sys.argv[1]
man = json.load(open(os.path.join(iso, 'package-manifest.json')))
bad = []

# every listed file present, and its digest correct
for f in man['files']:
    p = os.path.join(iso, f['path'])
    if not os.path.exists(p):
        bad.append("missing from the package: %s" % f['path']); continue
    h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    if h != f['sha256']:
        bad.append("digest mismatch: %s" % f['path'])

listed = {f['path'] for f in man['files']}
present = set()
for root, _, names in os.walk(iso):
    for n in names:
        rel = os.path.relpath(os.path.join(root, n), iso)
        if rel not in ('package-manifest.json', 'README.md'):
            present.add(rel)
extra = present - listed
if extra:
    bad.append("present but unlisted: %s" % sorted(extra)[:5])

# no path escapes the package, and no absolute path
esc = re.compile(r'(\.\./)|(^|["\'\s(])/(Users|home|srv|opt|var|etc)/')
eng = re.compile(r'\bengines/|\bservices/|\bwebsite/|\btools/')
for rel in sorted(listed):
    text = open(os.path.join(iso, rel), encoding='utf-8', errors='replace').read()
    if esc.search(text):
        bad.append("escapes the package or uses an absolute path: %s" % rel)
    # A contract may disclaim that code is the authority — "engines/X implements it and does not
    # define it" is the repository's own idiom for keeping code out of the norm, and removing it
    # would weaken the very property being checked. What must not appear is a reference that sends
    # the reader to code to find out what the rule IS.
    for m in eng.finditer(text):
        window = text[max(0, m.start() - 160):m.end() + 160]
        if 'implements it and does not define it' in window:
            continue
        bad.append("directs the reader to implementation code: %s (%s)"
                   % (rel, window[m.start() - max(0, m.start() - 160):][:70]))

# every $ref resolves inside the package
def refs(o, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == '$ref' and isinstance(v, str):
                out.add(v)
            else:
                refs(v, out)
    elif isinstance(o, list):
        for v in o:
            refs(v, out)

for rel in sorted(listed):
    if not rel.endswith('.json'):
        continue
    try:
        doc = json.load(open(os.path.join(iso, rel), encoding='utf-8'))
    except ValueError:
        bad.append("not parseable inside the package: %s" % rel); continue
    found = set()
    refs(doc, found)
    for r in sorted(found):
        if r.startswith('#'):
            continue
        target = r.split('#', 1)[0]
        if target.startswith('https://banza.network/'):
            target = target[len('https://banza.network/'):]
        elif target.startswith('http'):
            continue
        else:
            target = os.path.normpath(os.path.join(os.path.dirname(rel), target))
        if target not in listed:
            bad.append("$ref does not resolve inside the package: %s -> %s" % (rel, r))

# every vector case has a determinable expected outcome
# A case declares its outcome by any member that states what must be observed. Enumerating exact
# names was too narrow: `check_ledger: {expected_new_entry_count: 1}` and `expected_events` are
# outcomes as much as `expect` is.
# The vector files do not share ONE outcome grammar: some cases say `expect`, others state the
# observable in `endpoint_check` / `invariant_check` / `post_check` / `assertion`, and a few name
# only the `invariants` that must hold. Every case IS determinable, which is what this test asks;
# that they are determinable in six different shapes is recorded as a finding in the Phase D report
# rather than smoothed over here.
OUTCOME = ('expect', 'valid', 'result', 'reason_code', 'error', 'accept', 'reject', 'outcome',
           'canonical', 'assertion', 'invariants')
for v in man['vector_files']:
    doc = json.load(open(os.path.join(iso, v['file']), encoding='utf-8'))
    cases = []
    for key in ('vectors', 'cases', 'accept', 'reject'):
        if isinstance(doc.get(key), list):
            cases += [(key, c) for c in doc[key] if isinstance(c, dict)]
    if not cases:
        bad.append("no cases found in %s" % v['file']); continue
    for key, c in cases:
        if key in ('accept', 'reject'):
            continue  # the containing member IS the expected outcome
        if not (any(k in c for k in OUTCOME)
                or any(k.startswith('expected') or k.startswith('check_')
                       or k.endswith('_check') for k in c)):
            bad.append("case without a determinable expected outcome: %s %s"
                       % (v['file'], c.get('id')))
if bad:
    for b in bad[:20]:
        print("  FAIL: %s" % b)
    sys.exit(1)
print("  ok: isolation test — %d files, digests verified, no path leaves the package, every $ref "
      "resolves, every case has an expected outcome" % len(listed))
PY

# ---- 6. independence: engines, ADRs, README, BanzAI ----------------------------------------------
# D14: a public norm may say Ed25519. It may not say "call the Rust function X".
if grep -rnE '\b(engines/|banza_[a-z_]+::|cargo |wasm-pack|fn [a-z_]+\(|\.rs\b)' "$GUIDE" "$PKG"/*.md \
   2>/dev/null | grep -q .; then
  fail "the guide or package names implementation code, modules or source paths"
fi
# D15/D16/D17: nothing in the L0 set may be an ADR, the README, or BanzAI material.
python3 - "$SETS" <<'PY' || exit 1
import json, sys
sets = json.load(open(sys.argv[1]))
bad = []
for s in sets['implementation_sets']:
    for p in s['transitive_normative_closure']:
        if p.startswith('decisions/adr/'):
            bad.append("%s requires an ADR: %s" % (s['level'], p))
        if p in ('README.md',) or p.startswith('README'):
            bad.append("%s requires the README: %s" % (s['level'], p))
        if 'banzai' in p.lower() or p.startswith('website/') or p.startswith('services/'):
            bad.append("%s requires BanzAI or a service surface: %s" % (s['level'], p))
        if p.startswith('engines/'):
            bad.append("%s requires reference code: %s" % (s['level'], p))
if bad:
    for b in bad:
        print("  FAIL: %s" % b)
    sys.exit(1)
print("  ok: no profile requires an ADR, the README, the BanzAI or reference code")
PY

# D20: discoverability is not a claim about effort. The check is about claims concerning THE WORK —
# "easy to implement" — not about the adjective anywhere: "that zero is easy to misread" is a warning
# to the reader, and failing it would push the author to drop a useful caution to satisfy a regex.
if grep -nEi '(easy|trivial|simple|quick|straightforward)( and [a-z]+)? to (implement|build|write|do|code)|\ban? (easy|trivial|quick|simple) (implementation|build|job|task)|weekend (project|implementation)|\bimplementation is (easy|trivial|simple|quick)\b' \
   "$GUIDE" docs/derived/implementation-sets.md 2>/dev/null | grep -q .; then
  fail "the guide or derived view characterises the work as easy — Phase D demonstrates navigability, not effort"
fi
grep -q 'has been demonstrated' "$GUIDE" \
  || fail "the guide must keep saying that no independent implementation has been demonstrated"
echo "  ok: no effort claim; the unmeasured state is stated"

# ---- 7. a parameterized profile is not its predecessor -------------------------------------------
# L4 adds no universal artifact. That is correct, and it is also the shape of a silent bug: a level
# that adds no artifact and states nothing else makes "L3 conformant" and "L4 conformant" the same
# claim. A parameterized profile must carry the semantics that keep them apart.
python3 - "$REG" "$SETS" <<'PY' || exit 1
import json, sys
reg = json.load(open(sys.argv[1]))
sets = {s['level']: s for s in json.load(open(sys.argv[2]))['implementation_sets']}
bad = []
for p in reg['profiles']:
    lvl = p['level']
    param = bool(p.get('profile_parameterized'))
    if sets[lvl]['counts']['incremental'] == 0 and p['includes'] and not param:
        bad.append("%s adds no artifact over %s and is not declared profile_parameterized: as "
                   "published, satisfying %s would satisfy %s"
                   % (lvl, p['includes'][-1], p['includes'][-1], lvl))
    if not param:
        continue
    ep = p.get('external_profile')
    if not ep:
        bad.append("%s is parameterized but carries no external_profile block" % lvl)
        continue
    res = ep.get('result_without_a_selected_profile')
    if res == 'pass':
        bad.append("%s would PASS with no external profile selected — the level would be awarded "
                   "for satisfying the level below it" % lvl)
    elif res not in ('not_run', 'fail'):
        bad.append("%s: result_without_a_selected_profile (%r) is not from the published per-level "
                   "vocabulary" % (lvl, res))
    for member in ('must_identify', 'must_evidence'):
        if not ep.get(member):
            bad.append("%s: %s is empty — a parameterized level with nothing to identify or "
                       "evidence is indistinguishable from the level below it" % (lvl, member))
    # An empty published_profiles list is a truthful statement. A list holding an invented example
    # is not: it would make the mechanism look exercised when nothing exercises it.
    for name in ep.get('published_profiles', []):
        bad.append("%s names a published external profile (%s): if real it belongs on the normative "
                   "surface as an artifact, and if illustrative it must not be here" % (lvl, name))
    if not sets[lvl].get('profile_parameterized'):
        bad.append("%s: the derived view does not carry the parameterization, so it renders the "
                   "increment as a bare zero" % lvl)
if bad:
    for b in bad:
        print("  FAIL: %s" % b)
    sys.exit(1)
print("  ok: a parameterized profile states what keeps it distinct from the level below")
PY

grep -q 'does not make this level equivalent' docs/derived/implementation-sets.md \
  || fail "the derived view shows a parameterized increment without saying it is not equivalent to the level below"
grep -qi 'reaching L3 does not reach L4' "$GUIDE" \
  || fail "the guide must tell an implementer that reaching L3 does not reach L4"
echo "  ok: L3 conformant and L4 conformant are distinguishable claims"

echo "normative-discoverability: OK — the surface is navigable from outside, and nothing outside it is required"
