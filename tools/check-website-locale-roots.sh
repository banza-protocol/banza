#!/usr/bin/env bash
# Each edition declares its own language, and no Portuguese public route was lost to the move.
#
# The Portuguese tree lives in the route group `website/app/(pt)/` and English at `website/app/en/`,
# because a nested layout cannot render `<html>`: without two real root layouts, English would inherit
# `lang="pt-PT"` and every English page would tell screen readers and search engines that it is
# Portuguese. That is the property this check exists to hold.
#
# Route groups contribute nothing to a URL, so the move must be invisible to the public. The second
# property is that it stayed invisible: every Portuguese page still answers at the address it always had.
#
# Three properties, because each alone fails in a different direction:
#
#   LANG      Portuguese root declares a Portuguese tag; English root declares English. Neither may
#             borrow the other's.
#   ROOTS     There is no `website/app/layout.tsx`. One root layout above both editions would silence
#             the whole question: English would nest under it and inherit its language.
#   ROUTES    Every Portuguese route present before the move is still present. A page quietly dropped
#             during a filesystem migration is a 404 nobody notices until a reader finds it.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== website-locale-roots =="

python3 - <<'PY'
import os, re, sys, tempfile

APP = 'website/app'
PT_ROOT = 'website/app/(pt)/layout.tsx'
EN_ROOT = 'website/app/en/layout.tsx'
I18N = 'website/lib/i18n.ts'

# The Portuguese public routes, as they were before the tree moved into the route group. This is a
# frozen expectation on purpose: deriving it from the current tree would make the check agree with
# whatever the tree happens to say, including a page that was dropped.
EXPECTED_PT_ROUTES = [
    '/', '/arquitectura', '/banzai', '/banzai/operador/[operatorId]',
    '/banzai/operador/[operatorId]/[implementationId]', '/certificacao', '/confianca',
    '/conformidade', '/decisoes', '/decisoes/[slug]', '/estado', '/faq', '/federacao', '/glossario',
    '/governacao', '/governanca', '/licenca', '/operadores', '/oz', '/porque-existe',
    '/programadores', '/referencia', '/referencia/[capitulo]', '/referencia/completa',
    '/referencia/postgresql', '/referencia/racional', '/registo-tecnico', '/whitepaper',
    '/whitepaper/en', '/whitepaper/pt', '/whitepaper/versions',
]

problems = []


def routes_of(root):
    """The public routes a page tree serves. The `(pt)` group is stripped: it is not part of a URL."""
    out = []
    for dirpath, _dirs, files in os.walk(root):
        if 'page.tsx' not in files:
            continue
        rel = dirpath[len(APP):].replace('/(pt)', '', 1)
        out.append(rel or '/')
    return sorted(out)


def lang_of(path):
    """The language a root layout declares, resolved through the HTML_LANG map when used."""
    if not os.path.exists(path):
        return None
    text = open(path, encoding='utf-8').read()
    m = re.search(r'lang=\{HTML_LANG\.(pt|en)\}', text)
    if m:
        return m.group(1)
    m = re.search(r'lang="([a-zA-Z-]+)"', text)
    if m:
        return {'pt-PT': 'pt', 'pt': 'pt', 'en': 'en'}.get(m.group(1), m.group(1))
    return None


def selftest():
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, 'l.tsx')
        for text, expect in [('<html lang={HTML_LANG.pt}>', 'pt'),
                             ('<html lang={HTML_LANG.en}>', 'en'),
                             ('<html lang="pt-PT">', 'pt'),
                             ('<html lang="en">', 'en'),
                             ('<html>', None)]:
            open(p, 'w', encoding='utf-8').write(text)
            got = lang_of(p)
            if got != expect:
                print('SELFTEST FAIL: %r read as %r, expected %r' % (text, got, expect),
                      file=sys.stderr)
                sys.exit(2)
        # A page under the group must map to the URL without it, or the route comparison below would
        # report every Portuguese page as missing and every group path as new.
        os.makedirs(os.path.join(tmp, 'website/app/(pt)/estado'))
        open(os.path.join(tmp, 'website/app/(pt)/estado/page.tsx'), 'w').close()
        cwd = os.getcwd()
        os.chdir(tmp)
        try:
            got = routes_of(APP)
        finally:
            os.chdir(cwd)
        if got != ['/estado']:
            print('SELFTEST FAIL: the group leaked into the public route: %r' % got, file=sys.stderr)
            sys.exit(2)
    print('  selftest ok — both lang spellings read correctly, a missing lang is None, and the route')
    print('  group does not leak into a public URL')


selftest()

# ROOTS — nothing above the two editions.
if os.path.exists(os.path.join(APP, 'layout.tsx')):
    problems.append('website/app/layout.tsx exists. A root layout above both editions makes English '
                    'nest under it and inherit its language, which is the whole reason the Portuguese '
                    'tree is in a route group.')
for p in (PT_ROOT, EN_ROOT):
    if not os.path.exists(p):
        problems.append('%s is missing — that edition has no root layout' % p)

# LANG — each edition declares its own, and neither borrows the other's.
pt_lang, en_lang = lang_of(PT_ROOT), lang_of(EN_ROOT)
if pt_lang != 'pt':
    problems.append('%s declares lang %r; the Portuguese edition must declare Portuguese'
                    % (PT_ROOT, pt_lang))
if en_lang != 'en':
    problems.append('%s declares lang %r; the English edition must declare English'
                    % (EN_ROOT, en_lang))

# ROUTES — the move was invisible to the public.
actual = routes_of(APP)
missing = [r for r in EXPECTED_PT_ROUTES if r not in actual]
for r in missing:
    problems.append('the public route %s is gone. Route groups do not change URLs, so a route that '
                    'disappeared during the move is a page readers can no longer reach.' % r)

# The English edition is published page by page, and the route map is the record of which pages exist.
# A pair that promises an English path must actually have one.
if os.path.exists(I18N):
    text = open(I18N, encoding='utf-8').read()
    for key, en in re.findall(r'key:\s*"([^"]+)",\s*pt:\s*"[^"]*",\s*en:\s*"([^"]+)"', text):
        rel = en[len('/en'):] or '/'
        page = os.path.join(APP, 'en', rel.lstrip('/'), 'page.tsx') if rel != '/' \
            else os.path.join(APP, 'en', 'page.tsx')
        if not os.path.exists(page):
            problems.append('%s promises the English route %s for %r, but %s does not exist. A route '
                            'map that names an unwritten page produces a link to a 404 and a dangling '
                            'hreflang.' % (I18N, en, key, page))

if problems:
    print()
    for p in problems:
        print('  FAIL: %s' % p)
    sys.exit(1)

en_routes = [r for r in routes_of(os.path.join(APP, 'en'))] if os.path.isdir(os.path.join(APP, 'en')) else []
print('  ok: two root layouts — %s declares Portuguese, %s declares English, and nothing sits above them'
      % (PT_ROOT, EN_ROOT))
print('  ok: all %d Portuguese public routes preserved through the route-group move'
      % len(EXPECTED_PT_ROUTES))
print('  ok: %d published English route(s), each backed by a real page' % len(en_routes))
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "website-locale-roots: OK"; else echo "website-locale-roots: FAILED"; fi
exit "$rc"
