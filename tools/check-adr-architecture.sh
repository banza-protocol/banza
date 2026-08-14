#!/usr/bin/env bash
#
# The decision-record tree records CURRENT ARCHITECTURE and nothing else.
#
# Everything here is derived from the tree. It carries no list of records, no list of removed ids and no
# snapshot of anyone's wording: after a reorganisation such a list reports the past as the present, and a
# guard that pins a phrase turns the record it pins into an authority — which is precisely what these
# records must never become.
#
# Properties, each a failure of a different kind if it breaks:
#
#   1. STRUCTURE      every record carries the six canonical sections, once each
#   2. CURRENT-ONLY   no status header, no supersession, no amendment chain, no historical narrative
#   3. NOT NORMATIVE  no record states a requirement of its own (BCP 14 keywords), and every record
#                     names the artifacts that do
#   4. NO PROCESS     no record whose subject is a milestone, a deployment, a rename or a migration
#   5. DELETE-THE-RECORDS  every subject an implementer needs is determinable from the normative
#                     surface alone — the tree can be deleted without making the protocol unimplementable
#   6. CI INDEPENDENT no CI status context depends on a record number
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

ADRDIR=decisions/adr
fail=0
bad() { echo "  FAIL: $1"; fail=1; }
ok()  { echo "  ok: $1"; }

echo "== adr-architecture =="

records=$(ls "$ADRDIR"/ADR-*.md 2>/dev/null)
[ -n "$records" ] || { echo "  FAIL: no records"; exit 1; }
n=$(echo "$records" | wc -l | tr -d ' ')

# ── 1. structure ────────────────────────────────────────────────────────────────────────────────────
miss=0
for f in $records; do
  for s in Context Decision Rationale "Alternatives considered" Consequences "Normative authority"; do
    c=$(grep -c "^## $s\$" "$f" || true)
    [ "$c" -eq 1 ] || { bad "$(basename "$f"): '## $s' appears $c times (expected once)"; miss=1; }
  done
done
[ "$miss" -eq 0 ] && ok "all $n records carry the six canonical sections exactly once"

# ── 2. current-only ─────────────────────────────────────────────────────────────────────────────────
# Words that describe a record's own lifecycle rather than the architecture. "superseded" is a legitimate
# PROTOCOL term (a certification record's state), so it is only a violation as a record's own status.
hist=0
for f in $records; do
  grep -qiE '^- \*\*Status:|^\*\*Status:|^Status:' "$f" && { bad "$(basename "$f") carries a status header"; hist=1; }
  grep -qiE '^- \*\*(Supersedes|Superseded by|Amends|Replaces|Date):' "$f" && { bad "$(basename "$f") carries a lifecycle header"; hist=1; }
  grep -qiE 'this (ADR|record) (is )?(supersedes|superseded|deprecated|replaced)' "$f" && { bad "$(basename "$f") narrates its own supersession"; hist=1; }
done
[ "$hist" -eq 0 ] && ok "no status headers, lifecycle headers or self-supersession"

# ── 3. not normative ────────────────────────────────────────────────────────────────────────────────
norm=0
for f in $records; do
  # BCP 14 keywords are the marker of a requirement. A record explains; it never requires.
  hits=$(grep -cE '\b(MUST NOT|MUST|SHALL NOT|SHALL|REQUIRED)\b' "$f" || true)
  [ "$hits" -eq 0 ] || { bad "$(basename "$f") states $hits normative keyword(s) — a record explains, it does not require"; norm=1; }
  # and every record must point at what does bind
  grep -q 'normative-manifest.json\|contracts/\|spec/\|conformance/' "$f" \
    || { bad "$(basename "$f") names no normative artifact"; norm=1; }
done
[ "$norm" -eq 0 ] && ok "no record states a requirement; every record names its normative authority"

# ── 4. no process records ───────────────────────────────────────────────────────────────────────────
proc=0
for f in $records; do
  t=$(head -1 "$f")
  echo "$t" | grep -qiE 'milestone|deploy|rollout|CI |pipeline|rename|renaming|migration|cleanup|audit|benchmark|relocation|tooling' \
    && { bad "$(basename "$f") reads as a process record: $t"; proc=1; }
done
[ "$proc" -eq 0 ] && ok "no record's subject is a milestone, deployment, rename or migration"

# ── 5. delete-the-records ───────────────────────────────────────────────────────────────────────────
# The subjects an independent implementation must determine, each with the normative artifact that
# determines it. If any is reachable ONLY from a record, the tree has become load-bearing.
declare -a SUBJECTS=(
  "canonicalization|spec/canonicalization.md"
  "numeric domain|spec/canonicalization.md"
  "reason semantics|spec/reason-codes.md"
  "idempotency|spec/idempotency.md"
  "capabilities|spec/capabilities.md"
  "profiles|contracts/production/conformance-profiles.production.json"
  "trust freshness|spec/trust-freshness.md"
  "root threshold|docs/security/ROOT_KEY_CUSTODY_MODEL.md"
  "invariants|contracts/invariants.json"
  "conformance vectors|conformance/vectors"
  "evidence|contracts/production/evidence-bundle.production.schema.json"
)
del=0
for pair in "${SUBJECTS[@]}"; do
  subject=${pair%%|*}; artifact=${pair##*|}
  [ -e "$artifact" ] || { bad "delete-the-records: '$subject' has no artifact outside the tree ($artifact)"; del=1; }
done
# and no normative artifact may DEFER its meaning to a record
defer=$(python3 - <<'PY'
import json, os, re
m = json.load(open('contracts/production/normative-manifest.json'))
bad = []
for a in m['artifacts']:
    p = a['path']
    if not os.path.isfile(p):
        continue
    for ln, line in enumerate(open(p, encoding='utf8').read().splitlines(), 1):
        # a SECTION pointer into a record makes the rule's meaning depend on that record
        if re.search(r'ADR-\d{3}\s*§', line):
            bad.append(f"{p}:{ln}")
print('\n'.join(bad))
PY
)
[ -z "$defer" ] || { bad "a normative artifact defers to a record section:"; echo "$defer" | sed 's/^/      /'; del=1; }
[ "$del" -eq 0 ] && ok "delete-the-records holds: every implementable subject is determined outside the tree"

# ── 6. CI contexts do not depend on a record number ─────────────────────────────────────────────────
ciref=$(grep -hoE '^\s+name: .*ADR-[0-9]{3}.*$' .github/workflows/*.yml 2>/dev/null || true)
[ -z "$ciref" ] || { bad "a CI job name carries a record number (renumbering would invalidate it):"; echo "$ciref" | sed 's/^/      /'; }
[ -z "$ciref" ] && ok "no CI status context depends on a record number"

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf '# X\n\n## Context\n' > "$tmp/a.md"
[ "$(grep -c '^## Decision$' "$tmp/a.md" || true)" -eq 0 ] || { echo "SELFTEST_FAIL section detector" >&2; exit 2; }
printf 'An implementation MUST do it.\n' > "$tmp/b.md"
grep -qE '\bMUST\b' "$tmp/b.md" || { echo "SELFTEST_FAIL keyword detector" >&2; exit 2; }

[ "$fail" -eq 0 ] || exit 1
echo "adr-architecture: OK — $n current records, explanatory only, and the tree is not load-bearing"
