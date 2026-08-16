#!/usr/bin/env bash
# The website's decision library is a derivation of decisions/{adr,rfc}/, and nothing in it is authored.
#
# Two things are derived, and each broke in its own way:
#
#   the MARKDOWN MIRROR (website/content/decisions/) exists because the site's Docker build context is
#   website/, so the documents must live inside it. That is packaging, not editing.
#
#   the REGISTRY (website/lib/decisions.ts) is what the site actually builds against. It gained three
#   entries by hand without the `type` field its own interface requires and the site stopped compiling;
#   nothing caught it, because the registry is TypeScript and the build was not a CI job. Separately, it
#   understood only the ADR heading format, so all six RFCs were absent — present on disk, mirrored into
#   the site, counted by the page's own "N RFCs" chip as zero, and unreachable from the library.
#
# Four properties:
#
#   1. the mirror is byte-identical and covers the same set
#   2. the registry REPRODUCES — regenerating from the canonical inputs yields the tracked file exactly,
#      and does so deterministically (two independent runs agree)
#   3. closed-world coverage — every canonical record is registry-visible and every entry has a record;
#      no duplicate identity on either side
#   4. every entry carries the full declared shape, and every category in use is offered by the filter,
#      so no record is reachable only by knowing its URL
#
# Property 2 is verified by generating a CANDIDATE INTO A TEMPORARY DIRECTORY and comparing. The tracked
# file is never rewritten: generators write, checks observe. A clean tree is still clean afterwards.
#
# Exit 1 on violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
echo "== website-decisions-parity =="

for kind in adr rfc; do
  src="decisions/$kind"; dst="website/content/decisions/$kind"
  [ -d "$src" ] || continue
  [ -d "$dst" ] || { echo "  FAIL: $dst is missing"; fail=1; continue; }
  a=$(ls "$src" | grep -E '\.md$' | grep -v '^README.md$' | sort)
  b=$(ls "$dst" | grep -E '\.md$' | sort)
  if [ "$a" != "$b" ]; then
    echo "  FAIL: $kind mirror does not cover the same set"; diff <(echo "$a") <(echo "$b") | head -6 | sed 's/^/    /'; fail=1; continue
  fi
  while IFS= read -r f; do
    cmp -s "$src/$f" "$dst/$f" || { echo "  FAIL: $kind/$f differs from its canonical source"; fail=1; }
  done <<< "$a"
  echo "  ok: $kind — $(echo "$a" | wc -l | tr -d ' ') records, byte-identical"
done

# ── 2 — the registry reproduces, deterministically, without being touched ─────────────────────────────
reproduces() {
  local root="$1" tmp rc=0
  tmp="$(mktemp -d)"
  local before after
  before=$( [ -f "$root/website/lib/decisions.ts" ] && shasum -a 256 "$root/website/lib/decisions.ts" | cut -d' ' -f1 || echo absent )

  ( cd "$root" && BANZA_DECISIONS_REGISTRY_OUT="$tmp/a.ts" node tools/gen-website-decisions-registry.mjs >/dev/null 2>"$tmp/e1" ) || {
    echo "  FAIL: the generator refused to run — $(tail -1 "$tmp/e1")"; rm -rf "$tmp"; return 1; }
  ( cd "$root" && BANZA_DECISIONS_REGISTRY_OUT="$tmp/b.ts" node tools/gen-website-decisions-registry.mjs >/dev/null 2>&1 ) || {
    echo "  FAIL: the generator refused on the second run"; rm -rf "$tmp"; return 1; }

  if ! cmp -s "$tmp/a.ts" "$tmp/b.ts"; then
    echo "  FAIL: two runs over identical inputs disagree — the generator is not deterministic"; rc=1
  fi
  if ! cmp -s "$tmp/a.ts" "$root/website/lib/decisions.ts"; then
    echo "  FAIL: website/lib/decisions.ts is NOT what the generator produces — it has been edited by hand,"
    echo "        or a canonical input changed without regenerating. Curated wording belongs in"
    echo "        decisions/registry-metadata.json; run: node tools/gen-website-decisions-registry.mjs"
    diff <(cat "$tmp/a.ts") "$root/website/lib/decisions.ts" | head -8 | sed 's/^/    /'
    rc=1
  fi

  # The check must not have written anything. This is the property, not a courtesy.
  after=$( [ -f "$root/website/lib/decisions.ts" ] && shasum -a 256 "$root/website/lib/decisions.ts" | cut -d' ' -f1 || echo absent )
  if [ "$before" != "$after" ]; then
    echo "  FAIL: verifying reproduction MODIFIED the tracked registry — a check must observe, not write"; rc=1
  fi
  rm -rf "$tmp"
  [ $rc -eq 0 ] && echo "  ok: registry reproduces byte-identically from canonical inputs, twice, without being touched"
  return $rc
}

# ── 3 + 4 — closed-world coverage and shape ──────────────────────────────────────────────────────────
registry() {
  python3 - "$1" <<'PY'
import json, os, re, sys

root = sys.argv[1]
p = os.path.join(root, 'website/lib/decisions.ts')
if not os.path.exists(p):
    print('  FAIL: website/lib/decisions.ts is missing — the site has no decision registry')
    sys.exit(1)
text = open(p, encoding='utf8').read()
bad = []

# The declared shape, read from the interface rather than restated here: a second declaration of the
# shape is a second place for it to be wrong. Optional fields (`name?:`) are not required of an entry.
iface = re.search(r'export interface Decision \{(.*?)\n\}', text, re.S)
if not iface:
    print('  FAIL: decisions.ts declares no Decision interface — nothing pins the shape')
    sys.exit(1)
required = [m.group(1) for m in re.finditer(r'^\s*(\w+)\s*:', iface.group(1), re.M)]
if not required:
    print('  FAIL: the Decision interface declares no fields')
    sys.exit(1)

# Up to the first `];` — a JSON string value never contains that pair, so this matches the
# array whether the generator pretty-prints it or emits it on one line. The earlier form required a
# newline before the bracket, which quietly matched nothing on a compact array.
m = re.search(r'export const decisions: Decision\[\] = (\[[\s\S]*?\])\s*;', text)
if not m:
    print('  FAIL: decisions.ts has no parseable decisions array')
    sys.exit(1)
try:
    entries = json.loads(m.group(1))
except Exception as e:
    print(f'  FAIL: the decisions array is not valid JSON — {str(e)[:90]}')
    sys.exit(1)

TYPES, STATES = {'ADR', 'RFC'}, {'activo', 'rascunho', 'substituido'}
for e in entries:
    who = e.get('id') or '<entry with no id>'
    for f in required:
        v = e.get(f)
        if v is None:
            bad.append(f'{who}: does not declare `{f}`, which the Decision interface requires')
        elif not str(v).strip():
            bad.append(f'{who}: declares `{f}` empty')
    if e.get('type') and e['type'] not in TYPES:
        bad.append(f"{who}: type {e['type']!r} is not one of {sorted(TYPES)}")
    if e.get('status') and e['status'] not in STATES:
        bad.append(f"{who}: status {e['status']!r} is not one the library filter offers {sorted(STATES)}")
    if e.get('id') and e.get('slug') and e['slug'] != e['id'].lower():
        bad.append(f"{who}: slug {e['slug']!r} does not derive from the id")
    if e.get('path') and not os.path.exists(os.path.join(root, e['path'])):
        bad.append(f"{who}: path {e['path']} does not exist — the page would 404")
    if e.get('path') and e.get('canonicalUrl') and not e['canonicalUrl'].endswith(e['path']):
        bad.append(f'{who}: canonicalUrl does not point at its own path')

# 3 — CLOSED WORLD. Both directions, and duplicates on both sides. The RFC gap was exactly this: the
# records existed, so nothing looked wrong, and the registry simply did not carry them.
on_disk, counts = {}, {}
for kind, pat in (('adr', re.compile(r'^#\s*(ADR-\d{3,4})\b', re.M)), ('rfc', None)):
    d = os.path.join(root, 'decisions', kind)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith('.md') or f == 'README.md':
            continue
        head = open(os.path.join(d, f), encoding='utf8', errors='replace').read(4000)
        if kind == 'adr':
            t = pat.search(head)
            rid = t.group(1) if t else None
        else:
            fm = re.match(r'^---\r?\n([\s\S]*?)\r?\n---', head)
            n = re.search(r'^rfc:\s*(\d+)\s*$', fm.group(1), re.M) if fm else None
            rid = f'RFC-{int(n.group(1)):04d}' if n else None
        if not rid:
            bad.append(f'decisions/{kind}/{f} declares no parseable identity — it can never reach the registry')
            continue
        counts[rid] = counts.get(rid, 0) + 1
        on_disk[rid] = f'decisions/{kind}/{f}'

for dup, n in sorted(counts.items()):
    if n > 1:
        bad.append(f'{dup} is declared by {n} canonical records — the identity is ambiguous')

listed = [e['id'] for e in entries if e.get('id')]
seen = set()
for i in listed:
    if i in seen:
        bad.append(f'{i} appears more than once in the registry — the library would render it twice')
    seen.add(i)
for missing in sorted(set(on_disk) - seen):
    bad.append(f'{missing} exists as a canonical record but is NOT registry-visible ({on_disk[missing]})')
for phantom in sorted(seen - set(on_disk)):
    bad.append(f'{phantom} is listed by the registry but no canonical record declares it')

# 4 — every category in use must be offered by the theme filter, or the record is reachable only by URL.
cats = re.search(r'export const decisionCategories: string\[\] = (\[[\s\S]*?\])\s*;', text)
declared = set()
if cats:
    try:
        declared = set(json.loads(cats.group(1)))
    except Exception:
        bad.append('decisionCategories is not valid JSON')
used = {e.get('category', '') for e in entries if e.get('category')}
for c in sorted(used - declared):
    bad.append(f'category {c!r} is on a record but absent from decisionCategories — those records are unfilterable')
for c in sorted(declared - used):
    bad.append(f'category {c!r} is offered by the filter but no record uses it — it selects an empty library')

for b in bad:
    print(f'  FAIL: {b}')
if bad:
    sys.exit(1)
adr = sum(1 for e in entries if e.get('type') == 'ADR')
rfc = sum(1 for e in entries if e.get('type') == 'RFC')
print(f'  ok: closed world — {len(entries)} entries ({adr} ADR, {rfc} RFC) = {len(on_disk)} canonical records, '
      f'no gap, no phantom, no duplicate')
print(f'  ok: shape — all {len(required)} required fields on every entry; {len(declared)} categories, '
      f'each with records and each offered by the filter')
PY
}

# ── self-test: each property must actually fail when violated ────────────────────────────────────────
selftest() {
  local d st=0
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  mkdir -p "$d/website/lib" "$d/decisions/adr"
  printf '# ADR-001 — X\n' > "$d/decisions/adr/ADR-001-x.md"
  write_registry() {
    local cats="${2:-}"
    [ -n "$cats" ] || cats='["C"]'
    python3 - "$d" "$1" "$cats" <<'PY'
import sys
root, body, cats = sys.argv[1], sys.argv[2], sys.argv[3]
open(root + '/website/lib/decisions.ts', 'w').write(
    'export type DecisionType = "ADR" | "RFC";\n'
    'export type DecisionStatus = "activo" | "rascunho" | "substituido";\n'
    'export interface Decision {\n  type: DecisionType;\n  id: string;\n  slug: string;\n'
    '  title: string;\n  status: DecisionStatus;\n  path: string;\n  canonicalUrl: string;\n'
    '  category: string;\n  summary: string;\n}\n\n'
    'export const decisions: Decision[] = ' + body + ';\n\n'
    'export const decisionCategories: string[] = ' + cats + ';\n')
PY
  }
  local good='[
  {
    "type": "ADR",
    "id": "ADR-001",
    "slug": "adr-001",
    "title": "X",
    "status": "activo",
    "path": "decisions/adr/ADR-001-x.md",
    "canonicalUrl": "https://example.invalid/decisions/adr/ADR-001-x.md",
    "category": "C",
    "summary": "s"
  }
]'
  write_registry "$good"
  registry "$d" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: a well-formed registry was rejected" >&2; st=1; }

  # the PR #15 regression: an entry that omits a required field
  write_registry "$(printf '%s' "$good" | grep -v '"type"')"
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an entry missing a required field was accepted" >&2; st=1; }

  # the RFC regression: a canonical record the registry does not carry
  write_registry '[]' '[]'
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an unlisted canonical record was accepted" >&2; st=1; }

  # an entry with no record behind it
  write_registry "$(printf '%s' "$good" | sed 's|ADR-001-x.md|ADR-999-ghost.md|g; s|"ADR-001"|"ADR-999"|; s|"adr-001"|"adr-999"|')"
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an entry with no canonical record was accepted" >&2; st=1; }

  # the same record listed twice
  write_registry "$(printf '%s' "$good" | python3 -c 'import json,sys; e=json.load(sys.stdin); print(json.dumps(e+e))')"
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a duplicated registry identity was accepted" >&2; st=1; }

  # a category on a record that the filter does not offer
  write_registry "$good" '["OTHER"]'
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an unfilterable category was accepted" >&2; st=1; }

  # a status outside the set the filter can select
  write_registry "$(printf '%s' "$good" | sed 's|"activo"|"proposto"|')"
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an unselectable status was accepted" >&2; st=1; }

  return $st
}

if ! selftest; then echo "website-decisions-parity: guard self-test broken"; exit 2; fi

reproduces "$PWD" || fail=1
registry "$PWD" || fail=1
[ "$fail" -eq 0 ] || exit 1
echo "website-decisions-parity: OK — the mirror and the registry are derivations, and both reproduce"
