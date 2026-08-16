#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the clean-room export: what an external implementer receives, and nothing else.

Built by POSITIVE ALLOWLIST. Nothing is copied and then removed — a file is present only because the
allowlist put it there, and the allowlist is derived from the Phase D implementation sets rather than
authored by hand. A subtractive export is one forgotten `rm` away from leaking the reference
implementation; an additive one cannot leak what it never selects.

    python3 tools/gen-clean-room-package.py [L0|L1|L2|L3|L4]

Determinism: sorted throughout, no timestamps inside any digested file. Provenance carries the source
commit, which is metadata about the export rather than part of its content.
"""
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS = os.path.join(ROOT, 'docs/derived/implementation-sets.json')
MANIFEST = os.path.join(ROOT, 'contracts/production/normative-manifest.json')
PROFILES = os.path.join(ROOT, 'contracts/production/conformance-profiles.production.json')
# The canonical output, overridable so a VERIFIER can generate a candidate elsewhere and compare.
# A check that regenerates in place mutates the state it is verifying: the export rewrites
# provenance.json with the current commit, so verifying dirties the tree and the next source-bound
# assurance run then refuses its own evidence. Checks observe; generators write.
OUT = os.environ.get('BANZA_CLEANROOM_OUT') or os.path.join(ROOT, 'clean-room/packages')

TOOL_VERSION = '1'

# Material that is not in any profile closure but that an implementer needs in order to know what
# they may do with the package. Each is named individually and justified; there is no directory glob,
# because a glob is how something unintended is exported.
ALWAYS = [
    ('LICENSE', 'the licence the exported material is under'),
    ('NOTICE', 'copyright and attribution required by that licence'),
    ('TRADEMARKS.md', 'what the licence does NOT grant: the right to use the marks'),
    ('contracts/production/normative-manifest.json', 'what is normative, and what is not'),
    ('contracts/production/conformance-profiles.production.json', 'what each profile requires'),
    ('contracts/production/conformance-profiles.production.schema.json', 'its shape'),
    ('docs/guides/implement-l0.md', 'a map to the L0 set; states no requirement of its own'),
    # The root trust plane is not scoped to a profile — it is the anchor every profile's trust
    # evaluation starts from, so it belongs in every package regardless of level. Classifying it as
    # non-profile (which it is, for applicability) had silently dropped it from the closure, leaving a
    # package from which succession could not be determined at all.
    ('spec/root-authority-set.md', 'who may exercise Root authority, and how that changes'),
    ('contracts/production/root-authority-set.production.schema.json', 'the shape of an authority set'),
    ('contracts/production/key-manifest.production.schema.json', 'what the active set authorises'),
    ('conformance/vectors/root-authority-set.json', 'the succession vectors, with real signatures'),
    ('spec/trust-freshness.md', 'ordering, rollback and equivocation across trust artifacts'),
    ('conformance/vectors/trust-freshness.json', 'the vectors that validate an implementation of those rules'),
]

# Explicitly excluded, and asserted by the guard rather than trusted. Listed so the exclusion is a
# published decision instead of an accident of which globs happened to match.
EXCLUDED = [
    ('engines/', 'the reference implementation. Excluded on purpose: the package must be sufficient '
                 'without it, and including it would make the trial measure reading code rather than '
                 'reading the specification'),
    ('services/, website/', 'reference services and the public site'),
    ('Operador Zero material', 'the demonstration operator: an example, never a requirement'),
    ('decisions/adr/, decisions/rfc/', 'decisions and proposals. An ADR explains why a rule exists; '
                                       'it is never the rule, and requiring one would mean the rule '
                                       'is not on the normative surface'),
    ('README.md', 'navigation and onboarding for the repository, not authority'),
    ('docs/audit/, docs/whitepaper/, docs/research/', 'internal reports, the Whitepaper and related '
                                                      'work: descriptive, none of them normative'),
    ('BanzAI', 'the assistant. The first trial must prove the package suffices without human or '
               'machine assistance from us'),
    ('tools/, .github/', 'build, guard and CI tooling'),
    ('conformance/fixtures/, internal tests', 'material about the reference implementation'),
    ('.env, VM material, private trust material', 'secrets and runtime state; no private key material '
                                                  'exists in this repository and none is exported'),
]


def load(p):
    with io.open(p, encoding='utf-8') as fh:
        return json.load(fh)


def sha256_file(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main():
    level = (sys.argv[1] if len(sys.argv) > 1 else 'L0').upper()
    sets = load(SETS)
    profiles = load(PROFILES)
    by_level = {s['level']: s for s in sets['implementation_sets']}
    if level not in by_level:
        print('unknown profile: %s' % level, file=sys.stderr)
        return 1

    # ---- the allowlist ----------------------------------------------------
    # Derived: exactly the transitive closure Phase D computed for this profile, plus the named
    # ALWAYS entries. Nothing else can enter.
    closure = list(by_level[level]['transitive_normative_closure'])
    allow = {}
    for p in closure:
        allow[p] = 'in the %s implementation set' % level
    for p, why in ALWAYS:
        allow.setdefault(p, why)

    missing = [p for p in allow if not os.path.exists(os.path.join(ROOT, p))]
    if missing:
        print('allowlisted but absent: %s' % missing, file=sys.stderr)
        return 1

    pkg = os.path.join(OUT, level.lower())
    if os.path.isdir(pkg):
        shutil.rmtree(pkg)
    os.makedirs(pkg)

    files = []
    for rel in sorted(allow):
        src = os.path.join(ROOT, rel)
        dst = os.path.join(pkg, rel)
        if not os.path.isdir(os.path.dirname(dst)):
            os.makedirs(os.path.dirname(dst))
        shutil.copyfile(src, dst)
        files.append({'path': rel, 'sha256': sha256_file(src),
                      'bytes': os.path.getsize(src), 'why': allow[rel]})

    try:
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip()
    except (subprocess.CalledProcessError, OSError):
        commit = 'unknown'

    profile = [p for p in profiles['profiles'] if p['level'] == level][0]
    content = {
        '_spec': 'BANZA Clean-Room Export Package',
        'package_schema_version': TOOL_VERSION,
        'protocol_version': sets['protocol_version'],
        'target_profile': level,
        'target_profile_name': profile['name'],
        '_authority': 'This package is a derived distribution of the BANZA v1.0.0 public normative '
                      'surface. It is not an independent specification. The BANZA Normative Manifest '
                      'remains authoritative.',
        '_reference_implementation': 'The reference implementation is intentionally excluded.',
        '_construction': 'Built by positive allowlist from the Phase D implementation set for this '
                         'profile. No file is present unless the allowlist selected it; nothing is '
                         'copied and then deleted.',
        'normative_manifest_sha256': sha256_file(MANIFEST),
        'file_count': len(files),
        'files': files,
        'excluded': [{'what': w, 'why': y} for w, y in EXCLUDED],
        'profile': {
            'level': profile['level'],
            'includes': profile['includes'],
            'required_capabilities': profile['required_capabilities'],
            'required_invariants': profile['required_invariants'],
            'not_required': profile['not_required'],
        },
    }

    # ---- outbound references ---------------------------------------------
    # The exported files are byte-identical copies of the published originals, which is what makes
    # them verifiable — so their links are NOT rewritten. Some of those links point outside the
    # package: to ADRs (deliberately excluded, and never a source of requirements), to material
    # belonging to a higher profile, or to derived views. Each is resolved here instead, so that an
    # outbound reference is a DECLARED non-dependency rather than a dangling path the reader
    # discovers by following it.
    link_re = re.compile(r'\]\(([^)\s]+)\)')
    code_re = re.compile(r'`[^`]*`')
    outbound = {}

    def classify(target):
        if target.startswith('decisions/adr/'):
            return ('rationale', 'An ADR records why a rule was adopted. It is never the rule, and '
                                 'nothing here requires reading it. Excluded from the package on '
                                 'purpose.')
        if target.startswith('decisions/rfc/'):
            return ('proposal', 'Every BANZA RFC is Draft and none is a requirement of 1.0.0.')
        if target.startswith('docs/derived/'):
            return ('derived view', 'A generated view of this same material. Informative; the '
                                    'Normative Manifest remains authoritative.')
        if target.startswith('conformance/package/'):
            return ('sibling package', 'The public conformance package: the same vectors, packaged '
                                       'separately.')
        if target in closure:
            return ('in package', 'present in this package')
        if target in {a['path'] for a in load(MANIFEST)['artifacts']}:
            return ('higher profile', 'On the normative surface, but not part of the %s '
                                      'implementation set. Required at a higher profile.' % level)
        return ('unresolved', 'Does not resolve to anything on the normative surface. If a rule '
                              'depends on it, that is a defect.')

    for rel in sorted(allow):
        if not rel.endswith('.md'):
            continue
        text = io.open(os.path.join(ROOT, rel), encoding='utf-8').read()
        stripped = code_re.sub(lambda m: ' ' * len(m.group(0)), text)
        for link in sorted(set(link_re.findall(stripped))):
            if link.startswith(('http', '#', 'mailto:')):
                continue
            target = os.path.normpath(os.path.join(os.path.dirname(rel), link.split('#', 1)[0]))
            if target in allow:
                continue
            kind, why = classify(target)
            outbound.setdefault(target, {'target': target, 'kind': kind, 'why': why,
                                         'referenced_by': []})
            if rel not in outbound[target]['referenced_by']:
                outbound[target]['referenced_by'].append(rel)

    content['outbound_references'] = [outbound[k] for k in sorted(outbound)]
    content['_outbound_note'] = (
        'Files here are byte-identical copies, so their links are not rewritten. Every link that '
        'leaves this package is listed above with what it points to and why it is not included. '
        'None of them carries a requirement: if following one turns out to be necessary to '
        'determine behaviour, that is a defect in the specification and belongs in the question '
        'ledger.')

    body = json.dumps(content, ensure_ascii=False, indent=2, sort_keys=False) + '\n'
    with io.open(os.path.join(pkg, 'package-manifest.json'), 'w', encoding='utf-8') as fh:
        fh.write(body)

    # Provenance is metadata ABOUT the export, held outside the digested content so that the package
    # itself stays byte-identical across rebuilds from the same commit.
    provenance = {
        '_spec': 'BANZA Clean-Room Export Provenance',
        'protocol_version': sets['protocol_version'],
        'target_profile': level,
        'source_commit': commit,
        'normative_manifest_sha256': content['normative_manifest_sha256'],
        'package_manifest_sha256': hashlib.sha256(body.encode('utf-8')).hexdigest(),
        'generation_tool': 'tools/gen-clean-room-package.py',
        'generation_tool_version': TOOL_VERSION,
        'file_count': len(files),
        '_no_timestamp': 'Deliberately absent. Two exports from the same commit are byte-identical, '
                         'which is what makes the package verifiable; a generation timestamp would '
                         'destroy that for no gain.',
    }
    with io.open(os.path.join(pkg, 'provenance.json'), 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')

    readme = """# BANZA %s — Clean-Room Export Package

**This package is a derived distribution of the BANZA v1.0.0 public normative surface. It is not an
independent specification. The BANZA Normative Manifest remains authoritative.**

**The reference implementation is intentionally excluded.**

Protocol version **%s** · target profile **%s — %s** · %d files

---

## What this is

Everything needed to implement BANZA at profile %s, and nothing else. The file set is the transitive
implementation set for this profile, selected by allowlist — no file is here unless something in the
normative surface requires it, and the reason is recorded against every entry in
`package-manifest.json`.

## Where to start

1. `docs/guides/implement-l0.md` — a map to the set. It states no requirement of its own; every
   obligation names the artifact that imposes it.
2. `contracts/production/normative-manifest.json` — what is normative, and what is not.
3. `contracts/production/conformance-profiles.production.json` — what this profile requires, and what
   it explicitly does **not**.

## Verifying this package

`package-manifest.json` lists every file with its SHA-256. `provenance.json` records the source
commit, the digest of the Normative Manifest, and the digest of the package manifest itself. Two
exports from the same commit are byte-identical; there is no generation timestamp anywhere in the
digested content.

## What is deliberately absent

The reference implementation, the demonstration operator, ADRs, the README, internal reports, the
Whitepaper, the assistant, and all tooling. `package-manifest.json` lists each exclusion with its
reason.

None of that is missing by oversight. If you cannot determine required behaviour from what is here,
that is a **defect in the specification**, not something for you to work around — and recording it is
the point of the exercise. See `clean-room/README.md` in the BANZA repository for the question ledger.

## Licence

`LICENSE` (Apache-2.0) and `NOTICE` apply to the material here. `TRADEMARKS.md` governs the names and
logos, which neither licence grants.
""" % (level, sets['protocol_version'], level, profile['name'], len(files) + 2, level)
    with io.open(os.path.join(pkg, 'README.md'), 'w', encoding='utf-8') as fh:
        fh.write(readme)

    print('  clean-room package %s: %d files + manifest + provenance + README' % (level, len(files)))
    print('  source commit: %s' % commit[:12])
    return 0


if __name__ == '__main__':
    sys.exit(main())
