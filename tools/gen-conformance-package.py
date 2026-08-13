#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the public conformance package: the vectors, consumable outside this repository.

The package answers one question — *can someone who has only this directory determine the expected
behaviour?* — so it carries the vectors, the schemas they validate against, the registries they draw
from, a digest for every file, and nothing else. No engine, no runner, no path out of the package.

It is a COPY of normative material, not a second edition of it. Every file keeps the bytes it has in
the repository, and the manifest records the digest of each, so a consumer can prove the package
matches the published surface rather than trusting that it does.

Determinism: sorted, no timestamps. Two runs over an unchanged tree are byte-identical.
"""
import hashlib
import io
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, 'conformance/package')
PROFILES = os.path.join(ROOT, 'contracts/production/conformance-profiles.production.json')
SETS = os.path.join(ROOT, 'docs/derived/implementation-sets.json')

PACKAGE_SCHEMA_VERSION = '1'


def load(p):
    with io.open(p, encoding='utf-8') as fh:
        return json.load(fh)


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        h.update(fh.read())
    return h.hexdigest()


def main():
    registry = load(PROFILES)
    sets = load(SETS)

    # Everything any profile requires that is a vector, plus the schemas and registries those
    # vectors are meaningless without. Taken from the derived closure so the package cannot drift
    # from the profile registry.
    wanted = set()
    for s in sets['implementation_sets']:
        wanted |= set(s['transitive_normative_closure'])
    included = sorted(p for p in wanted
                      if p.startswith('conformance/vectors/')
                      or p.startswith('conformance/manifests/')
                      or p.startswith('conformance/capabilities/')
                      or p.startswith('contracts/'))

    if os.path.isdir(PKG):
        shutil.rmtree(PKG)
    os.makedirs(PKG)

    files = []
    for rel in included:
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            print('  MISSING: %s' % rel, file=sys.stderr)
            return 1
        dst = os.path.join(PKG, rel)
        if not os.path.isdir(os.path.dirname(dst)):
            os.makedirs(os.path.dirname(dst))
        shutil.copyfile(src, dst)
        files.append({'path': rel, 'sha256': digest(src),
                      'bytes': os.path.getsize(src)})

    # Per-vector index: id, the profile that requires it, and where the expected outcome is stated.
    by_vector = {}
    for p in registry['profiles']:
        for v in p.get('required_vectors', []):
            by_vector.setdefault(v, []).append(p['level'])

    vectors = []
    for rel in sorted(by_vector):
        doc = load(os.path.join(ROOT, rel))
        ids = []
        for key in ('vectors', 'cases', 'accept', 'reject'):
            block = doc.get(key)
            if isinstance(block, list):
                ids += [str(x.get('id')) for x in block if isinstance(x, dict) and x.get('id')]
        # Which member each case uses to state its expected outcome. Published because the files do
        # not share one grammar, and a consumer should learn that from the manifest rather than by
        # discovering it case by case.
        OUT = ('expect', 'valid', 'result', 'reason_code', 'error', 'outcome', 'canonical',
               'assertion', 'invariants')
        grammars = set()
        for key in ('vectors', 'cases'):
            for c in doc.get(key, []) if isinstance(doc.get(key), list) else []:
                if not isinstance(c, dict):
                    continue
                grammars |= {k for k in c if k in OUT or k.startswith('expected')
                             or k.startswith('check_') or k.endswith('_check')}
        if isinstance(doc.get('accept'), list) or isinstance(doc.get('reject'), list):
            grammars |= {'accept/reject membership'}
        vectors.append({
            'file': rel,
            'required_by_profiles': sorted(by_vector[rel]),
            'case_count': len(ids),
            'outcome_members': sorted(grammars),
            'case_ids': sorted(set(ids)),
        })

    manifest = {
        '_spec': 'BANZA Public Conformance Package',
        'package_schema_version': PACKAGE_SCHEMA_VERSION,
        'protocol_version': registry['protocol_version'],
        '_authority': 'A copy, not an edition. The BANZA Normative Manifest remains authoritative; '
                      'every file here carries the digest of its published original so a consumer '
                      'can verify the copy rather than trust it.',
        '_outcome_grammar': 'Cases do not share one member name for the expected outcome. Each vector '
                            'file lists the members its cases actually use in `outcome_members`. Every '
                            'case is determinable; the variety is a known ergonomics limitation, not a '
                            'hidden one.',
        '_self_contained': 'No file here references anything outside this package. No engine, runner '
                           'or reference implementation is present or needed: the vectors are data, '
                           'and the expected outcome of each is stated in the vector itself.',
        '_boundary': 'Passing these vectors demonstrates conformance to what they cover. It is not a '
                     'certification, an admission or an authorisation, and no party issues anything '
                     'on the strength of it.',
        'file_count': len(files),
        'files': files,
        'vector_files': vectors,
        'profiles': [{'level': p['level'], 'name': p['name'],
                      'required_vectors': sorted(p.get('required_vectors', []))}
                     for p in registry['profiles']],
    }
    with io.open(os.path.join(PKG, 'package-manifest.json'), 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

    readme = """# BANZA Public Conformance Package

Protocol version **%s** · package schema **%s** · %d files

This directory is self-contained. It carries the BANZA conformance vectors together with the schemas
and registries they are evaluated against, and nothing else. There is no engine here, no runner, and
no reference implementation — the vectors are **data**, and each states its own expected outcome.

## Verifying the copy

Every file is listed in `package-manifest.json` with its SHA-256. Recompute them and compare: the
digests are those of the published originals, so a match proves this package is the published surface
rather than a retelling of it.

## What is here

| | |
|---|---|
| `conformance/vectors/` | The vectors. Each case carries an id, an input and an expected outcome |
| `conformance/manifests/`, `conformance/capabilities/` | Schemas the manifest vectors validate against |
| `contracts/` | The contracts and registries the vectors draw on, including the reason-code registry |
| `package-manifest.json` | File digests, vector index, and which profile requires which vector file |

## What passing means

Passing the vectors for a profile demonstrates conformance **to what those vectors cover**. It is not
a certification, an admission or an authorisation. Nobody issues anything on the strength of it, and
this package cannot be used to obtain a credential, because none exists.

## What is deliberately absent

- Any BANZA implementation code
- Any runner, harness or test framework
- Any reference to a path outside this directory

If you find a reference here that does not resolve inside this package, that is a defect in the
package and not something for you to work around.
""" % (registry['protocol_version'], PACKAGE_SCHEMA_VERSION, len(files) + 1)
    with io.open(os.path.join(PKG, 'README.md'), 'w', encoding='utf-8') as fh:
        fh.write(readme)

    print('  conformance package: %d files + manifest + README' % len(files))
    print('  vector files: %d, cases: %d' % (
        len(vectors), sum(v['case_count'] for v in vectors)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
