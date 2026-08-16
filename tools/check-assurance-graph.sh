#!/usr/bin/env bash
#
# The assurance execution graph is acyclic, and dependencies point one way.
#
# The purity checker executed the aggregate assurance target; the aggregate collected evidence; the
# collector invoked the mutation runner; the mutation runner invoked the purity proof. A cycle — and it
# announced itself as a ten-minute timeout rather than as an error, which is the worst way for a
# structural defect to present itself. A timeout is a backstop, not a diagnosis.
#
# Cycles are now rejected BEFORE anything executes, by reading the declared strata and the Makefile's
# own dependency edges.
#
# Exit 1 on violation. Exit 2 if the self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== assurance-graph =="

check() {
  python3 - "$1" <<'PY'
import json, os, re, sys

root = sys.argv[1]
plan_path = os.path.join(root, 'assurance/execution-plan.json')
if not os.path.exists(plan_path):
    print('  FAIL: assurance/execution-plan.json is missing — roles cannot be inferred from names')
    sys.exit(1)
plan = json.load(open(plan_path, encoding='utf8'))
role = {c['target']: c['role'] for c in plan['commands']}
stratum = {c['target']: c['stratum'] for c in plan['commands']}
order = {s: i for i, s in enumerate(['M0', 'M1', 'M2', 'M3', 'M4'])}
bad = []

# Edges as the Makefile actually declares them, plus the commands each recipe invokes.
mk = open(os.path.join(root, 'Makefile'), encoding='utf8').read()
edges = {}
for m in re.finditer(r'^([a-z0-9-]+):([^\n=]*)\n((?:\t.*\n)*)', mk, re.M):
    target, deps, recipe = m.group(1), m.group(2).split(), m.group(3)
    out = set(d for d in deps if d in role)
    for other in role:
        if other == target:
            continue
        # a recipe line invoking another declared command
        if re.search(rf'(make\s+{re.escape(other)}\b)|({re.escape(other)}\b)', recipe) and (
            other.startswith('tools/') or f'make {other}' in recipe
        ):
            out.add(other)
    if target in role or out:
        edges[target] = out

# 1 — no cycles. Reported as a path, not as a hang.
colour = {}
path = []
def visit(n):
    colour[n] = 1
    path.append(n)
    for m2 in sorted(edges.get(n, ())):
        if colour.get(m2) == 1:
            i = path.index(m2)
            bad.append('cycle: ' + ' → '.join(path[i:] + [m2]))
        elif colour.get(m2, 0) == 0:
            visit(m2)
    path.pop()
    colour[n] = 2

for n in sorted(edges):
    if colour.get(n, 0) == 0:
        visit(n)

# 2 — dependencies point one way, and forbidden edges stay forbidden.
forbidden = {(f['from'], f['to']): f['why'] for f in plan.get('forbidden_edges', [])}
for src, outs in edges.items():
    if src not in stratum:
        continue
    for dst in outs:
        if dst not in stratum:
            continue
        a, b = stratum[src], stratum[dst]
        if order[b] > order[a]:
            why = forbidden.get((a, b), 'an earlier stratum must not invoke a later one')
            bad.append(f'{src} ({a}) invokes {dst} ({b}): {why}')

# 3 — the purity checker must not take the aggregate as a subject.
for src, outs in edges.items():
    if role.get(src) == 'META_CHECK':
        for dst in outs:
            if role.get(dst) in ('AGGREGATE', 'MUTATION_RUNNER'):
                bad.append(f'{src} is a meta check but executes {dst} ({role[dst]}) as a subject')

for b in sorted(set(bad)):
    print(f'  FAIL: {b}')
if bad:
    sys.exit(1)
print(f'  ok: {len(edges)} nodes, acyclic, dependencies point M0 → M1 → M2 → M3 → M4')
PY
}

selftest() {
  local d st=0 g b base
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  for base in "$g" "$b"; do
    mkdir -p "$base/assurance"
    cat > "$base/assurance/execution-plan.json" <<'EOF'
{"strata":{},"commands":[
 {"target":"a-check","role":"META_CHECK","stratum":"M1"},
 {"target":"b-check","role":"READ_ONLY_CHECK","stratum":"M1"},
 {"target":"c-check","role":"READ_ONLY_CHECK","stratum":"M1"}],
 "forbidden_edges":[]}
EOF
  done
  printf 'a-check: b-check\n\t@true\nb-check: c-check\n\t@true\nc-check:\n\t@true\n' > "$g/Makefile"
  # the bad tree closes the loop: A → B → C → A
  printf 'a-check: b-check\n\t@true\nb-check: c-check\n\t@true\nc-check: a-check\n\t@true\n' > "$b/Makefile"
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: a valid stratified graph was rejected" >&2; st=1; }
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a cyclic graph was accepted" >&2; st=1; }
  return $st
}

if ! selftest; then echo "assurance-graph: guard self-test broken"; exit 2; fi
check "$PWD" || exit 1
echo "assurance-graph: OK — acyclic, one-way strata, no meta check executing an aggregate"
