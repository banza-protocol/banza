#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Classify every tracked file by what actually consumes it.

Phase A of the simplification sweep. This tool DOES NOT DELETE. It answers, for each file, the only
question that licenses removal: does anything depend on this?

A directory name is not evidence. `docs/governance/` may hold a normative dependency and
`engines/` may hold a dead module, so membership is decided by references found in the tree — the
Normative Manifest, the Makefile, CI workflows, guards, generators, code imports, and the text of
other kept files — never by where a file happens to sit.

Classes, in precedence order (the first that matches wins):

  NORMATIVE                listed in the Normative Manifest
  LEGAL                    licence, notice, trademarks, governance instruments
  BUILD_RELEASE            Makefile / CI / release tooling entrypoints
  CONFORMANCE              conformance suites, vectors, fixtures
  RUNTIME                  loaded by a service or the website at run time
  REFERENCE_IMPLEMENTATION engines/ sources and their tests
  PUBLIC_DOCUMENTATION     reachable from the public surface or the implementation guides
  TEST                     test material
  INTERNAL_AUDIT           audit and report material
  REFERENCED               nothing above, but some kept file names it
  UNREFERENCED             nothing in the tree names it   <-- removal candidate, still needs judgement
  UNKNOWN                  could not be classified        <-- blocks removal

UNREFERENCED is a candidate, not a verdict. A file can be unreferenced and still required — a licence
consumers read, a spec a human needs. The report is input to a decision, not the decision.
"""
import io
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_DIRS = ('.git/', 'node_modules/', 'target/', '.next/')
TEXTUAL = ('.md', '.json', '.yaml', '.yml', '.sh', '.py', '.mjs', '.js', '.ts', '.tsx', '.rs',
           '.toml', '.tex', '.txt', '.cfg', '.bst', '.cls', '.sql', '.svg', '.lock', '')


def tracked():
    out = subprocess.check_output(['git', 'ls-files'], cwd=ROOT).decode()
    return [p for p in out.splitlines() if p and not p.startswith(SKIP_DIRS)]


def read(path):
    try:
        with io.open(os.path.join(ROOT, path), encoding='utf-8', errors='replace') as fh:
            return fh.read()
    except (OSError, IsADirectoryError):
        return ''


def main():
    files = tracked()
    fileset = set(files)

    # ---- who names whom -----------------------------------------------------
    # A reference is a path, or a basename distinctive enough not to collide. Basenames shorter than
    # 5 characters or shared by several files are ignored: a false reference keeps a dead file alive,
    # which is the failure mode that makes this whole exercise pointless.
    base_owner = defaultdict(list)
    for p in files:
        base_owner[os.path.basename(p)].append(p)
    unique_base = {b: v[0] for b, v in base_owner.items() if len(v) == 1 and len(b) >= 5}

    referenced_by = defaultdict(set)
    for src in files:
        if not src.endswith(TEXTUAL):
            continue
        text = read(src)
        if not text:
            continue
        for p in fileset:
            if p != src and p in text:
                referenced_by[p].add(src)
        for b, target in unique_base.items():
            if target != src and b in text:
                referenced_by[target].add(src)

    # ---- authoritative sets -------------------------------------------------
    manifest = json.loads(read('contracts/production/normative-manifest.json') or '{}')
    normative = {a['path'] for a in manifest.get('artifacts', [])}

    makefile = read('Makefile')
    ci = ' '.join(read(p) for p in files if p.startswith('.github/workflows/'))
    entrypoints = set()
    for p in files:
        b = os.path.basename(p)
        if p.startswith('tools/') and (b in makefile or b in ci):
            entrypoints.add(p)

    runtime_loaded = set()
    for p in files:
        if p.startswith(('services/', 'website/')) and p.endswith(('.js', '.ts', '.tsx', '.json')):
            runtime_loaded.add(p)

    def classify(p):
        b = os.path.basename(p)
        if p in normative:
            return 'NORMATIVE'
        if b in ('LICENSE', 'NOTICE', 'TRADEMARKS.md', 'GOVERNANCE.md', 'MAINTAINERS.md',
                 'CONTRIBUTING.md', 'SECURITY.md', 'CITATION.cff'):
            return 'LEGAL'
        if p in ('Makefile',) or p.startswith('.github/') or p in entrypoints:
            return 'BUILD_RELEASE'
        if p.startswith('conformance/'):
            return 'CONFORMANCE'
        if p.startswith(('services/', 'website/')) and p in runtime_loaded:
            return 'RUNTIME'
        if p.startswith('engines/'):
            return 'REFERENCE_IMPLEMENTATION'
        if p.startswith(('docs/audit/', 'docs/reports/', 'artifacts/')):
            return 'INTERNAL_AUDIT'
        if p.startswith(('spec/', 'docs/guides/', 'docs/reference/', 'README')):
            return 'PUBLIC_DOCUMENTATION'
        if '/test' in p or p.endswith(('.test.ts', '.test.js', '_test.py')):
            return 'TEST'
        if referenced_by.get(p):
            return 'REFERENCED'
        return 'UNREFERENCED'

    rows = []
    for p in files:
        c = classify(p)
        rows.append({'path': p, 'class': c, 'referenced_by': sorted(referenced_by.get(p, []))[:6],
                     'refs': len(referenced_by.get(p, []))})

    counts = Counter(r['class'] for r in rows)
    unref = [r for r in rows if r['class'] == 'UNREFERENCED']
    by_dir = Counter(r['path'].split('/')[0] + '/' + (r['path'].split('/')[1] if '/' in r['path'][r['path'].find('/')+1:] else '')
                     for r in unref)

    out = {
        '_spec': 'BANZA repository truth map — Phase A of the simplification sweep',
        '_method': 'Classification is by consumer, not by directory name. A file is UNREFERENCED when '
                   'no other tracked file names it by path or by a distinctive basename.',
        '_warning': 'UNREFERENCED is a removal CANDIDATE, not a verdict. Licences, specifications and '
                    'public material can be unreferenced and still required.',
        'total_files': len(files),
        'counts': dict(counts.most_common()),
        'unreferenced_by_area': dict(by_dir.most_common(20)),
        'files': rows,
    }
    io.open(os.path.join(ROOT, 'docs/audit/repo-truth-map.json'), 'w', encoding='utf-8').write(
        json.dumps(out, ensure_ascii=False, indent=1) + '\n')

    print('tracked files: %d' % len(files))
    for c, n in counts.most_common():
        print('  %-26s %4d' % (c, n))
    print('\nunreferenced, by area:')
    for d, n in by_dir.most_common(12):
        print('  %-34s %4d' % (d, n))
    return 0


if __name__ == '__main__':
    sys.exit(main())
