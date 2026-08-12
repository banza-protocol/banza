"""Regenerate contracts/production/normative-manifest.json.

Derivation tool, not a protocol engine: it enumerates the normative surface, classifies each
artifact, and records a SHA-256 for each. The manifest it writes is the normative artifact; this
script is not. Run it whenever a listed artifact changes, then commit the manifest.

Classification is an EXPLICIT decision table, not a heuristic on directory names. Every artifact
carries two independent fields:

  class — what kind of artifact it is
  tier  — what an implementer must DO with it, which is the question that actually matters:

    implementation : an independent implementation must satisfy this to be BANZA 1.0.0
    conformance    : material for DEMONSTRATING that it did; not itself a requirement
    legal          : the legal basis for implementing at all
    informative    : helps a reader; changes no conformance obligation

Listing an artifact here does NOT by itself make it a requirement. Only tier=implementation does.
"""

import json, hashlib, io, os, glob
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NL = chr(10)

IMPL, CONF, LEGAL, INFO = 'implementation', 'conformance', 'legal', 'informative'


def sha(p):
    return hashlib.sha256(io.open(os.path.join(ROOT, p), 'rb').read()).hexdigest()


def rel(p):
    return os.path.relpath(p, ROOT) if p.startswith(ROOT) else p


def g(pattern):
    return sorted(rel(p) for p in glob.glob(os.path.join(ROOT, pattern)))


def self_status(path):
    """The artifact's own declared status, where it declares one. Recorded rather than overridden:
    a divergence between the manifest's tier and the artifact's self-declaration is a finding to
    resolve in the artifact, not something this generator should paper over."""
    if not path.endswith('.json'):
        return None
    try:
        d = json.load(io.open(os.path.join(ROOT, path), encoding='utf-8'))
    except Exception:
        return None
    return d.get('_status') if isinstance(d, dict) else None


items, seen = [], set()


def add(paths, cls, tier, role):
    for p in (paths if isinstance(paths, list) else [paths]):
        if p in seen:
            continue
        seen.add(p)
        e = {"path": p, "class": cls, "tier": tier, "role": role, "sha256": sha(p)}
        st = self_status(p)
        if st:
            e["self_declared_status"] = st
        items.append(e)


# ── Explicitly NOT the protocol surface ─────────────────────────────────────────────────────────
# Audited individually; each declares itself to be about the reference/verification side rather
# than something an operator implements. Listed so that the question "is this normative?" has a
# published answer, and classified so the answer is "no".
add('contracts/openapi/reference-operator.yaml', 'reference-implementation-api', INFO,
    'The L0 sandbox API of the reference implementation. Its own text: "This is not a production '
    'API. All state is in-memory and resets on restart." Not a surface any operator must expose.')
add('contracts/openapi/operator-validation.yaml', 'verification-surface-api', INFO,
    'Self-declared "reference/documentary contract" for the BanzAI validation surface (ADR-068). '
    'Documents request/response shapes of the validation routes; imposes no obligation on an '
    'operator implementation.')
add('contracts/openapi/interoperability-certification.yaml', 'certification-surface-api', CONF,
    'Read-only public surface publishing Layer-2 certification records and the Technical Registry. '
    'Operated by the certifying side, not implemented by operators; it is how conformance is '
    'published, not what conformance requires.')

# ── 1. Version identity and canonicalization ────────────────────────────────────────────────────
add('contracts/production/protocol-version.json', 'NORMATIVE_REGISTRY', IMPL,
    'Declares the protocol version, compatibility policy, profile list and the canonicalization in '
    'force. The entry point of the normative surface.')
add('spec/canonicalization.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'BCJ/1 — the byte form of every signature and digest. Nothing in the trust plane is '
    'implementable without it.')
add('conformance/vectors/canonicalization.json', 'CONFORMANCE_VECTOR', CONF,
    'Vectors for BCJ/1, derived from the specification text. An implementation validates against '
    'these; they do not define the rule.')

# ── 2. Normative specifications (behaviour a contract does not fully carry) ─────────────────────
add('spec/validation-journey.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Self-declared normative. Defines the nine-step endpoint-originated validation journey.')
add('spec/federation/FEDERATION_CONTRACT_SURFACE.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Field-level federation contract definitions, including freshness windows and the routing '
    'idempotency key. Carries requirements not fully expressed in any listed JSON contract.')
add('spec/federation/FEDERATION_PROTOCOL_FLOW.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Federation flow requirements: transport, per-interaction re-evaluation, atomicity of the '
    'three-operation step, retry behaviour.')
add('spec/federation/FEDERATION_TRUST_MODEL.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'The trust chain a verifier walks, and what it must refuse.')
add('spec/federation/FEDERATION_PROTOCOL_SURFACES.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'The surfaces a federation-capable (L3+) operator implements and publishes.')
add('spec/collections.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Self-declared canonical. The Collections capability model every operator implements at L2.')
add('spec/federation/FEDERATION_INVARIANTS.md', 'NORMATIVE_REGISTRY', IMPL,
    'Federation and trust-root invariants (INV-ROOT-*, INV-FEDEVAL-*, INV-FED-*).')
add('contracts/invariants.json', 'NORMATIVE_REGISTRY', IMPL,
    'The machine-readable registry of protocol invariants. spec/invariants.md is its human-readable '
    'restatement and is deliberately not listed: it declares this file the single source of truth.')

# ── 2b. Execution semantics (X-04, X-05) ────────────────────────────────────────────────────────
add('spec/reason-codes.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Reason-code rules: five separate vocabularies, status decides and code explains, the reserved '
    'extension namespace, unknown-code handling, and the definition of semantic equivalence.')
add('contracts/production/reason-code-registry.production.json', 'NORMATIVE_REGISTRY', IMPL,
    'banza-reason-codes/1 — the machine-readable vocabularies those rules govern.')
add('conformance/vectors/reason-codes.json', 'CONFORMANCE_VECTOR', CONF,
    'Vectors for the reason-code rules, derived from the specification.')
add('spec/trust-freshness.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Trust-material freshness and anti-rollback: monotonic acceptance per object and authority, with '
    'an explicit statement of what the rule does NOT provide (first-observation staleness, global '
    'equivocation, suppression, availability).')
add('conformance/vectors/trust-freshness.json', 'CONFORMANCE_VECTOR', CONF,
    'Vectors for the anti-rollback rule, including restart and concurrency.')
add('spec/idempotency.md', 'NORMATIVE_SPECIFICATION', IMPL,
    'Idempotency: key scope, request identity as a BCJ/1 digest, retry and conflict semantics, '
    'retention floor and declaration, concurrency.')
add('conformance/vectors/idempotency.json', 'CONFORMANCE_VECTOR', CONF,
    'Vectors for the idempotency rules. The request-identity digests were computed by an '
    'implementation written from the specification text.')

# ── 3. Trust and security rules ─────────────────────────────────────────────────────────────────
TRUST = ['contracts/federation/key-manifest.json', 'contracts/federation/revocation-list.json',
         'contracts/federation/federation-trust.json', 'contracts/webhooks/signature.json'] + \
        [p for p in g('contracts/production/root-*.json')] + \
        [p for p in g('contracts/production/*.json')
         if os.path.basename(p).startswith(('trust-', 'delegated-', 'signed-protocol-',
                                            'key-manifest', 'revocation-'))]
add(TRUST, 'NORMATIVE_TRUST_RULE', IMPL,
    'Trust-plane rules: key publication and delegation, revocation and freshness, custody and the '
    'offline root ceremony, and signed-artifact envelopes.')

# ── 4. Profiles ─────────────────────────────────────────────────────────────────────────────────
add(g('contracts/production/certification-profile*.json') +
    g('contracts/production/conformance-report*.json') +
    g('contracts/production/certification-record*.json') +
    g('contracts/production/certified-implementation*.json') +
    g('contracts/production/interoperability-report*.json'),
    'NORMATIVE_PROFILE', IMPL,
    'Conformance profile and certification-record structure: what a level means and how a verdict '
    'is expressed.')

# ── 5. Contracts and schemas ────────────────────────────────────────────────────────────────────
add([p for p in g('contracts/production/*.json')
     if 'normative-manifest.json' not in p],          # the manifest never lists itself
    'NORMATIVE_CONTRACT', IMPL, 'Production contract baseline.')
add(g('contracts/federation/*.json'), 'NORMATIVE_CONTRACT', IMPL,
    'Federation contracts: manifest, routing, obligations, events.')
add([p for p in g('contracts/*/*.json')
     if '/production/' not in p and '/federation/' not in p and '/openapi/' not in p],
    'NORMATIVE_SCHEMA', IMPL, 'Domain schemas: payments, QR, events, webhooks, wallets, fees, '
                              'collections, settlements, proofs.')
add(['conformance/manifests/schema.json'], 'NORMATIVE_SCHEMA', IMPL,
    'Schema of the published discovery Operator Manifest. Normative despite living under '
    'conformance/: Open Trust Evaluation check `valid_operator_manifest` validates against it and '
    'contracts/federation/federation-manifest.json extends it.')
add(['conformance/capabilities/schema.json'], 'NORMATIVE_SCHEMA', IMPL,
    'Schema of the published capabilities document.')
add(g('contracts/openapi/*.yaml'), 'NORMATIVE_API', IMPL,
    'Operator-implemented public API surfaces.')

# ── 6. Conformance material ─────────────────────────────────────────────────────────────────────
add(g('conformance/*/suite.json'), 'CONFORMANCE_SUITE', CONF,
    'Conformance case matrices with expected outcomes.')
# The role line does not restate the signature scheme: the vector file declares it in its own
# `scheme` member, which is the single place it should be read from.
add('conformance/vectors/trust-signing.json', 'CONFORMANCE_VECTOR', CONF,
    'Public cryptographic trust vectors: real signatures over BCJ/1 bytes, each with its expected '
    'trust status. See the file\'s own `scheme` member for the algorithms. Test-only material; '
    'public key material only.')
add(g('conformance/vectors/*.json'), 'CONFORMANCE_VECTOR', CONF, 'Domain conformance vectors.')
add('conformance/report-schema.json', 'CONFORMANCE_SUPPORT', CONF, 'Conformance report format.')
add(g('conformance/fixtures/federation/*.json'), 'CONFORMANCE_SUPPORT', CONF,
    'Federation fixtures. Structural vectors: they carry placeholder signatures and do not exercise '
    'cryptography. An implementation validates its signature code against trust-signing.json, not '
    'against these.')

# ── 7. Legal basis ──────────────────────────────────────────────────────────────────────────────
add(['LICENSE', 'NOTICE', 'TRADEMARKS.md'], 'LEGAL', LEGAL,
    'Licence, notice and trademark terms that govern independent implementation.')

items.sort(key=lambda e: ({IMPL: 0, CONF: 1, LEGAL: 2, INFO: 3}[e['tier']], e['path']))
tier_counts = Counter(e['tier'] for e in items)

manifest = {
    "_spec": "BANZA Protocol Normative Manifest",
    "_status": "canonical",
    "_authority": "ADR-081 (versioning), ADR-082 (canonicalization); remediation of audit findings "
                  "F-02/F-04",
    "_source_of_truth": "This manifest.",
    "_boundary": (
        "This manifest identifies the published surface of BANZA 1.0.0 and states, for each artifact, "
        "whether an independent implementation must satisfy it. Being listed here does NOT by itself "
        "make an artifact a requirement: only tier=implementation does. Artifacts not listed at all "
        "are outside the published surface entirely — see not_normative."),
    "protocol": "BANZA",
    "protocol_version": "1.0.0",
    "canonicalization": "BCJ/1",
    "normative_keywords": (
        "BCP 14 (RFC 2119 + RFC 8174). In every artifact listed here, MUST, MUST NOT, REQUIRED, "
        "SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY and OPTIONAL carry their BCP 14 meaning when, "
        "and only when, they appear in all capitals."),
    "tiers": {
        "implementation": "An independent implementation MUST satisfy this artifact to be BANZA "
                          "1.0.0. This is the clean-room reading list.",
        "conformance": "Material for demonstrating conformance. It expresses requirements defined "
                       "elsewhere; where a vector and a contract disagree, the contract governs and "
                       "the vector is a defect.",
        "legal": "The legal basis for implementing and for describing the implementation. Not a "
                 "behavioural requirement.",
        "informative": "Published and stable, but imposes no conformance obligation. Listed so that "
                       "the question 'is this normative?' has a published answer.",
    },
    "tier_counts": {k: tier_counts[k] for k in (IMPL, CONF, LEGAL, INFO)},
    "precedence": [
        "1. spec/canonicalization.md - byte form for signatures and digests",
        "2. contracts/production/protocol-version.json - version identity and compatibility",
        "3. contracts/** and the tier=implementation specifications - structure and behaviour",
        "4. contracts/invariants.json and spec/federation/FEDERATION_INVARIANTS.md - invariants",
        "5. conformance/** - executable expression of the above",
        ("On conflict, the earlier item governs. Where a conformance vector and a contract disagree, "
         "the contract governs and the vector is a defect."),
    ],
    "not_normative": [
        "engines/** - reference implementation",
        "services/**, website/** - reference services and public surface",
        "docs/whitepaper/** - descriptive, explicitly non-normative",
        "docs/reference/**, website/content/BANZA_REFERENCIA.md - explanatory",
        "decisions/adr/** - decisions taken; rationale for requirements, never the requirement. No "
        "ADR is required reading to implement BANZA 1.0.0",
        "decisions/rfc/** - proposals; every BANZA RFC is Draft and none is a requirement of 1.0.0",
        "GOVERNANCE.md, CONTRIBUTING.md, MAINTAINERS.md, SECURITY.md - governance: how the norm "
        "evolves, not what it requires",
        "evidence/**, artifacts/** - evidence about the reference implementation",
        "tools/** - build, guard and derivation tooling",
    ],
    "artifact_count": len(items),
    "artifacts": items,
}

path = os.path.join(ROOT, 'contracts/production/normative-manifest.json')
io.open(path, 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2) + NL)
print('  manifesto normativo escrito: %d artefactos' % len(items))
for t in (IMPL, CONF, LEGAL, INFO):
    print('    tier %-16s %3d' % (t, tier_counts[t]))
print()
for k, n in Counter(i['class'] for i in items).most_common():
    print('    %-30s %3d' % (k, n))
