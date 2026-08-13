#!/usr/bin/env bash
# The clean-room export contains what an external implementer needs, and nothing we would regret.
#
# Three properties, in order of how badly they fail:
#
#   NEGATIVE  the package must not contain the reference implementation, the demonstration operator,
#             ADRs, internal reports, tooling, fixtures, or anything resembling a secret. A leak here
#             does not make the trial harder to interpret — it makes the trial meaningless, because
#             an implementer who can read the reference is no longer implementing from the
#             specification.
#   CLOSED    everything the package refers to must be inside the package. A single dangling path is
#             a hidden dependency on this repository.
#   STABLE    two exports from the same commit must be byte-identical, or nobody can verify what they
#             were given.
set -euo pipefail
cd "$(dirname "$0")/.."

PKGS=clean-room/packages
LEDGER=clean-room/question-ledger.schema.json
fail() { echo "  FAIL: $*"; exit 1; }

echo "== clean-room-package =="

[ -d "$PKGS" ] || fail "no export package (run: make clean-room-package)"
[ -f "$LEDGER" ] || fail "missing $LEDGER"
[ -f clean-room/README.md ] || fail "missing clean-room/README.md"

for pkg in "$PKGS"/*/; do
  level=$(basename "$pkg")
  echo "  -- $level"

  # ---- NEGATIVE ---------------------------------------------------------------------------------
  # By path. An excluded thing that reaches the package by any route fails here.
  while IFS= read -r f; do
    case "$f" in
      */engines/*|*/services/*|*/website/*|*/tools/*|*/.github/*|*/decisions/*|*/docs/audit/*\
      |*/docs/whitepaper/*|*/docs/research/*|*/conformance/fixtures/*|*/target/*|*/node_modules/*)
        fail "$level exports excluded material: ${f#"$pkg"}" ;;
      *.rs|*.env|*.pem|*.key|*/Cargo.toml|*/Cargo.lock|*/package.json|*/README.md.bak)
        fail "$level exports an implementation or secret-bearing file: ${f#"$pkg"}" ;;
    esac
    case "${f##*/}" in
      README.md|*.md|*.json|*.yaml|LICENSE|NOTICE) ;;
      *) fail "$level exports an unexpected file type: ${f#"$pkg"}" ;;
    esac
  done < <(find "$pkg" -type f)

  # By content. Paths can be renamed; the strings below cannot be, without changing meaning.
  # A contract may still DISCLAIM that code is the authority (Phase D, finding D-3), so the
  # disclaimer form is allowed and everything else is not.
  python3 - "$pkg" <<'PY' || exit 1
import os, re, sys
pkg = sys.argv[1]
bad = []

# What must not be here is MATERIAL, not the word. A trademark notice has to name the marks; the
# Normative Manifest has to classify the assistant's surface as informative in order to place it
# outside the norm; the guide has to say the assistant imposes no requirement; and the package
# manifest has to list what was excluded. Each of those is the package doing its job. A guard that
# cannot tell a mention from a worked example forces the author to strip exactly the sentences that
# keep the boundary visible.
EXEMPT = re.compile(
    r'imposes no obligation|imposes no requirement|does not grant|except for attribution'
    r'|nominative reference|is intentionally excluded|excluded on purpose|never the rule'
    r'|not authority|"tier":\s*"informative"|implements it and does not define it'
    r'|"excluded"|"why":', re.I)

# Reserved and documentation address ranges are not host addresses: a public SSRF policy has to name
# them to forbid them. What must never appear is a reachable address of ours.
RESERVED = re.compile(r'^(0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.'
                      r'|255\.255|224\.|100\.64\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)')

# The assistant and the demonstration operator are forbidden as RESOURCES, not as words. A trademark
# notice listing the covered marks, and a guide saying the assistant imposes no requirement, are the
# package drawing the boundary — which is the opposite of shipping them. What must never appear is a
# way to reach or use either: an address, an endpoint, an instruction, or example material.
FORBIDDEN = [
    # `(?<![A-Za-z])/banzai` is the route, not the slash in a list of marks such as
    # "BANZA/BanzAI/Banzami" — which a trademark notice has to write exactly that way.
    (re.compile(r'(https?://\S*(banzai|zero)\S*|(?<![A-Za-z])/banzai\b|zero\.banza\.network'
                r'|(ask|use|run|open|consult|see) the (banzai|operador[ -]?zero|operator[ -]?zero))',
                re.I), 'a way to reach or use the assistant or demonstration operator'),
    (re.compile(r'"operator_id"\s*:\s*"[^"]*(zero|demo)', re.I), 'demonstration-operator example data'),
    (re.compile(r'\bcargo (build|test|run)\b|wasm-pack|\bfn [a-z_]+\(|[A-Za-z]\w*::[a-z_]+\(',
                re.I), 'reference implementation detail'),
    (re.compile(r'BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key\s*[:=]\s*["\'][^"\']{8,}'
                r'|secret\s*[:=]\s*["\'][^"\']{8,}', re.I), 'credential material'),
    (re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'), 'a host address'),
]
ENGINE = re.compile(r'engines/[A-Za-z0-9_-]+')
for root, _, names in os.walk(pkg):
    for n in names:
        p = os.path.join(root, n)
        rel = os.path.relpath(p, pkg)
        try:
            t = open(p, encoding='utf-8').read()
        except (UnicodeDecodeError, OSError):
            continue
        for rx, what in FORBIDDEN:
            for m in rx.finditer(t):
                hit = m.group(0)
                if what == 'a host address' and RESERVED.match(hit):
                    continue
                window = t[max(0, m.start() - 220):m.end() + 220]
                if EXEMPT.search(window):
                    continue
                bad.append('%s carries %s: %r' % (rel, what, hit[:48]))
        for m in ENGINE.finditer(t):
            window = t[max(0, m.start() - 160):m.end() + 160]
            if EXEMPT.search(window):
                continue
            bad.append('%s directs the reader to implementation code: %r' % (rel, m.group(0)))
if bad:
    for b in sorted(set(bad))[:20]:
        print('  FAIL: %s' % b)
    sys.exit(1)
print('     ok: negative test — no reference code, demonstration operator, assistant, credential or host')
PY

  # ---- CLOSED -----------------------------------------------------------------------------------
  ISO=$(mktemp -d)
  cp -R "$pkg." "$ISO/"
  python3 - "$ISO" <<'PY' || { rm -rf "$ISO"; exit 1; }
import hashlib, json, os, re, sys
iso = sys.argv[1]
man = json.load(open(os.path.join(iso, 'package-manifest.json')))
prov = json.load(open(os.path.join(iso, 'provenance.json')))
bad = []

listed = {f['path'] for f in man['files']}
for f in man['files']:
    p = os.path.join(iso, f['path'])
    if not os.path.exists(p):
        bad.append('listed but absent: %s' % f['path']); continue
    if hashlib.sha256(open(p, 'rb').read()).hexdigest() != f['sha256']:
        bad.append('digest mismatch: %s' % f['path'])
    if not f.get('why'):
        bad.append('no reason recorded for including %s' % f['path'])

present = set()
for root, _, names in os.walk(iso):
    for n in names:
        rel = os.path.relpath(os.path.join(root, n), iso)
        if rel not in ('package-manifest.json', 'provenance.json', 'README.md'):
            present.add(rel)
if present - listed:
    bad.append('present but unlisted: %s' % sorted(present - listed)[:5])

# Provenance completeness (E4).
for k in ('protocol_version', 'target_profile', 'source_commit', 'normative_manifest_sha256',
          'package_manifest_sha256', 'generation_tool', 'generation_tool_version', 'file_count'):
    if not prov.get(k):
        bad.append('provenance is missing %s' % k)
body = open(os.path.join(iso, 'package-manifest.json'), encoding='utf-8').read()
if hashlib.sha256(body.encode('utf-8')).hexdigest() != prov.get('package_manifest_sha256'):
    bad.append('provenance package_manifest_sha256 does not match the manifest it describes')
if prov.get('normative_manifest_sha256') != man.get('normative_manifest_sha256'):
    bad.append('provenance and manifest disagree on the Normative Manifest digest')

# The package must say what it is, in the required words. Compared with line breaks flattened: a
# rewrapped sentence is the same sentence.
readme = ' '.join(open(os.path.join(iso, 'README.md'), encoding='utf-8').read().split())
for phrase in ('derived distribution of the BANZA v1.0.0 public normative surface',
               'not an independent specification',
               'Normative Manifest remains authoritative',
               'reference implementation is intentionally excluded'):
    if phrase not in readme:
        bad.append('the package README does not say: %s' % phrase)

# No hidden dependency: every $ref and every markdown link to a repository path must resolve inside.
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

# Links inside code spans are examples of syntax, not references. Blanking them first keeps a
# regex in a `code span` from being read as a dangling link.
LINK = re.compile(r'\]\(([^)\s]+)\)')
CODE = re.compile(r'`[^`]*`')
declared_outbound = {o['target'] for o in man.get('outbound_references', [])}
for rel in sorted(listed):
    full = os.path.join(iso, rel)
    if rel.endswith('.json'):
        try:
            doc = json.load(open(full, encoding='utf-8'))
        except ValueError:
            bad.append('not parseable: %s' % rel); continue
        found = set()
        refs(doc, found)
        for r in sorted(found):
            if r.startswith('#'):
                continue
            t = r.split('#', 1)[0]
            if t.startswith('https://banza.network/'):
                t = t[len('https://banza.network/'):]
            elif t.startswith('http'):
                continue
            else:
                t = os.path.normpath(os.path.join(os.path.dirname(rel), t))
            if t not in listed:
                bad.append('$ref leaves the package: %s -> %s' % (rel, r))
    if rel.endswith('.md'):
        text = open(full, encoding='utf-8').read()
        text = CODE.sub(lambda m: ' ' * len(m.group(0)), text)
        for link in LINK.findall(text):
            if link.startswith(('http', '#', 'mailto:')):
                continue
            t = os.path.normpath(os.path.join(os.path.dirname(rel), link.split('#', 1)[0]))
            if not t or t in listed or os.path.exists(os.path.join(iso, t)):
                continue
            # The exported files are byte-identical copies, so their links are not rewritten. A link
            # that leaves the package is acceptable ONLY as a declared non-dependency: the manifest
            # must name it and say what it is. An undeclared one is a hidden dependency on the
            # repository, which is the thing this whole phase exists to rule out.
            if t in declared_outbound:
                continue
            bad.append('UNDECLARED outbound link: %s -> %s' % (rel, link))

for o in man.get('outbound_references', []):
    if o.get('kind') == 'unresolved':
        bad.append('outbound reference resolves to nothing on the normative surface: %s'
                   % o['target'])
    if not o.get('why') or not o.get('referenced_by'):
        bad.append('outbound reference %s is declared without a reason or a referrer' % o['target'])

if bad:
    for b in sorted(set(bad))[:20]:
        print('  FAIL: %s' % b)
    sys.exit(1)
print('     ok: closed — %d files, digests verified, provenance complete, every $ref and link '
      'resolves inside' % len(listed))
PY
  rm -rf "$ISO"

  # ---- STABLE -----------------------------------------------------------------------------------
  SNAP=$(mktemp -d)
  find "$pkg" -type f -exec shasum -a 256 {} \; | sed "s#$pkg##" | sort > "$SNAP/before"
  python3 tools/gen-clean-room-package.py "$(echo "$level" | tr '[:lower:]' '[:upper:]')" > /dev/null
  find "$pkg" -type f -exec shasum -a 256 {} \; | sed "s#$pkg##" | sort > "$SNAP/after"
  if ! cmp -s "$SNAP/before" "$SNAP/after"; then
    diff "$SNAP/before" "$SNAP/after" | head -5
    rm -rf "$SNAP"
    fail "$level is not reproducible: two exports from the same commit differ"
  fi
  rm -rf "$SNAP"
  echo "     ok: stable — two exports from the same commit are byte-identical"
done

# ---- the ledger ---------------------------------------------------------------------------------
python3 - "$LEDGER" <<'PY' || exit 1
import json, sys
s = json.load(open(sys.argv[1]))
req = set(s['required'])
need = {'question_id', 'trial_id', 'timestamp', 'protocol_version', 'target_profile',
        'package_digest', 'artefact', 'location', 'question', 'classification', 'resolution',
        'normative_change_required'}
if not need <= req:
    print('  FAIL: the ledger schema does not require: %s' % sorted(need - req)); sys.exit(1)
cls = set(s['properties']['classification']['enum'])
expect = {'CLARIFICATION', 'DISCOVERABILITY', 'AMBIGUITY', 'MISSING_RULE', 'CONFLICT',
          'VECTOR_GAP', 'TOOLING'}
if cls != expect:
    print('  FAIL: classification set drifted: %s' % sorted(cls ^ expect)); sys.exit(1)
# L4 alone must not be a complete evaluation configuration.
if not any(c.get('if', {}).get('properties', {}).get('target_profile', {}).get('const') == 'L4'
           and set(c.get('then', {}).get('required', []))
           >= {'external_profile_id', 'external_profile_version'}
           for c in s.get('allOf', [])):
    print('  FAIL: the ledger permits target_profile L4 without naming an external profile'); sys.exit(1)
print('  ok: question ledger — required fields present, 7 closed classifications, L4 needs its profile')
PY

# Every classification must be documented, or the closed set is closed in name only.
for c in CLARIFICATION DISCOVERABILITY AMBIGUITY MISSING_RULE CONFLICT VECTOR_GAP TOOLING; do
  grep -q "\`$c\`" clean-room/README.md || fail "classification $c is not documented in clean-room/README.md"
done
grep -q 'assistant is not part of the trial' clean-room/README.md \
  || fail "clean-room/README.md must state that the assistant is excluded from the trial"
grep -qi 'no independent implementation of BANZA has been demonstrated' clean-room/README.md \
  || fail "clean-room/README.md must keep stating the undemonstrated state"
echo "  ok: all 7 classifications documented; assistant excluded; undemonstrated state stated"

echo "clean-room-package: OK — allowlisted, closed, reproducible, and free of the reference implementation"
