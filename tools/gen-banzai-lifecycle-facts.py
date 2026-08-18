#!/usr/bin/env python3
"""Derive the current lifecycle facts BanzAI states, from the one artifact that owns them.

BanzAI must be able to say what version BANZA is, whether it is in production, whether the protocol or
L0 has been frozen, and whether an independent implementation has been demonstrated — without a model and
without a second copy of those facts drifting from the first.

The single input is `contracts/production/protocol-version.json`, which owns `protocol_version`,
`pre_production` and the structured `lifecycle_state` block. Deliberately NOT the prose: `_release_state`
explains these facts in English and the whitepaper narrates them, but a generator whose input is a
paragraph fails the first time someone rewords a sentence. The structured fields are the authority; the
prose is downstream of them.

AG-10 is NOT emitted. Searched for, and no tracked artifact records its run STATE: what exists is the
rule (`AG10_READINESS_IS_AGGREGATED_NEVER_DECLARED`) and a live evaluation that reports NOT_RUN because
the gate was not evaluated. "Not evaluated" is a property of a run, not a recorded current-state fact, and
inventing a field for it would put a value in the derived artifact that no upstream source establishes.

The output is a CONSUMER. It carries provenance per fact so a reader can see which upstream field
establishes each one, and so nothing here can be mistaken for authority.
"""
import collections
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESCRIPTOR = 'contracts/production/protocol-version.json'
TARGET = 'services/banzai-api/src/lifecycleFacts.generated.json'

# fact -> (upstream field path, BanzAI source id establishing it)
DIRECT = [
    ('protocol_version', ('protocol_version',)),
    ('pre_production', ('pre_production',)),
    ('production_certificates', ('production_certificates',)),
]
LIFECYCLE = [
    'protocol_frozen',
    'l0_frozen',
    'independent_implementation_demonstrated',
    'independent_trial_started',
]


def fail(msg):
    raise SystemExit('gen-banzai-lifecycle-facts: %s' % msg)


def main():
    path = os.path.join(ROOT, DESCRIPTOR)
    if not os.path.isfile(path):
        fail('the lifecycle descriptor is missing: %s' % DESCRIPTOR)
    d = json.load(open(path, encoding='utf-8'))

    facts = collections.OrderedDict()
    provenance = collections.OrderedDict()

    for name, keys in DIRECT:
        cur = d
        for k in keys:
            if not isinstance(cur, dict) or k not in cur:
                fail('required field absent from %s: %s' % (DESCRIPTOR, '.'.join(keys)))
            cur = cur[k]
        facts[name] = cur
        provenance[name] = '%s#%s' % (DESCRIPTOR, '.'.join(keys))

    ls = d.get('lifecycle_state')
    if not isinstance(ls, dict):
        fail('lifecycle_state is absent or not an object in %s' % DESCRIPTOR)
    for name in LIFECYCLE:
        if name not in ls:
            fail('lifecycle_state.%s is absent from %s' % (name, DESCRIPTOR))
        if not isinstance(ls[name], bool):
            fail('lifecycle_state.%s must be a boolean, got %r' % (name, type(ls[name]).__name__))
        facts[name] = ls[name]
        provenance[name] = '%s#lifecycle_state.%s' % (DESCRIPTOR, name)

    # Fail closed on states the descriptor's own semantics make contradictory. Not a general invariant
    # engine: only pairs whose meanings genuinely exclude each other.
    if facts['pre_production'] and facts['production_certificates']:
        fail('contradiction: pre_production is true while production_certificates is true')
    if facts['pre_production'] and facts['protocol_frozen']:
        fail('contradiction: the protocol is declared frozen while the version is pre-production')
    if facts['independent_implementation_demonstrated'] and not facts['independent_trial_started']:
        fail('contradiction: an independent implementation is demonstrated but no trial has started')

    out = collections.OrderedDict([
        ('_generated_by', 'tools/gen-banzai-lifecycle-facts.py'),
        ('_source', DESCRIPTOR),
        ('_role', (
            'DERIVED CONSUMER. BanzAI reads current lifecycle state from here so it states one truth '
            'rather than a copy of it. This file is never an authority: the descriptor named in _source '
            'owns these facts, and every value carries its upstream field in _provenance.'
        )),
        ('_not_included', (
            'AG-10 run state. No tracked artifact records it: what exists is the rule that readiness is '
            'aggregated and never declared, plus a live evaluation reporting NOT_RUN because the gate was '
            'not evaluated. A field here would assert something no upstream source establishes.'
        )),
        ('_boundary', (
            'Current-state metadata, not conformance requirements. No implementation satisfies or fails '
            'these, no profile requires them, and no conformance verdict reads them.'
        )),
        ('facts', facts),
        ('_provenance', provenance),
    ])
    text = json.dumps(out, ensure_ascii=False, indent=2) + '\n'

    if len(sys.argv) > 1 and sys.argv[1] == '--stdout':
        sys.stdout.write(text)
        return
    with open(os.path.join(ROOT, TARGET), 'w', encoding='utf-8') as fh:
        fh.write(text)
    print('  wrote %s  (%d facts from %s)' % (TARGET, len(facts), DESCRIPTOR))


if __name__ == '__main__':
    main()
