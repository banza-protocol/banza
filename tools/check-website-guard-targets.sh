#!/usr/bin/env bash
# Every website source path a guard names still resolves.
#
# The Portuguese page tree lives under a route group, `website/app/(pt)/`, so that Portuguese and
# English can have genuine root layouts and therefore correct `<html lang>`. Route groups do not appear
# in URLs, so no public address changed — but every guard that reads a page by literal path did change,
# and that is the dangerous part:
#
#   A guard that greps a path which no longer exists finds nothing, and finding nothing is
#   indistinguishable from finding nothing wrong. It reports PASS and stops protecting anything.
#
# This is the meta-property that makes such a move safe. It does not check page CONTENT — the
# individual guards do that. It checks that their SUBJECTS are still there to be checked.
#
# The list of subjects is not a registry that can drift: it is derived from the references the guards
# themselves contain. A guard that starts reading a new page is covered automatically, and one whose
# path rots is caught the next time this runs.
#
# Two properties:
#
#   POSITIVE  Every website path named by an active tool resolves EXACTLY where the tool says it is.
#             A path that exists only under the route group is a STALE reference, not a resolution: the
#             tool will read nothing there. Accepting it would be the very blindness this check exists
#             to prevent.
#   BOUNDARY  Every declared must-not-exist path is absent from BOTH the app root and the route group.
#             A retired route recreated inside `(pt)/` would otherwise be invisible to the guard that
#             retired it.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== website-guard-targets =="

python3 - <<'PY'
import os, re, subprocess, sys, tempfile

APP = 'website/app'
PT_GROUP = 'website/app/(pt)'

# Paths a guard names in order to assert they are ABSENT: routes that were deliberately retired, and
# fixtures a self-test plants under a name that must never be real. Each needs a reason, because an
# undocumented entry here is how a genuinely missing page gets excused.
#
# Absence is checked in both the app root and the route group — a retired route recreated inside the
# group would satisfy the original guard while being perfectly reachable to the public.
MUST_NOT_EXIST = {
    'website/app/roteiro': 'Retired: the roadmap surface was folded into the Reference (308 to §14).',
    'website/app/evolucao': 'Retired alongside /roteiro; never a separate public surface.',
    'website/app/o-que-e': 'Retired: the introductory definition is Reference chapter 1.',
    'website/app/operador-zero': 'Never a route here — Operador Zero is served at its own host.',
    'website/app/bad.ts': 'A guard self-test fixture name, planted in a temporary tree only.',
    'website/app/x': 'A guard self-test fixture name, planted in a temporary tree only.',
}

# Tools are the subject, and so is the website's own test suite: a test that reads a page by path is a
# guard, and it goes just as quiet when the path rots. Generated indexes and compiled artifacts are not
# authored references.
SCAN_ROOTS = ['tools', 'engines', 'services', 'website/lib', 'website/components']
SKIP_SUFFIX = ('.wasm', '.woff2', '.png', '.jpg', '.pdf')
# Generated corpora quote documentation that happens to contain paths; they are not guards.
SKIP_PATH = ('/repoindex/', '/rustkb/', '/validatewasm/', 'doc-index.json', 'node_modules/',
             'website/lib/wasm/')

# Both spellings are used: tools name `website/app/...`, and the website's own tests name `app/...`
# relative to the package. Either way it is the same file, and either way a stale one reads nothing.
REF = re.compile(r'(?:website/)?app/(?:\(pt\)/)?[A-Za-z0-9_.\[\]/-]*[A-Za-z0-9_\]]')


# `app/` also appears inside unrelated paths ("website/app/components/lib" is not a route). A relative
# reference counts only when its first segment is really a route: the group itself, something currently
# in the app tree, or a name declared absent below. That set is read from the tree, so it needs no
# maintenance.
def route_segments():
    seg = {'(pt)'}
    for d in (APP, PT_GROUP):
        if os.path.isdir(d):
            seg |= set(os.listdir(d))
    seg |= {k.split('/')[-1] for k in MUST_NOT_EXIST}
    return seg


SEGMENTS = route_segments()


def absolute(ref):
    """The repository-relative form of a reference, or None if it is not a route reference at all."""
    if ref.startswith('website/'):
        return ref
    rest = ref[len('app/'):]
    first = rest.split('/', 1)[0]
    return 'website/' + ref if first in SEGMENTS else None


def tracked():
    out = subprocess.run(['git', 'ls-files'] + SCAN_ROOTS, capture_output=True, text=True).stdout
    return [f for f in out.split()
            if not f.endswith(SKIP_SUFFIX) and not any(s in f for s in SKIP_PATH)]


def references():
    """Every website/app path named by an active tool, with where it was named."""
    found = {}
    for f in tracked():
        try:
            text = open(f, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for m in REF.finditer(text):
            p = absolute(m.group(0).rstrip('.'))
            if p is None:
                continue
            # A trailing dot is prose punctuation, not part of a path.
            found.setdefault(p, set()).add(f)
    return found


def classify(ref, root='.'):
    """`ok` if the path is there; `stale` if the page moved into the group and the path did not;
    `missing` if it is nowhere."""
    if os.path.exists(os.path.join(root, ref)):
        return 'ok'
    if ref.startswith(APP + '/') and not ref.startswith(PT_GROUP + '/'):
        rel = ref[len(APP) + 1:]
        if os.path.exists(os.path.join(root, PT_GROUP, rel)):
            return 'stale'
    return 'missing'


def normalise(p):
    """The group-free spelling of a path, for matching against the declared-absent list."""
    return p.replace(PT_GROUP + '/', APP + '/', 1)


def selftest():
    with tempfile.TemporaryDirectory() as tmp:
        os.makedirs(os.path.join(tmp, 'website/app/(pt)/estado'))
        open(os.path.join(tmp, 'website/app/(pt)/estado/page.tsx'), 'w').close()

        def status(ref, root=tmp):
            return classify(ref, root)

        # The path a tool names, exactly as it names it.
        if status('website/app/(pt)/estado/page.tsx') != 'ok':
            print('SELFTEST FAIL: a correct path did not resolve', file=sys.stderr)
            sys.exit(2)
        # The pre-move path: the page exists, but NOT where the tool will look. This must be reported
        # as stale, not accepted. If this ever returns ok, every guard reading the old path goes quiet
        # while this check reports success — the exact failure it exists to prevent.
        if status('website/app/estado/page.tsx') != 'stale':
            print('SELFTEST FAIL: a stale pre-move path was not reported stale', file=sys.stderr)
            sys.exit(2)
        # A path to nothing at all is missing, in either spelling.
        if status('website/app/(pt)/nao-existe/page.tsx') != 'missing':
            print('SELFTEST FAIL: a nonexistent target was not reported missing', file=sys.stderr)
            sys.exit(2)
        # Absence is checked in both places: a retired route recreated inside the group must be found.
        os.makedirs(os.path.join(tmp, 'website/app/(pt)/roteiro'))
        open(os.path.join(tmp, 'website/app/(pt)/roteiro/page.tsx'), 'w').close()
        if status('website/app/(pt)/roteiro/page.tsx') != 'ok':
            print('SELFTEST FAIL: a retired route recreated under (pt) was not seen', file=sys.stderr)
            sys.exit(2)
    print('  selftest ok — a correct path resolves, a pre-move path is STALE (not accepted), a path to')
    print('  nothing is missing, and a retired route recreated inside the group is still found')


selftest()

problems = []
refs = references()

for ref, where in sorted(refs.items()):
    n = normalise(ref)
    rel = n[len(APP) + 1:] if n.startswith(APP + '/') else ''
    if not rel:
        continue  # a reference to the app root itself
    in_app = os.path.exists(n)
    in_group = os.path.exists(os.path.join(PT_GROUP, rel))

    forbidden = next((k for k in MUST_NOT_EXIST if n == k or n.startswith(k + '/')), None)
    if forbidden:
        if in_app or in_group:
            at = n if in_app else os.path.join(PT_GROUP, rel)
            problems.append('%s exists but is declared absent (%s) — named by %s'
                            % (at, MUST_NOT_EXIST[forbidden], ', '.join(sorted(where))))
        continue

    state = classify(ref)
    if state == 'stale':
        problems.append('%s is STALE — the page moved into %s and this reference did not, so %s will'
                        ' read nothing there.\n        Finding nothing looks exactly like finding'
                        ' nothing wrong.'
                        % (ref, PT_GROUP, ', '.join(sorted(where))))
    elif state == 'missing':
        problems.append('%s does not exist, in the app root or under %s — named by %s'
                        % (ref, PT_GROUP, ', '.join(sorted(where))))

if problems:
    print()
    for p in problems:
        print('  FAIL: %s' % p)
    print()
    print('  Point the reference at the current source path, or declare it in MUST_NOT_EXIST with a')
    print('  reason. Do not leave a guard pointed at a path that moved.')
    sys.exit(1)

mandatory = sum(1 for r in refs if not any(normalise(r) == k or normalise(r).startswith(k + '/')
                                           for k in MUST_NOT_EXIST))
print('  ok: %d website source paths named by tools resolve exactly as written (%d declared absent,'
      ' checked in both the app root and %s)' % (mandatory, len(MUST_NOT_EXIST), PT_GROUP))
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "website-guard-targets: OK"; else echo "website-guard-targets: FAILED"; fi
exit "$rc"
