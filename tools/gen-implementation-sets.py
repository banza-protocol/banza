#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Derive the per-profile implementation sets from the normative surface.

This tool DERIVES. It is not an authority and it invents no requirement. Its two inputs are the
Normative Manifest and the conformance-profile registry; everything it emits is a view of those.

What it produces, under docs/derived/:

  implementation-sets.json   the machine-readable dependency graph, closures and metrics
  implementation-sets.md     the same, readable

Three kinds of dependency are kept apart, because collapsing them is how tooling and guides turn
into norm:

  normative     needed to determine conforming behaviour
  conformance   needed to test or demonstrate conformance
  guidance      helps an engineer; defines no requirement

Edges are derived, never guessed from a filename or a directory:

  profile_requires   the profile registry names the artifact for that level
  schema_ref         a schema's $ref resolves to another artifact
  cites_normative    an artifact's own text names another artifact of the normative surface

Only the first two carry the closure. A textual citation records that one artifact mentions another;
it does not establish that behaviour cannot be determined without it, and traversing it pulls in the
whole surface — which is how a dependency graph stops distinguishing anything. Citation edges are
emitted, counted and shown, but never followed.

Determinism: output is sorted throughout and carries no timestamp, so two runs over an unchanged
tree are byte-identical and a drift guard can compare them.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'contracts/production/normative-manifest.json')
PROFILES = os.path.join(ROOT, 'contracts/production/conformance-profiles.production.json')
OUTDIR = os.path.join(ROOT, 'docs/derived')

NORMATIVE, CONFORMANCE, GUIDANCE = 'normative', 'conformance', 'guidance'

HEADER = 'Derived informative view. The BANZA Normative Manifest remains authoritative.'


def load(path):
    with io.open(path, encoding='utf-8') as fh:
        return json.load(fh)


def kind_of(artifact):
    """Which kind of dependency an artifact can be, from its own manifest tier.

    The manifest already classifies every artifact. Re-deriving the classification here would be a
    second opinion competing with the first, so this reads it rather than recomputing it.
    """
    tier = artifact['tier']
    if tier == 'implementation':
        return NORMATIVE
    if tier == 'conformance':
        return CONFORMANCE
    return GUIDANCE


def refs_in(obj, out):
    """Collect every $ref target in a parsed schema, at any depth."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == '$ref' and isinstance(v, str):
                out.add(v)
            else:
                refs_in(v, out)
    elif isinstance(obj, list):
        for v in obj:
            refs_in(v, out)


def resolve_ref(ref, source_path, known):
    """Resolve a $ref to a repository path, or None when it is internal or external.

    Only three forms resolve: a local fragment (internal — ignored), a repo-relative path, and a
    canonical https://banza.network/<path> id. Anything else is left unresolved on purpose: a
    guess would be an invented edge.
    """
    if ref.startswith('#'):
        return None
    ref = ref.split('#', 1)[0]
    if not ref:
        return None
    if ref.startswith('https://banza.network/'):
        cand = ref[len('https://banza.network/'):]
        return cand if cand in known else None
    if ref.startswith('http'):
        return None
    cand = os.path.normpath(os.path.join(os.path.dirname(source_path), ref))
    return cand if cand in known else None


def main():
    manifest = load(MANIFEST)
    registry = load(PROFILES)
    artifacts = {a['path']: a for a in manifest['artifacts']}
    known = set(artifacts)

    # ---- edges -------------------------------------------------------------
    # Each edge answers "why is this artifact needed?" in its `reason`.
    edges = []
    unresolved = []

    for profile in registry['profiles']:
        lvl = profile['level']
        # Every `required_*` member that holds repository paths. Enumerated dynamically so that
        # adding a member to the registry cannot silently leave its artifacts out of the graph —
        # which is exactly how the openapi surfaces first appeared as orphans.
        NON_PATH = ('required_capabilities', 'required_invariants', 'required_endpoints',
                    'required_publication')
        for member in sorted(k for k in profile
                             if k.startswith('required_') and k not in NON_PATH):
            for path in profile.get(member, []):
                edges.append({
                    'from': 'profile:' + lvl,
                    'to': path,
                    'edge': 'profile_requires',
                    'kind': kind_of(artifacts[path]) if path in known else GUIDANCE,
                    'reason': '%s names it under %s' % (lvl, member),
                })
                if path not in known:
                    unresolved.append({'from': 'profile:' + lvl, 'to': path,
                                       'why': 'named by a profile but absent from the Normative Manifest'})

    for path, artifact in sorted(artifacts.items()):
        full = os.path.join(ROOT, path)
        if not os.path.exists(full) or not path.endswith('.json'):
            continue
        try:
            doc = load(full)
        except ValueError:
            continue
        found = set()
        refs_in(doc, found)
        for ref in sorted(found):
            target = resolve_ref(ref, path, known)
            if target and target != path:
                edges.append({
                    'from': path,
                    'to': target,
                    'edge': 'schema_ref',
                    'kind': kind_of(artifacts[target]),
                    'reason': 'validating %s requires resolving $ref %s' % (path, ref),
                })
            elif target is None and not ref.startswith('#') and not ref.startswith('http'):
                unresolved.append({'from': path, 'to': ref,
                                   'why': '$ref does not resolve to a manifest artifact'})

    # Textual citation of one normative artifact by another. Restricted to exact repo paths that
    # are themselves on the surface, so prose mentioning a directory does not become an edge.
    path_re = re.compile(r'\b((?:contracts|conformance|spec)/[A-Za-z0-9_./-]+\.(?:json|md|yaml))')
    for path, artifact in sorted(artifacts.items()):
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            continue
        try:
            with io.open(full, encoding='utf-8') as fh:
                text = fh.read()
        except (UnicodeDecodeError, OSError):
            continue
        for hit in sorted(set(path_re.findall(text))):
            if hit in known and hit != path:
                edges.append({
                    'from': path,
                    'to': hit,
                    'edge': 'cites_normative',
                    'kind': kind_of(artifacts[hit]),
                    'reason': '%s names %s in its own text' % (path, hit),
                })

    # de-duplicate, keeping the strongest (earliest) edge type per pair
    order = {'profile_requires': 0, 'schema_ref': 1, 'cites_normative': 2}
    best = {}
    for e in edges:
        key = (e['from'], e['to'])
        if key not in best or order[e['edge']] < order[best[key]['edge']]:
            best[key] = e
    edges = sorted(best.values(), key=lambda e: (e['from'], e['to']))

    out_edges = {}
    for e in edges:
        out_edges.setdefault(e['from'], []).append(e)

    # ---- closures ----------------------------------------------------------
    by_level = {p['level']: p for p in registry['profiles']}

    def profile_closure(level):
        seen, stack = set(), [level]
        while stack:
            lv = stack.pop()
            if lv in seen:
                continue
            seen.add(lv)
            stack.extend(by_level[lv]['includes'])
        return sorted(seen)

    # Edge types strong enough to mean "you cannot determine conforming behaviour without this".
    CLOSURE_EDGES = ('profile_requires', 'schema_ref')

    def artifacts_for(level, transitive):
        """Artifacts required at a level. `transitive` also follows artifact-to-artifact edges."""
        direct = set()
        for lv in (profile_closure(level) if transitive else [level]):
            for e in out_edges.get('profile:' + lv, []):
                if e['to'] in known:
                    direct.add(e['to'])
        if not transitive:
            return direct
        seen, stack = set(direct), list(direct)
        while stack:
            node = stack.pop()
            for e in out_edges.get(node, []):
                if e['edge'] in CLOSURE_EDGES and e['to'] in known and e['to'] not in seen:
                    seen.add(e['to'])
                    stack.append(e['to'])
        return seen

    sets = {}
    for p in registry['profiles']:
        lvl = p['level']
        own = sorted(artifacts_for(lvl, transitive=False))
        closure = sorted(artifacts_for(lvl, transitive=True))
        lower = set()
        for inc in p['includes']:
            lower |= artifacts_for(inc, transitive=True)
        incremental = sorted(set(closure) - lower)

        def count(paths, tier):
            return sum(1 for x in paths if artifacts[x]['tier'] == tier)

        def cls(paths, c):
            return sorted(x for x in paths if artifacts[x]['class'] == c)

        sets[lvl] = {
            'level': lvl,
            'name': p['name'],
            'profile_closure': profile_closure(lvl),
            'direct_normative_dependencies': own,
            'transitive_normative_closure': closure,
            'incremental_over_included_profiles': incremental,
            'counts': {
                'direct': len(own),
                'transitive': len(closure),
                'incremental': len(incremental),
                'implementation_tier': count(closure, 'implementation'),
                'conformance_tier': count(closure, 'conformance'),
                'schemas': len(cls(closure, 'NORMATIVE_SCHEMA')),
                'contracts': len(cls(closure, 'NORMATIVE_CONTRACT')),
                'registries': len(cls(closure, 'NORMATIVE_REGISTRY')),
                'specifications': len(cls(closure, 'NORMATIVE_SPECIFICATION')),
                'vectors': len(cls(closure, 'CONFORMANCE_VECTOR')),
                'invariants_cumulative': sum(
                    len(by_level[lv]['required_invariants']) for lv in profile_closure(lvl)),
            },
            'not_required': p['not_required'],
        }

    # ---- orphans (D9) ------------------------------------------------------
    # An artifact is "consumed" when something depends on it, not when something mentions it.
    referenced = {e['to'] for e in edges if e['edge'] in CLOSURE_EDGES}
    mentioned_only = {e['to'] for e in edges if e['edge'] == 'cites_normative'} - referenced
    any_profile = set()
    for lvl in by_level:
        any_profile |= artifacts_for(lvl, transitive=True)

    # Artifacts the registry declares as required by no profile, with the reason. Subtracting them
    # is what makes the remaining orphans meaningful: an undeclared orphan is a defect to resolve,
    # not noise to tolerate.
    declared = set()
    for group in registry.get('non_profile_artifacts', {}).values():
        if isinstance(group, dict):
            declared |= set(group.get('artifacts', []))

    orphans = {
        'implementation_tier_without_profile_or_consumer': sorted(
            p for p, a in artifacts.items()
            if a['tier'] == 'implementation' and p not in any_profile and p not in referenced
            and p not in declared),
        'declared_non_profile_artifacts': sorted(declared),
        'declared_but_absent_from_the_surface': sorted(declared - known),
        'schema_never_referenced': sorted(
            p for p, a in artifacts.items()
            if a['class'] == 'NORMATIVE_SCHEMA' and p not in referenced and p not in any_profile
            and p not in declared),
        'vector_not_required_by_any_profile': sorted(
            p for p, a in artifacts.items()
            if a['class'] == 'CONFORMANCE_VECTOR' and p not in any_profile),
        'manifest_entry_whose_file_is_missing': sorted(
            p for p in artifacts if not os.path.exists(os.path.join(ROOT, p))),
        'mentioned_in_text_but_not_depended_on': sorted(mentioned_only),
        'unresolved_references': sorted(
            [json.dumps(u, sort_keys=True) for u in unresolved]),
    }

    result = {
        '_header': HEADER,
        '_generator': 'tools/gen-implementation-sets.py',
        '_inputs': ['contracts/production/normative-manifest.json',
                    'contracts/production/conformance-profiles.production.json'],
        '_determinism': 'Sorted throughout and free of timestamps: two runs over an unchanged tree '
                        'are byte-identical.',
        '_dependency_kinds': {
            NORMATIVE: 'needed to determine conforming behaviour',
            CONFORMANCE: 'needed to test or demonstrate conformance',
            GUIDANCE: 'helps an engineer; defines no requirement',
        },
        'protocol_version': registry['protocol_version'],
        'manifest_totals': {
            'artifacts': len(artifacts),
            'implementation': sum(1 for a in artifacts.values() if a['tier'] == 'implementation'),
            'conformance': sum(1 for a in artifacts.values() if a['tier'] == 'conformance'),
            'legal': sum(1 for a in artifacts.values() if a['tier'] == 'legal'),
            'informative': sum(1 for a in artifacts.values() if a['tier'] == 'informative'),
        },
        'edge_counts': {t: sum(1 for e in edges if e['edge'] == t)
                        for t in ('profile_requires', 'schema_ref', 'cites_normative')},
        '_closure_edges': list(CLOSURE_EDGES),
        '_closure_note': 'Closures traverse profile_requires and schema_ref only. cites_normative is '
                         'recorded but never followed: a prose mention is not a dependency, and '
                         'following it collapses every profile into the whole surface.',
        'edges': edges,
        'implementation_sets': [sets[p['level']] for p in registry['profiles']],
        'orphans': orphans,
    }

    if not os.path.isdir(OUTDIR):
        os.makedirs(OUTDIR)
    with io.open(os.path.join(OUTDIR, 'implementation-sets.json'), 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False) + '\n')

    # ---- readable view -----------------------------------------------------
    L = []
    L.append('# Implementation Sets by Conformance Profile')
    L.append('')
    L.append('> **%s**' % HEADER)
    L.append('>')
    L.append('> Generated by `tools/gen-implementation-sets.py` from the Normative Manifest and')
    L.append('> [`contracts/production/conformance-profiles.production.json`](../../contracts/production/conformance-profiles.production.json).')
    L.append('> Nothing here is a requirement. Every requirement below exists because a normative')
    L.append('> artifact states it; this page only shows which ones apply where.')
    L.append('')
    L.append('## Totals on the normative surface')
    L.append('')
    t = result['manifest_totals']
    L.append('| Tier | Artifacts |')
    L.append('|---|---|')
    for k in ('implementation', 'conformance', 'legal', 'informative'):
        L.append('| %s | %d |' % (k, t[k]))
    L.append('| **total** | **%d** |' % t['artifacts'])
    L.append('')
    L.append('## Per profile')
    L.append('')
    L.append('| Profile | Direct | Transitive closure | Incremental | Schemas | Contracts | Registries | Specs | Vectors | Invariants |')
    L.append('|---|---|---|---|---|---|---|---|---|---|')
    for s in result['implementation_sets']:
        c = s['counts']
        L.append('| %s %s | %d | %d | %d | %d | %d | %d | %d | %d | %d |' % (
            s['level'], s['name'], c['direct'], c['transitive'], c['incremental'],
            c['schemas'], c['contracts'], c['registries'], c['specifications'],
            c['vectors'], c['invariants_cumulative']))
    L.append('')
    L.append('These numbers are what the surface actually asks for. They are not presented as small.')
    L.append('')
    for s in result['implementation_sets']:
        L.append('### %s — %s' % (s['level'], s['name']))
        L.append('')
        L.append('Profile closure: %s' % ', '.join(s['profile_closure']))
        L.append('')
        if s['incremental_over_included_profiles']:
            L.append('**Adds over the profiles it includes:**')
            L.append('')
            for p in s['incremental_over_included_profiles']:
                L.append('- `%s` — %s' % (p, artifacts[p]['role'].split('.')[0]))
            L.append('')
        else:
            L.append('Adds no artifact beyond the profiles it includes; its increment is capability'
                     ' and evidence, not new normative material.')
            L.append('')
        if s['not_required']:
            L.append('**Explicitly not required at this level:**')
            L.append('')
            for n in s['not_required']:
                L.append('- %s' % n)
            L.append('')
    L.append('## Orphans and unresolved references')
    L.append('')
    for key, vals in sorted(result['orphans'].items()):
        label = key.replace('_', ' ')
        if key == 'declared_non_profile_artifacts':
            label += ' (declared with a reason in the profile registry — not defects)'
        L.append('- **%s**: %d' % (label, len(vals)))
    L.append('')
    L.append('Orphans are classified, never deleted automatically: an artifact no profile requires')
    L.append('may still be a defect in the profile registry rather than a superfluous file.')
    L.append('')
    with io.open(os.path.join(OUTDIR, 'implementation-sets.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L) + '\n')

    print('  implementation sets written for %d profiles' % len(result['implementation_sets']))
    for s in result['implementation_sets']:
        print('    %-3s direct %3d  transitive %3d  incremental %3d' % (
            s['level'], s['counts']['direct'], s['counts']['transitive'], s['counts']['incremental']))
    unresolved_orphans = sum(len(v) for k, v in result['orphans'].items()
                             if not k.startswith('declared_non_profile'))
    print('  unresolved orphans: %d (declared non-profile: %d)' % (
        unresolved_orphans, len(result['orphans']['declared_non_profile_artifacts'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
