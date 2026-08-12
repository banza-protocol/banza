"""Regenerate contracts/production/normative-manifest.json.

Derivation tool, not a protocol engine: it enumerates the normative surface and records a
SHA-256 for each artifact. The manifest it writes is the normative artifact; this script is
not. Run it whenever a listed artifact changes, then commit the manifest.
"""

import json, hashlib, io, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NL = chr(10)


def sha(p):
    return hashlib.sha256(io.open(os.path.join(ROOT, p), 'rb').read()).hexdigest()


def entries(paths, kind, role):
    out = []
    for p in sorted(paths):
        rel = os.path.relpath(p, ROOT) if p.startswith(ROOT) else p
        out.append({"path": rel, "kind": kind, "role": role, "sha256": sha(rel)})
    return out


items = []

# 1. Version identity
items += entries(['contracts/production/protocol-version.json'], 'version',
                 'Declares the protocol version, compatibility policy, profile list and the '
                 'canonicalization in force.')

# 2. Canonicalization
items += entries(['spec/canonicalization.md'], 'canonicalization',
                 'Normative byte form for every signature and digest (BCJ/1).')
items += entries(['conformance/vectors/canonicalization.json'], 'test-vectors',
                 'Conformance vectors for BCJ/1, derived from the specification.')

# 3. Contracts
prod = glob.glob(os.path.join(ROOT, 'contracts/production/*.json'))
# The manifest never lists itself: its own digest cannot be computed before it is written.
prod = [p for p in prod if '/examples/' not in p and 'normative-manifest.json' not in p]
items += entries(prod, 'contract', 'Production contract baseline.')
items += entries(glob.glob(os.path.join(ROOT, 'contracts/federation/*.json')), 'contract',
                 'Federation contracts: trust anchor distribution, revocation, routing, obligations, events.')
items += entries([p for p in glob.glob(os.path.join(ROOT, 'contracts/*/*.json'))
                  if '/production/' not in p and '/federation/' not in p], 'contract',
                 'Domain contracts and schemas.')
items += entries(glob.glob(os.path.join(ROOT, 'contracts/*.json')), 'invariants',
                 'Published protocol invariants.')
items += entries(glob.glob(os.path.join(ROOT, 'contracts/openapi/*.yaml')), 'api',
                 'Public API surfaces.')

# 4. Conformance
items += entries(glob.glob(os.path.join(ROOT, 'conformance/*/suite.json')), 'conformance-suite',
                 'Conformance case matrices with expected outcomes.')
# The role line does not restate the signature scheme: the vector file declares it in its own
# `scheme` member, which is the single place it should be read from.
items += entries(['conformance/vectors/trust-signing.json'], 'test-vectors',
                 'Public cryptographic trust vectors: real signatures over BCJ/1 bytes, each with its '
                 'expected trust status. See the file\'s own `scheme` member for the algorithms. '
                 'Test-only material; public key material only.')
items += entries([p for p in glob.glob(os.path.join(ROOT, 'conformance/vectors/*.json'))
                  if 'canonicalization' not in p and 'trust-signing' not in p], 'test-vectors',
                 'Conformance vectors.')
items += entries(glob.glob(os.path.join(ROOT, 'conformance/report-schema.json')), 'conformance-schema',
                 'Conformance report format.')
items += entries(glob.glob(os.path.join(ROOT, 'conformance/fixtures/federation/*.json')), 'fixture',
                 'Federation fixtures. Structural vectors: they carry placeholder signatures and do '
                 'not exercise cryptography.')

# 5. Federation model (normative invariants)
items += entries(['spec/federation/FEDERATION_INVARIANTS.md'], 'invariants',
                 'Federation and trust-root invariants (INV-ROOT-*, INV-FEDEVAL-*).')

# 6. Legal basis
items += entries(['LICENSE', 'NOTICE', 'TRADEMARKS.md'], 'legal',
                 'Licence, notice and trademark terms that govern independent implementation.')

seen, dedup = set(), []
for it in items:
    if it['path'] in seen:
        continue
    seen.add(it['path'])
    dedup.append(it)

manifest = {
    "_spec": "BANZA Protocol Normative Manifest",
    "_status": "canonical",
    "_authority": "ADR-081 (versioning), ADR-082 (canonicalization); remediation of audit findings F-02/F-04",
    "_source_of_truth": "This manifest.",
    "_boundary": ("This manifest identifies the normative surface of BANZA 1.0. Artifacts NOT listed here "
                  "are not normative: the reference implementation (engines/, services/), the website, the "
                  "Whitepaper, the Reference, ADRs and RFCs, evidence and tooling. The reference "
                  "implementation implements this surface; it does not define it."),
    "protocol": "BANZA",
    "protocol_version": "1.0.0",
    "canonicalization": "BCJ/1",
    "normative_keywords": ("BCP 14 (RFC 2119 + RFC 8174). In every artifact listed here, MUST, MUST NOT, "
                           "REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY and OPTIONAL carry their "
                           "BCP 14 meaning when, and only when, they appear in all capitals."),
    "precedence": [
        "1. spec/canonicalization.md - byte form for signatures and digests",
        "2. contracts/production/protocol-version.json - version identity and compatibility",
        "3. contracts/** - structure and semantics of artifacts and interfaces",
        "4. contracts/invariants.json and spec/federation/FEDERATION_INVARIANTS.md - invariants",
        "5. conformance/** - executable expression of the above",
        ("On conflict, the earlier item governs. Where a conformance vector and a contract disagree, the "
         "contract governs and the vector is a defect."),
    ],
    "not_normative": [
        "engines/** - reference implementation",
        "services/**, website/** - reference services and public surface",
        "docs/whitepaper/** - descriptive, explicitly non-normative",
        "docs/reference/**, website/content/BANZA_REFERENCIA.md - explanatory",
        "decisions/adr/**, decisions/rfc/** - decisions and proposals; rationale, not requirements",
        "evidence/**, artifacts/** - evidence about the reference implementation",
        "tools/** - build, guard and derivation tooling",
    ],
    "artifact_count": len(dedup),
    "artifacts": dedup,
}

path = os.path.join(ROOT, 'contracts/production/normative-manifest.json')
io.open(path, 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2) + NL)
print('  manifesto normativo escrito: %d artefactos' % len(dedup))
from collections import Counter
for k, n in Counter(i['kind'] for i in dedup).most_common():
    print('    %-20s %d' % (k, n))
