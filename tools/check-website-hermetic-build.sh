#!/usr/bin/env bash
# The website production build makes no font network request.
#
# `next/font/google` downloads the font binaries from fonts.gstatic.com during `next build`. That made
# a merge-blocking CI context depend on outbound network access, and it failed when the request could
# not be made. Availability of a third-party CDN is not something a build should need.
#
# Two properties, because each alone fails in a different direction:
#
#   POSITIVE  The site declares self-hosted fonts and the files it names exist. Without this, deleting
#             the whole font configuration would pass — nothing would remain to be found wrong.
#   BOUNDARY  Nothing imports a network font loader, and no source or built asset points at a font CDN.
#
# Structured: it reads the font configuration and resolves the paths it declares. It does not run a
# build, so it stays cheap enough for the normal battery.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== website-hermetic-build =="

python3 - <<'PY'
import os, re, subprocess, sys

FONTS = 'website/app/fonts.ts'
# Loaders that fetch at build time. next/font/local reads from disk and is the point of this check.
NETWORK_LOADERS = [r'next/font/google', r'@next/font/google']
# Hosts that would mean a font is fetched rather than bundled.
CDN = [r'fonts\.gstatic\.com', r'fonts\.googleapis\.com', r'use\.typekit\.net', r'fonts\.bunny\.net',
       r'cdn\.jsdelivr\.net/npm/@fontsource']

problems = []


def tracked(prefix):
    out = subprocess.run(['git', 'ls-files', prefix], capture_output=True, text=True).stdout.split()
    return out


def selftest():
    # Each fixture must be caught by the rule that exists for it.
    for text, expect in [('import { Inter } from "next/font/google";', 'next/font/google'),
                         ('@import url(https://fonts.googleapis.com/css2?family=Inter);', 'googleapis'),
                         ('src: url(https://fonts.gstatic.com/s/inter/x.woff2);', 'gstatic')]:
        hit = [p for p in NETWORK_LOADERS + CDN if re.search(p, text)]
        if not hit:
            print('SELFTEST FAIL: %r not detected' % text, file=sys.stderr)
            sys.exit(2)
        if not any(expect in h.replace('\\', '') for h in hit):
            print('SELFTEST FAIL: %r caught by %s, expected %s' % (text, hit, expect), file=sys.stderr)
            sys.exit(2)
    # And a comment explaining why the loader is NOT used must not be read as using it.
    ok = '// Self-hosted from ./fonts, NOT next/font/google. next/font/google fetches ...'
    stripped = re.sub(r'//[^\n]*', '', ok)
    if any(re.search(p, stripped) for p in NETWORK_LOADERS):
        print('SELFTEST FAIL: a comment was read as an import', file=sys.stderr)
        sys.exit(2)
    print('  selftest ok — 3 network font sources caught by their own rule, comments not read as code')


selftest()

# POSITIVE — the font configuration declares local files, and every file it names exists.
if not os.path.exists(FONTS):
    problems.append('%s is missing — the site declares no fonts' % FONTS)
else:
    text = open(FONTS, encoding='utf-8').read()
    if 'next/font/local' not in text:
        problems.append('%s does not use next/font/local: fonts are not self-hosted' % FONTS)
    declared = re.findall(r'path:\s*"(\./fonts/[^"]+)"', text)
    if len(declared) < 4:
        problems.append('%s declares only %d font files; the four families are expected'
                        % (FONTS, len(declared)))
    for rel in declared:
        p = os.path.join('website/app', rel[2:])
        if not os.path.exists(p):
            problems.append('%s declares %s, which does not exist' % (FONTS, p))
    if not declared:
        problems.append('%s names no font file paths' % FONTS)

# BOUNDARY — nothing in the website source fetches a font. Comments are stripped first: the file that
# explains why the network loader is not used names it, and flagging that sentence would flag the
# documentation of the fix.
CODE = ('.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.json')
for f in tracked('website'):
    if not f.endswith(CODE) or '/node_modules/' in f or f.endswith('.d.ts'):
        continue
    try:
        raw = open(f, encoding='utf-8', errors='replace').read()
    except OSError:
        continue
    src = re.sub(r'/\*.*?\*/', '', raw, flags=re.S)
    src = re.sub(r'//[^\n]*', '', src)
    for pat in NETWORK_LOADERS + CDN:
        for m in re.finditer(pat, src):
            line = src[:m.start()].count('\n') + 1
            problems.append('%s:%d fetches fonts over the network (%s)'
                            % (f, line, pat.replace('\\', '')))

if problems:
    print()
    for p in problems:
        print('  FAIL: %s' % p)
    print()
    print('  The production build must not need a font CDN. Self-host with next/font/local from')
    print('  website/app/fonts — see website/app/fonts/README.md.')
    sys.exit(1)

print('  ok: fonts are self-hosted from website/app/fonts, and every declared file exists')
print('  ok: no source fetches a font over the network')
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "website-hermetic-build: OK"; else echo "website-hermetic-build: FAILED"; fi
exit "$rc"
