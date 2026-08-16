#!/usr/bin/env bash
# Every relative link in a CURRENT public document resolves to something that exists.
#
# Current documents only. Historical and evidence artifacts truthfully record paths that existed when
# they were written; rewriting them to satisfy a link checker would falsify the record, so they are out
# of scope by construction rather than by exception list.
#
# The property is narrow on purpose: it does not judge whether a link is the RIGHT target, only that it
# is not a dangling one. That is deterministic, needs no network, and writes nothing.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== current-doc link integrity =="

python3 - "$@" <<'PY'
import os, re, subprocess, sys, tempfile

tracked = set(subprocess.run(['git', 'ls-files'], capture_output=True, text=True).stdout.split())

# Historical record, generated mirrors, and vendored trees are not current documents.
OUT_OF_SCOPE = ('evidence/', 'assurance/', 'docs/audit/', 'website/', 'artifacts/',
                'clean-room/', 'conformance/package/', 'node_modules/')

LINK = re.compile(r'\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)')
# Markdown link syntax and a bracketed character class are indistinguishable to a regex — `[a-z0-9-]*`
# followed by a parenthesised group reads as a link. Documents that specify identifier grammars contain
# those legitimately, so a candidate whose target is not a plausible path is not a link at all.
PATHISH = re.compile(r'^[A-Za-z0-9._~@/-]+$')


def in_scope(path):
    return path.lower().endswith(('.md', '.mdx')) and not path.startswith(OUT_OF_SCOPE)


def broken_links(root, files):
    out = []
    for f in files:
        d = os.path.dirname(f)
        try:
            text = open(os.path.join(root, f), encoding='utf8', errors='replace').read()
        except OSError:
            continue
        for m in LINK.finditer(text):
            url = m.group(1)
            if url.startswith(('http://', 'https://', 'mailto:', '#', '<')):
                continue
            path = url.split('#')[0]
            if not path or not PATHISH.match(path):
                continue
            target = os.path.normpath(os.path.join(d, path))
            if target in tracked or os.path.exists(os.path.join(root, target)):
                continue
            out.append((f, text[:m.start()].count('\n') + 1, url))
    return out


def selftest():
    # A guard that cannot fail is not a guard. This plants a genuinely dangling link in a copy of the
    # tree and requires the detector to find it — the fixture has to land on the surface under test.
    with tempfile.TemporaryDirectory() as tmp:
        os.makedirs(os.path.join(tmp, 'docs'))
        planted = 'docs/selftest.md'
        with open(os.path.join(tmp, planted), 'w', encoding='utf8') as fh:
            fh.write('[gone](./does-not-exist.md)\n[fine](./selftest.md)\n')
        found = broken_links(tmp, [planted])
        if len(found) != 1 or 'does-not-exist' not in found[0][2]:
            print('SELFTEST FAIL: planted dangling link not detected (found %r)' % (found,),
                  file=sys.stderr)
            sys.exit(2)
        # And a bracketed character class must not be mistaken for a link.
        grammar = 'docs/grammar.md'
        with open(os.path.join(tmp, grammar), 'w', encoding='utf8') as fh:
            fh.write('Identifiers match `[a-z0-9-]*[a-z0-9]` and nothing else.\n')
        if broken_links(tmp, [grammar]):
            print('SELFTEST FAIL: a character class was read as a link', file=sys.stderr)
            sys.exit(2)
    print('  selftest ok')


selftest()

files = sorted(f for f in tracked if in_scope(f))
bad = broken_links('.', files)
print('  %d current documents scanned' % len(files))
if bad:
    print()
    for f, line, url in bad:
        print('  FAIL %s:%d  %s' % (f, line, url))
    print()
    print('  %d broken relative link(s) in current documents.' % len(bad))
    print('  Point them at the current target, or drop the claim — do not restore a deleted file to')
    print('  satisfy a link.')
    sys.exit(1)
print('  ok: every relative link in a current document resolves')
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "current-doc-links: OK"; else echo "current-doc-links: FAILED"; fi
exit "$rc"
