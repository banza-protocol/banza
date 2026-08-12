"""Regenerate contracts/production/reason-code-registry.production.json.

Purely mechanical. It does two things and nothing else:

  1. extracts the code vocabularies from the reference implementation, so the published registry is
     exhaustive rather than hand-listed;
  2. merges in the authored content — every meaning, rule and boundary statement — from
     tools/reason-code-meanings.json.

**No protocol meaning is written in this file.** A generator is the wrong place for one: it cannot be
reviewed as a specification, and a rule that lives in a build script is exactly the inversion the
normative-completeness work exists to remove. Semantics belong to the registry and to
spec/reason-codes.md; this script only keeps them exhaustive and in sync.

The direction of authority runs registry to engine: the guard asserts parity in both directions, so an
engine value absent from the registry is a defect in the engine, not a reason to widen the registry
silently.

Run: make reason-code-registry
"""

import io, json, os, re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NL = chr(10)


def read(p):
    return io.open(os.path.join(ROOT, p), encoding='utf-8').read()


def rust_str_list(path, const):
    """Extract a `pub const NAME: &[&str] = &[ "A", "B" ];` list."""
    body = read(path).split('%s: &[&str] = &[' % const, 1)[1].split('];', 1)[0]
    return re.findall(r'"([^"]+)"', body)


def rust_enum_snake(path, enum):
    """Extract a `#[serde(rename_all="snake_case")] pub enum X { A, B }` as snake_case values, with
    each variant's doc comment."""
    body = read(path).split('pub enum %s {' % enum, 1)[1].split(NL + '}', 1)[0]
    out, doc = [], None
    for line in body.splitlines():
        l = line.strip()
        if l.startswith('///'):
            doc = ((doc + ' ') if doc else '') + l[3:].strip()
            continue
        if l.startswith('//'):
            continue
        m = re.match(r'^([A-Z][A-Za-z0-9]*),$', l)
        if m:
            out.append((re.sub(r'(?<!^)(?=[A-Z])', '_', m.group(1)).lower(), doc or ''))
        doc = None
    return out


AUTHORED = json.load(
    io.open(os.path.join(ROOT, 'tools/reason-code-meanings.json'), encoding='utf-8'),
    object_pairs_hook=OrderedDict,
)

# ── extract from the reference implementation ───────────────────────────────────────────────────
trust = rust_str_list('engines/banza-trust/src/evaluate.rs', 'STATUS_VALUES')
undocumented = [t for t in trust if t not in AUTHORED['trust_status']]
if undocumented:
    raise SystemExit('status values the engine emits with no published meaning: %s' % undocumented)

fetch = rust_enum_snake('engines/banza-artifact-fetcher/src/types.rs', 'ReasonCode')

verdict = read('engines/banza-target-registry/src/verdict.rs')
STEP_MAP = OrderedDict()
for block in re.finditer(
        r'"([a-z_]+)"(?:\s*\|\s*"[a-z_]+")?\s*=>\s*\{(.*?)\n        \}', verdict, re.S):
    step, arms = block.group(1), re.findall(
        r'"([A-Z][A-Z0-9_]*)"\s*=>\s*([A-Z]+)', block.group(2))
    if arms:
        STEP_MAP[step] = arms
# Steps whose mapping is not a literal match carry an authored rule instead of a table.
for step in AUTHORED['step_rules']:
    STEP_MAP.setdefault(step, [])

# ── assemble ────────────────────────────────────────────────────────────────────────────────────
registry = OrderedDict(AUTHORED['registry_header'])
registry['_boundary'] = AUTHORED['_boundary']
registry['extension_namespace'] = AUTHORED['extension_namespace']
registry['unknown_code_handling'] = AUTHORED['unknown_code_handling']
registry['vocabularies'] = OrderedDict()

ts = OrderedDict(AUTHORED['vocabulary_headers']['trust_status'])
ts['values'] = [
    OrderedDict([
        ("code", c),
        ("meaning", AUTHORED['trust_status'][c]['meaning']),
        ("verdict", AUTHORED['trust_status'][c]['verdict']),
    ])
    for c in trust
]
registry['vocabularies']['trust_status'] = ts

fr = OrderedDict(AUTHORED['vocabulary_headers']['fetch_reason_codes'])
fr['values'] = [OrderedDict([("code", c), ("meaning", d)]) for c, d in fetch]
registry['vocabularies']['fetch_reason_codes'] = fr

registry['vocabularies']['journey_step_status'] = \
    AUTHORED['authored_vocabularies']['journey_step_status']

es = OrderedDict(AUTHORED['engine_status_header'])
es['steps'] = [
    OrderedDict(
        [("step", step)]
        + ([("statuses", [OrderedDict([("engine_status", a), ("step_status", b)]) for a, b in arms])]
           if arms else [])
        + ([("rule", AUTHORED['step_rules'][step])] if step in AUTHORED['step_rules'] else [])
        + [("default", "FAILED")]
    )
    for step, arms in STEP_MAP.items()
]
registry['vocabularies']['engine_status_by_step'] = es

registry['vocabularies']['failed_checks'] = AUTHORED['authored_vocabularies']['failed_checks']

path = os.path.join(ROOT, 'contracts/production/reason-code-registry.production.json')
io.open(path, 'w', encoding='utf-8').write(json.dumps(registry, ensure_ascii=False, indent=2) + NL)
print('  registo escrito: %s' % path)
print('    trust_status            %2d valores (extraidos + semantica autorada)' % len(trust))
print('    fetch_reason_codes      %2d valores (extraidos)' % len(fetch))
print('    journey_step_status      %d valores (autorado)'
      % len(AUTHORED['authored_vocabularies']['journey_step_status']['values']))
print('    engine_status_by_step   %2d passos' % len(STEP_MAP))
print('    failed_checks            autorado; referencia os ids de check publicados')
