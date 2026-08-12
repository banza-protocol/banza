#!/usr/bin/env bash
# BANZA — execution-semantics guard (X-04 reason codes, X-05 idempotency).
#
# Protects the invariants established by ADR-083 and ADR-084:
#
#   1. The reason-code registry and the specifications exist and are wired to the manifest.
#   2. The published trust_status vocabulary equals what the reference engine emits — in BOTH
#      directions, so neither can drift from the other unnoticed.
#   3. failed_checks is an enum of published Open Trust Evaluation check ids, and a set.
#   4. reason_codes fields carry the published grammar, not a free string.
#   5. The idempotency specification, its retention floor and its excluded members agree with the
#      engine and with the capabilities contract.
#   6. Once X-04/X-05 are closed, the clean-room package may not list them as blockers again.
#
# Discovery-only: it reads, never writes.
set -euo pipefail
cd "$(dirname "$0")/.."

REGISTRY=contracts/production/reason-code-registry.production.json
RC_SPEC=spec/reason-codes.md
IDEM_SPEC=spec/idempotency.md
RC_VEC=conformance/vectors/reason-codes.json
IDEM_VEC=conformance/vectors/idempotency.json

fail=0
ok()  { printf '  ok: %s\n' "$1"; }
bad() { printf '  X %s\n' "$1"; fail=1; }

echo "== execution-semantics (ADR-083 reason codes, ADR-084 idempotency) =="

for f in "$REGISTRY" "$RC_SPEC" "$IDEM_SPEC" "$RC_VEC" "$IDEM_VEC"; do
  [ -f "$f" ] || bad "missing normative artifact: $f"
done
[ "$fail" -eq 0 ] || { echo "execution-semantics: FAIL"; exit 1; }
ok "specifications, registry and vectors present"

# ── self-test: the parity detector must fire on a synthetic divergence ───────────────────────────
python3 - <<'PY' || { echo "execution-semantics: SELFTEST FAILED"; exit 1; }
import sys
def parity(published, emitted):
    return published == emitted
if not parity(["A", "B"], ["A", "B"]):
    print("  SELFTEST_FAIL: parity detector rejected identical vocabularies"); sys.exit(1)
if parity(["A", "B"], ["A", "B", "C"]):
    print("  SELFTEST_FAIL: parity detector accepted a divergent vocabulary"); sys.exit(1)
if parity(["A", "B"], ["B", "A"]):
    print("  SELFTEST_FAIL: parity detector ignored ordering"); sys.exit(1)
print("  ok: parity detector fires on divergence and on reordering")
PY

python3 - <<'PY' || fail=1
import io, json, re, sys

bad = []
def X(m): bad.append(m)

reg = json.load(io.open('contracts/production/reason-code-registry.production.json', encoding='utf-8'))

# 1. trust_status parity, in both directions.
published = [v['code'] for v in reg['vocabularies']['trust_status']['values']]
src = io.open('engines/banza-trust/src/evaluate.rs', encoding='utf-8').read()
body = src.split('STATUS_VALUES: &[&str] = &[', 1)[1].split('];', 1)[0]
emitted = re.findall(r'"([^"]+)"', body)
if published != emitted:
    X("trust_status registry and engine diverge: only in registry %s; only in engine %s"
      % (sorted(set(published) - set(emitted)), sorted(set(emitted) - set(published))))
else:
    print("  ok: trust_status — %d values, registry and engine identical" % len(published))

# Every published value must carry a meaning and a verdict; a code with no semantics is not a code.
for v in reg['vocabularies']['trust_status']['values']:
    if not v.get('meaning') or v.get('verdict') not in ('VERIFIED', 'PENDING', 'FAILED'):
        X("trust_status value %s has no published meaning or verdict" % v.get('code'))

# 2. fetch reason codes parity.
fsrc = io.open('engines/banza-artifact-fetcher/src/types.rs', encoding='utf-8').read()
fbody = fsrc.split('pub enum ReasonCode {', 1)[1].split('\n}', 1)[0]
fvariants = re.findall(r'^\s+([A-Z][A-Za-z0-9]*),$', fbody, re.M)
fsnake = [re.sub(r'(?<!^)(?=[A-Z])', '_', v).lower() for v in fvariants]
fpub = [v['code'] for v in reg['vocabularies']['fetch_reason_codes']['values']]
if fpub != fsnake:
    X("fetch reason codes diverge: only in registry %s; only in engine %s"
      % (sorted(set(fpub) - set(fsnake)), sorted(set(fsnake) - set(fpub))))
else:
    print("  ok: fetch reason codes — %d values, registry and engine identical" % len(fpub))

# 3. failed_checks is a closed set of published check ids.
ote = sorted(set(re.findall(r'"id": "([a-z_]+)"',
                            io.open('contracts/federation/federation-trust.json', encoding='utf-8').read())))
ev = json.load(io.open('contracts/production/federation-trust-evaluation.production.schema.json',
                       encoding='utf-8'))
fc = ev['properties']['failed_checks']
if sorted(fc.get('items', {}).get('enum', [])) != ote:
    X("failed_checks enum does not equal the published Open Trust Evaluation check ids")
elif not fc.get('uniqueItems'):
    X("failed_checks must declare uniqueItems — it is a set expressed as an array")
else:
    print("  ok: failed_checks — enum of %d published check ids, uniqueItems" % len(ote))

# 4. reason_codes fields carry the published grammar rather than a free string.
for p in ('contracts/production/journey-receipt.production.schema.json',
          'contracts/production/operation-receipt.production.schema.json'):
    d = json.load(io.open(p, encoding='utf-8'))
    items = d['properties']['reason_codes'].get('items', {})
    if 'anyOf' not in items or len(items['anyOf']) != 2:
        X("%s: reason_codes items must constrain the core grammar and the extension namespace" % p)
    elif not any('x-' in a.get('pattern', '') for a in items['anyOf']):
        X("%s: reason_codes items do not reserve the extension namespace" % p)
if not bad:
    print("  ok: reason_codes on both receipt types carry the published grammar")

# 5. idempotency — floor and excluded members agree across spec, engine and contract.
spec = io.open('spec/idempotency.md', encoding='utf-8').read()
esrc = io.open('engines/banza-trust/src/execution.rs', encoding='utf-8').read()
floor = int(re.search(r'RETENTION_FLOOR_SECONDS: u64 = ([0-9_]+);', esrc).group(1).replace('_', ''))
if floor != 86400:
    X("engine retention floor is %d, the specification states 86400" % floor)
caps = json.load(io.open('contracts/production/capabilities-document.production.schema.json',
                         encoding='utf-8'))
declared = caps['properties'].get('idempotency', {}).get('properties', {}) \
                            .get('retention_seconds', {}).get('minimum')
if declared != floor:
    X("capabilities contract minimum (%s) does not equal the retention floor (%d)" % (declared, floor))

ex_engine = re.findall(r'"([a-z_]+)",', esrc.split('REQUEST_IDENTITY_EXCLUDED: &[&str] = &[', 1)[1]
                       .split('];', 1)[0])
ex_vec = json.load(io.open('conformance/vectors/idempotency.json',
                           encoding='utf-8'))['request_identity_excluded_members']
if ex_engine != ex_vec:
    X("request-identity excluded members diverge between engine and published vectors")
if 'signature' in ex_engine:
    X("a signature must NOT be excluded from request identity (ADR-084 D-2, security)")
if not bad:
    print("  ok: idempotency — floor %ds, %d excluded members, engine/contract/vectors agree"
          % (floor, len(ex_engine)))

# 6. The clean-room package may not re-list a closed blocker.
cr = 'docs/audit/BANZA_V1_CLEAN_ROOM_PACKAGE_MANIFEST.md'
try:
    t = io.open(cr, encoding='utf-8').read()
except OSError:
    t = ''
for x in ('X-04', 'X-05'):
    for line in t.splitlines():
        if x in line and 'CLOSED' not in line and '~~' not in line and 'OPEN' in line:
            X("%s: %s is still listed as an open blocker" % (cr, x))
if not bad:
    print("  ok: the clean-room package does not list X-04 or X-05 as open blockers")

for m in bad:
    print("  X %s" % m)
sys.exit(1 if bad else 0)
PY

if [ "$fail" -ne 0 ]; then
  echo "execution-semantics: FAIL"
  exit 1
fi
echo "execution-semantics: OK — reason codes and idempotency are published, closed and engine-parity holds"
