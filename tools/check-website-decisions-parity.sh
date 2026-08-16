#!/usr/bin/env bash
# The website's decision records are a derivation, not a second copy.
#
# The site renders ADRs and RFCs and its Docker build context is website/, so the documents must exist
# inside it. That is packaging, not editing. This guard proves the mirror is byte-identical to
# decisions/{adr,rfc}/ and covers exactly the same set — which is what makes it safe for other guards
# to treat the mirror as derived rather than re-scanning it as authored copy.
#
# It also checks the registry the site builds against, website/lib/decisions.ts, because that file is
# where the derivation actually broke: three records were appended by hand without the `type` field its
# own `Decision` interface declares, and the site stopped compiling. Nothing caught it — the registry is
# TypeScript, the type error only appears in `npm run build`, and the build was not a CI job. The build
# is one now; this guard is the fast, precise half of the same coverage, and it catches the shape errors
# a build would only report as a type error somewhere downstream.
#
# Two properties, one for each half:
#
#   1. the markdown mirror is byte-identical and covers the same set
#   2. every registry entry declares the FULL declared shape, and the registry covers exactly the
#      records that exist — no invented entry, no missing one
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

# ── the registry the site compiles against ───────────────────────────────────────────────────────────
# Reads the REQUIRED FIELDS out of the `Decision` interface in the same file rather than hard-coding
# them, so adding a field to the interface immediately requires it of every entry. Hard-coding the list
# here would be a second declaration of the shape, and a second place for it to be wrong.
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

# The declared shape. Optional fields (`name?:`) are not required of an entry.
iface = re.search(r'export interface Decision \{(.*?)\n\}', text, re.S)
if not iface:
    print('  FAIL: decisions.ts declares no Decision interface — nothing pins the shape')
    sys.exit(1)
required = [m.group(1) for m in re.finditer(r'^\s*(\w+)\s*:', iface.group(1), re.M)]
if not required:
    print('  FAIL: the Decision interface declares no fields')
    sys.exit(1)

m = re.search(r'export const decisions: Decision\[\] = (\[.*?\n\]);', text, re.S)
if not m:
    print('  FAIL: decisions.ts has no parseable decisions array')
    sys.exit(1)
try:
    entries = json.loads(m.group(1))
except Exception as e:
    print(f'  FAIL: the decisions array is not valid JSON — {str(e)[:90]}')
    sys.exit(1)

# 2a — every entry declares the full shape, with usable values.
TYPES = {'ADR', 'RFC'}
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
    if e.get('id') and e.get('slug') and e['slug'] != e['id'].lower():
        bad.append(f"{who}: slug {e['slug']!r} does not derive from the id")
    if e.get('path') and not os.path.exists(os.path.join(root, e['path'])):
        bad.append(f"{who}: path {e['path']} does not exist — the page would 404")
    if e.get('path') and e.get('canonicalUrl') and not e['canonicalUrl'].endswith(e['path']):
        bad.append(f'{who}: canonicalUrl does not point at its own path')

# 2b — the registry covers exactly the records on disk. A record present in the tree and absent here is
# invisible on the site; an entry here with no record is a dead link.
#
# The registry is derived from the `# ID — Title` heading, so a record that titles itself another way is
# outside its input contract. Those are COUNTED AND NAMED below rather than quietly skipped: a record
# the site cannot see is worth knowing about even when it is not this guard's failure.
on_disk, untitled = set(), []
for kind in ('adr', 'rfc'):
    d = os.path.join(root, 'decisions', kind)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith('.md') or f == 'README.md':
            continue
        head = open(os.path.join(d, f), encoding='utf8', errors='replace').read(4000)
        t = re.search(r'^#\s*((?:ADR|RFC)-\d{3,4})\b', head, re.M)
        if t:
            on_disk.add(t.group(1))
        else:
            untitled.append(f'{kind}/{f}')
listed = {e['id'] for e in entries if e.get('id')}
for missing in sorted(on_disk - listed):
    bad.append(f'{missing} exists as a record but the site registry does not list it')
for phantom in sorted(listed - on_disk):
    bad.append(f'{phantom} is listed by the site registry but no such record exists')

# 2c — the category filter must offer every category actually in use.
cats = re.search(r'export const decisionCategories: string\[\] = (\[.*?\n\]);', text, re.S)
if cats:
    try:
        declared = set(json.loads(cats.group(1)))
        for c in sorted({e.get('category', '') for e in entries} - declared):
            if c:
                bad.append(f'category {c!r} is used by an entry but absent from decisionCategories')
    except Exception:
        bad.append('decisionCategories is not valid JSON')

for b in bad:
    print(f'  FAIL: {b}')
if bad:
    sys.exit(1)
print(f'  ok: registry — {len(entries)} entries, each declaring all {len(required)} required fields, '
      f'covering exactly the {len(on_disk)} records on disk')
if untitled:
    print(f'  note: {len(untitled)} record(s) carry no `# ID — Title` heading, so the site registry '
          f'cannot derive them: {", ".join(untitled[:8])}')
PY
}

# ── self-test: each property must actually fail when violated ────────────────────────────────────────
selftest() {
  local d st=0
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  mkdir -p "$d/website/lib" "$d/decisions/adr"
  cat > "$d/decisions/adr/ADR-001-x.md" <<'EOF'
# ADR-001 — X
EOF
  write_registry() {
    python3 - "$d" "$1" <<'PY'
import json, sys
root, body = sys.argv[1], sys.argv[2]
open(root + '/website/lib/decisions.ts', 'w').write(
    'export type DecisionType = "ADR" | "RFC";\n'
    'export interface Decision {\n  type: DecisionType;\n  id: string;\n  slug: string;\n'
    '  title: string;\n  path: string;\n  canonicalUrl: string;\n  category: string;\n  summary: string;\n}\n\n'
    'export const decisions: Decision[] = ' + body + ';\n\n'
    'export const decisionCategories: string[] = ["C"];\n')
PY
  }
  local good='[
  {
    "type": "ADR",
    "id": "ADR-001",
    "slug": "adr-001",
    "title": "X",
    "path": "decisions/adr/ADR-001-x.md",
    "canonicalUrl": "https://example.invalid/decisions/adr/ADR-001-x.md",
    "category": "C",
    "summary": "s"
  }
]'
  write_registry "$good"
  registry "$d" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: a well-formed registry was rejected" >&2; st=1; }

  # the exact regression: an entry that omits `type`
  write_registry "$(printf '%s' "$good" | grep -v '"type"')"
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an entry missing a required field was accepted" >&2; st=1; }

  # a record on disk that the registry does not list
  write_registry '[]'
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an unlisted record was accepted" >&2; st=1; }

  # an entry pointing at a record that does not exist
  write_registry "$(printf '%s' "$good" | sed 's|ADR-001-x.md|ADR-999-ghost.md|g; s|"ADR-001"|"ADR-999"|; s|"adr-001"|"adr-999"|')"
  registry "$d" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: an entry with no record behind it was accepted" >&2; st=1; }

  return $st
}

if ! selftest; then echo "website-decisions-parity: guard self-test broken"; exit 2; fi

registry "$PWD" || fail=1
[ "$fail" -eq 0 ] || exit 1
echo "website-decisions-parity: OK — the mirror is a derivation and the registry matches the tree"
