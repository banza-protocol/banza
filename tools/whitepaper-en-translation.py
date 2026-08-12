#!/usr/bin/env python3
# BANZA Whitepaper — official EN translation of the canonical PT edition.
#
# The PT dossier (docs/whitepaper/latex/whitepaper.pt.tex) is the canonical source; content/pt.json is
# derived from it by tools/whitepaper-pt-content.py. This script carries the official English translation
# and writes content/en.json with EXACTLY the block structure of pt.json, so the EN edition can never
# drift structurally from the canonical one. Only the natural-language text differs; equations, figure
# placements, references and metadata are taken from the derived PT structure.
#
# Run:  python3 tools/whitepaper-en-translation.py [--check]
import json, sys

PT = 'docs/whitepaper/content/pt.json'
EN = 'docs/whitepaper/content/en.json'

ABSTRACT = (
    "Independent financial operators interoperate through bilateral integrations and shared "
    "infrastructures, but the specifications, the tests and the results are not always public, which "
    "makes technical validation hard to reproduce. This article presents BANZA, an open financial "
    "interoperability protocol grounded in public and versioned rules, in the separation between "
    "specification and implementation, in deterministic validation and in verifiable evidence. The "
    "protocol defines common contracts, profiles and mechanisms that allow implementations to be "
    "evaluated without conformance depending on the reference implementation, keeping the protocol "
    "specification, the conformance evaluation and the operational infrastructures used by participants "
    "separate. Each result is associated with the inputs that produced it through canonical artifacts, "
    "cryptographic digests, reason codes and receipts, so that the technical basis of each evaluation can "
    "be inspected and verified, and the evaluation can be reproduced by third parties. The protocol and "
    "the reference implementation remain in pre-production; independent third-party implementation, "
    "performance, scalability, adoption and behaviour in real operational environments have therefore not "
    "yet been demonstrated experimentally."
)

# One ordered list of EN paragraphs per section, matching the 'p' blocks of pt.json in order.
PARAS = {
 1: [
  "Financial operators rarely function in isolation. To transfer value or exchange messages, their "
  "implementations must agree on formats, identity mechanisms, keys, error semantics and test procedures. "
  "In bilateral integrations these elements are defined between each pair of operators; when "
  "specifications, tests and results remain private, work may be repeated and technical validation "
  "becomes difficult for third parties to reproduce.",

  "Let \\(n\\) be the number of operators. Equations {{eq:bilateral}} and {{eq:common}} represent, "
  "respectively, a mesh of bilateral integrations and the adoption of a common protocol.",

  "Equation {{eq:bilateral}} counts technical relationships between pairs, while Equation {{eq:common}} "
  "counts the implementations required when every operator adopts the same specification. If a mesh "
  "contains \\(n\\) operators, the entry of one additional operator may require \\(n\\) new bilateral "
  "integrations; under a common protocol it requires one new implementation of the protocol. "
  "Figure {{fig:bilateral}} illustrates both regimes, distinguishing a common specification from a "
  "central infrastructure.",

  "A common protocol does not imply a common infrastructure. In the BANZA model each operator may keep "
  "its own implementation, infrastructure and operational relationships, provided that it observes the "
  "specified behaviour and publishes the artifacts required by the version and the profile it adopts. The "
  "protocol defines common technical conditions; it does not require messages, funds or decisions to "
  "traverse a central BANZA infrastructure.",

  "Interoperability can also be provided by shared and centralised infrastructures. Those systems may "
  "continue to perform routing, clearing, settlement or other operational functions. BANZA does not seek "
  "to replace them: it adds an open layer of specifications, profiles, public and versioned contracts, "
  "deterministic conformance and verifiable, reproducible evidence. An implementation can therefore "
  "coexist with different infrastructures, switching systems, schemes or networks, subject to their "
  "respective operational and regulatory rules.",

  "Standards such as ISO 20022 [1], ISO 8583 [2], the EMV specifications for QR payments [3] and "
  "ISO/IEC 9646 [4] address relevant components of messaging, payments and conformance testing. BANZA "
  "complements this work by defining an open protocol in which each implementation publishes artifacts at "
  "its canonical origin, is evaluated against a public version and profile, and produces results "
  "associated with the observed inputs. Evaluation applies to implementations, not to entities, keeping "
  "protocol, certification and operational schemes separate.",

  "This document is descriptive and not normative; the requirements of the protocol are defined by the "
  "applicable versioned normative artifacts. Sections {{sec:model}} and {{sec:architecture}} present the "
  "model and the architecture; Section {{sec:profiles}}, the conformance profiles; "
  "Section {{sec:discovery}}, discovery, identity and trust; and Sections {{sec:validation}} and "
  "{{sec:evidence}}, validation and evidence. Security and governance are covered in "
  "Sections {{sec:security}} and {{sec:governance}}; limitations and current state, in "
  "Sections {{sec:limitations}} and {{sec:state}}; and Section {{sec:conclusion}} presents the conclusions.",
 ],
 2: [
  "BANZA distinguishes an operator from an implementation. An operator is the responsible organisational "
  "entity; an implementation is the technical system under evaluation. The same operator may publish "
  "several demonstration, test, pre-production or production implementations. Any validation or "
  "certification result always applies to a determined implementation, protocol version, profile, "
  "environment, scope, evidence set and validity period, and never to an entity in the abstract.",

  "Each implementation has a stable identifier, and the exact set of evaluated artifacts — the built "
  "version — is fixed by a cryptographic content digest. A different built version constitutes a "
  "distinct subject of evaluation, even if it belongs to the same implementation, and requires its own "
  "evaluation.",

  "We model an implementation as a six-element tuple. In Equation {{eq:tuple}}, \\(o\\) identifies the "
  "operator, \\(i\\) the implementation, \\(v\\) the protocol version, \\(p\\) the conformance profile, "
  "\\(e\\) the environment and \\(u\\) the canonical origin.",

  "The programming language, the database, the infrastructure provider and the origin of the code are not "
  "part of this tuple. This omission is intentional: conformance must depend on the contracts and on "
  "observable behaviour, and not on the internal technology or on the use of the reference implementation.",

  "The artifacts observed at the origin at a given instant \\(t\\) form a set. Equation {{eq:artifacts}} "
  "represents that set, where \\(n\\) is the number of artifacts.",

  "Validation takes those artifacts and the applicable specification \\(S\\) for version \\(v\\) and "
  "profile \\(p\\). The evaluation is executed by engine version \\(m\\) and produces the result \\(R\\), "
  "the evidence \\(E\\) and the receipts \\(P\\). In this model, \\(R\\) comprises the verdict and the "
  "reason code that grounds it.",

  "Scope is explicit and not implicit: a result declares the profile against which it was evaluated, the "
  "protocol version, the environment and the evidence consumed. It is valid only for that combination and "
  "cannot be automatically extrapolated from the evaluated artifact to the entity that published it. "
  "Reproducibility is a central property of the model: given equivalent canonical inputs, the same "
  "specification, the same profile and the same engine version, independent executions produce "
  "semantically equivalent verdicts and reason codes [8]. Non-deterministic metadata, such as execution "
  "timestamps, are excluded from this equivalence.",

  "Cryptographic content digests, computed with SHA-256 [5], make it possible to identify and compare "
  "exactly the observed inputs. Together with the availability of those inputs, they turn a validation "
  "claim into a technical basis that can be re-evaluated by third parties.",
 ],
 3: [
  "BANZA is organised in three institutional layers, separated by responsibility, infrastructure and "
  "keys. Layer 1 – Open protocol brings together specifications, contracts, profiles and common "
  "mechanisms for discovery, identity, trust, revocation and federation. Layer 2 – Conformance and "
  "Interoperability Certification brings together conformance evaluation and, where applicable, the "
  "technical certification of implementations against public profiles and versions, based on "
  "deterministic engines and verifiable evidence. Layer 3 – Independent operational schemes comprises "
  "infrastructures, networks and schemes that may adopt BANZA and remain subject to their respective "
  "legal, commercial and regulatory rules.",

  "The architecture rests on five architectural invariants. First, open specification: the applicable "
  "rules, contracts and profiles are public and versioned. Second, implementation independence: no "
  "particular implementation constitutes the protocol; the reference implementation realises BANZA but "
  "does not define it. Third, independent verification: the published artifacts must allow a party to "
  "evaluate the applicable technical conditions without depending on a private decision of the evaluated "
  "operator or of the protocol maintainer. Fourth, operational independence: BANZA does not require a "
  "central infrastructure to carry messages or funds. Fifth, separation of decisions: conformance "
  "evaluation, technical certification, scheme admission, operational agreements and regulatory "
  "authorisation belong to distinct processes.",

  "The separation of the layers preserves the neutrality of the protocol. Technical adoption of BANZA "
  "consists of implementing the public specification and satisfying the applicable contracts; it does not "
  "require the use of the reference implementation's code, nor a connection to a mandatory central "
  "service of the protocol maintainer. From the standpoint of the protocol, building an implementation "
  "does not require prior authorisation from the protocol maintainer; demonstrating conformance, "
  "obtaining certification, joining a scheme and operating in a market remain distinct acts. BanzAI acts "
  "as a human interface for consulting and explaining results, without taking part in the technical "
  "determination; automated consumers access the public interfaces directly. The L0–L4 profiles, "
  "presented in Section {{sec:profiles}}, are distinct from the three layers.",
 ],
 4: [
  "BANZA defines five cumulative conformance levels, from L0 to L4. Technical adoption involves choosing "
  "a profile, publishing the artifacts at the canonical origin and executing the validation journey. A "
  "positive result at a level constitutes evidence that the technical conditions defined for that level "
  "are satisfied; it is not, in itself, certification, authorisation or admission.",

  "Level L0 – Protocol Sandbox validates the secure configuration of the protocol in a test "
  "environment, with a valid manifest and correct monetary representation. L1 – Core Payment "
  "Capability adds essential payment and traceability capabilities. L2 – Payment Initiation "
  "Capability adds payment initiation by request or dynamic QR code. L3 – Inter-Operator "
  "Interoperability adds requirements and evidence of interoperability between operators, including "
  "technical conditions related to routing, settlement and reconciliation; those functions continue to be "
  "performed by the applicable operators or schemes. L3 constitutes the eligibility threshold for "
  "federation and requires evidence involving more than one operator. L4 – External Interoperability "
  "adds integration with external networks; it is defined by profile and requires specific evidence of "
  "that integration.",

  "Levels L0 to L2 can be assessed within a single operator, whereas L3 and L4 require, respectively, "
  "evidence involving more than one operator and evidence of external integration. A certification "
  "profile is distinct from these levels: it fixes a conformance level and the set of required "
  "capabilities, contracts and endpoints.",
 ],
 5: [
  "Each implementation publishes its artifacts at a canonical origin controlled by the operator [7]. "
  "Discovery starts at a fixed path under that origin and returns the material needed to identify the "
  "implementation, the protocol version, the declared profile, the endpoints, the signed metadata and the "
  "public keys. The Technical Registry may index operator, implementation and canonical origin, but its "
  "presence does not constitute approval and does not replace the evaluation of the published artifacts.",

  "Identity and integrity rest on published keys and signed metadata. A trust root, kept offline, signs "
  "only the Key Manifest with Ed25519 [6]; that manifest authorises domain-separated delegated keys, "
  "which sign the corresponding artifacts. Revocation and validity-control mechanisms make it possible to "
  "reject revoked or expired material and to track authorised replacements. The secure-fetch module "
  "resolves the target from the canonical origin and applies the security restrictions defined by the "
  "protocol.",
 ],
 6: [
  "Validation follows a fixed journey of eight technical steps and one final aggregation step. Each step "
  "is executed by deterministic engines and receives one of four states: verified, pending, failed or "
  "blocked. The evaluation is fail-closed: absent, expired or inconsistent evidence never produces "
  "approval. Certification readiness is reached only when all the steps required by the profile are "
  "verified, but it does not constitute certification in itself.",

  "The technical determination remains separate from the explanation. The engines produce results and "
  "reason codes; BanzAI only presents and explains them, without altering them. Technical certification "
  "is a distinct process, which formally associates an implementation with a versioned public profile.",

  "Figure {{fig:example}} shows the directional evaluation of an implementation B by an implementation or "
  "evaluator A. B publishes its material; A starts the journey, fetches the artifacts from the canonical "
  "origin and executes the evaluation locally. BANZA provides the verifiable technical basis, but the "
  "operational use of the result remains under A's policy. The architecture does not require A and B to "
  "share code, provider or infrastructure; the experimental demonstration of this independence by third "
  "parties is presented in Section {{sec:state}} as a property that is still to be demonstrated.",
 ],
 7: [
  "Each validation produces results, receipts and verifiable evidence. The receipts record the executed "
  "steps and associate each result with the protocol version, the profile, the consumed artifacts, their "
  "cryptographic digests and the reason codes, making it possible to confirm or reproduce the technical "
  "basis of the evaluation.",

  "A receipt represents the state observed at the instant of the evaluation; later changes to the "
  "artifacts require a new evaluation. The Evidence Bundle gathers the artifacts and references that "
  "support the result, but it does not constitute certification and does not confer any operational "
  "status. Publication is separate from evaluation: results may be indexed in the Technical Registry, but "
  "the absence of an entry does not constitute a prohibition and its presence does not amount to "
  "authorisation. Independent verification requires the evidence to be sufficient for a third party to "
  "repeat the applicable steps of the evaluation without depending on a private decision of the protocol "
  "maintainer.",
 ],
 8: [
  "The threat model considers artifact tampering, invalid origins or keys, challenge replay, expired or "
  "incomplete evidence and version divergence. In remote fetching it also includes SSRF and DNS "
  "rebinding attacks. BANZA responds with signatures, revocation, expiry, single-use challenges and "
  "fail-closed evaluation, in which absent or inconsistent inputs are not approved.",

  "The secure-fetch module is the only component that reaches the operator's endpoints along the "
  "evaluation path. The target is resolved from the canonical origin, never from an arbitrary URL "
  "supplied by the caller. The module accepts HTTPS only, blocks private and local addresses as well as "
  "addresses associated with cloud-platform metadata services, establishes the connection only with "
  "previously validated addresses, does not follow redirects, validates TLS and bounds the responses "
  "received. These guarantees are part of the observable requirements of secure fetching and do not "
  "depend on a specific internal technology.",
 ],
 9: [
  "BANZA evolves through public and versioned instruments: RFCs structure the proposals and their "
  "discussion; ADRs record the architectural decisions and their state. The protocol follows explicit "
  "versioning; incompatible changes require a new major version, whereas compatible changes may enter "
  "minor or patch versions. Each implementation declares the version and the profile it adopts, and a "
  "certification profile remains immutable once published.",

  "The openness of the protocol does not eliminate governance. Governance determines how the public rules "
  "evolve, but it does not turn the protocol maintainer into a necessary technical intermediary between "
  "implementations. The ability to implement a published version is distinct from the authority to change "
  "that version: an implementation claiming conformance must satisfy the applicable contracts, whereas "
  "changes to the rules follow the public process of decision and versioning. Certification, scheme "
  "admission and market operation remain distinct processes.",

  "Incompatible changes are announced and accompanied by a migration path, allowing temporary coexistence "
  "between versions. Deprecation occurs explicitly and in phases. The current protocol version is 1.0.",
 ],
 10: [
  "BANZA's guarantees have clear boundaries. First, they are technical, not regulatory: a positive "
  "result demonstrates conformance with a public profile, but it does not imply authorisation to operate, "
  "scheme admission or a commercial agreement.",

  "Second, reproducibility concerns the evaluations executed by deterministic engines over the declared "
  "inputs. It does not extend to properties that the protocol does not observe, such as an operator's "
  "internal controls or off-protocol behaviour. The protocol can react to a compromised origin or key "
  "only when the compromise manifests itself through observable signals, revocation material or other "
  "foreseen evidence.",

  "Third, the openness of the specification does not, in itself, demonstrate the ease of independent "
  "implementation. That property depends on the completeness of the contracts, on the quality of the "
  "conformance vectors and on the capacity of an external team to build a conformant implementation "
  "without resorting to the reference implementation's code. Likewise, the possibility of integration "
  "foreseen by the architecture with external infrastructures does not demonstrate effective access to "
  "those infrastructures, which may depend on interfaces, agreements, scheme rules or authorisation.",

  "Finally, the evidence presented in this document is architectural in nature. It demonstrates mechanisms "
  "in the reference implementation, but it does not measure performance, scale or adoption. It does not, "
  "in itself, demonstrate the existence of an independent implementation developed by third parties, nor "
  "interoperability in production between unrelated organisations.",
 ],
 11: [
  "BANZA remains in pre-production. As of this edition, the Technical Registry contains zero production "
  "operators and zero active technical certifications; payments with real money remain disabled at this "
  "stage. No public performance measurements are presented and the empty registry corresponds to the "
  "expected pre-production state.",

  "The reference implementation, Operator Zero, runs in an isolated test environment, in read mode and "
  "with a demonstration currency. It moves no real funds, remains uncertified and is not intended "
  "for production, and it is evaluated by the same contracts and the same journey applicable to all other "
  "implementations.",

  "The architecture is designed to allow independent implementations from the public specification, but "
  "that property has not yet been demonstrated through a third-party implementation developed without "
  "recourse to the reference implementation's code. Interoperability between independent implementations, "
  "effective integration with external infrastructures and use in real operational environments therefore "
  "remain objectives for experimental validation and not results already established.",

  "To demonstrate implementation independence convincingly, an external implementation will be required, "
  "built from the public specifications and contracts without resorting to the reference code, able to "
  "satisfy the applicable conformance vectors and to take part in a directional evaluation with another "
  "implementation, producing semantically equivalent results and verifiable evidence. Success in that "
  "exercise will demonstrate the capacity for independent implementation, but it will still not amount to "
  "regulatory authorisation, adherence to a scheme or use in production.",
 ],
 12: [
  "This work presented BANZA as an open financial interoperability protocol whose definition does not "
  "depend on any particular implementation and whose conformance can be evaluated through deterministic "
  "mechanisms and verifiable evidence. The protocol does not define a mandatory central infrastructure "
  "for moving messages or funds; it seeks to establish a common technical basis that can coexist with "
  "different operators, schemes and operational infrastructures.",

  "The main contributions are:",

  "The architecture rests on five architectural invariants: open specification, because the rules are "
  "public and versioned; implementation independence, because no concrete implementation constitutes the "
  "protocol on its own; independent verification, because third parties must be able to reproduce the "
  "evaluation; operational independence, because BANZA does not need to intermediate messages or funds; "
  "and separation of decisions, because conformance evaluation, technical certification, operational "
  "schemes, operational agreements and regulatory authorisation belong to distinct processes.",

  "These properties define an architectural direction, not a claim of maturity already attained. The "
  "conformance of an implementation does not constitute authorisation to operate, and the current "
  "pre-production state does not yet allow conclusions about performance, scalability, adoption or "
  "effective integration with external infrastructures. In particular, the capacity for independent "
  "implementation must be demonstrated by an external implementation built from the public specification "
  "without depending on the reference code.",

  "Future work should test that independence directly through implementations developed by distinct teams "
  "and evaluate the resulting interoperability between several operators. It should also measure "
  "reproducibility across independent evaluators, performance, scalability, integration costs and the "
  "application of external interoperability profiles.",

  "In summary, BANZA seeks to make the technical basis of interoperability public and verifiable without "
  "turning the protocol into a mandatory operational intermediary. Its central contribution is to "
  "establish the conditions for different implementations to adopt the same specification, demonstrate "
  "that they satisfy the applicable technical requirements and produce verifiable evidence that allows "
  "third parties to reproduce the evaluation.",
 ],
}

LIST_12 = [
  "evaluation of implementations against public versions and profiles, rather than entities in the abstract;",
  "separation between the public specification of the protocol and any particular implementation, so that "
  "conformance depends on observable behaviour and not on the origin of the code or the technology used;",
  "separation between protocol, certification and operational schemes, keeping technical conformance, "
  "admission, operational agreements and regulatory authorisation distinct;",
  "deterministic validation bound to the input artifacts through cryptographic digests, reason codes, "
  "receipts and verifiable evidence;",
  "cumulative conformance profiles and a validation journey with explicit states and fail-closed behaviour;",
  "separation between technical determination, operational decision and BanzAI-assisted explanation.",
]

CAPTIONS = {
 1: "Comparison between a complete bilateral mesh and a common protocol. In the second regime each "
    "operator keeps its own implementation; the public specification is the shared element, not a "
    "mandatory central infrastructure.",
 2: "The result is bounded by the implementation and by the observed artifacts. The internal technology is "
    "not part of the conformance criteria, provided that the observable contracts are satisfied.",
 3: "Layer 1 defines the common specification; distinct implementations implement that specification; "
    "Layer 2 evaluates conformance by evidence; and Layer 3 remains operationally independent. BanzAI is "
    "transversal, not a fourth layer.",
 4: "The profiles are cumulative. L3 adds evidence between operators and the technical federation "
    "threshold; L4 requires specific evidence of external integration.",
 5: "The implementation publishes artifacts at its canonical origin; the evaluator fetches them through a "
    "secure-fetch module and hands them to the engines. Discovery does not depend on a private decision of "
    "the protocol maintainer.",
 6: "Eight technical steps and one aggregation step. Certification readiness aggregates the steps required "
    "by the applicable profile and does not constitute certification.",
 7: "Evaluation A\\(\\rightarrow\\)B. Implementation B publishes verifiable material; A fetches the "
    "artifacts, executes the evaluation locally and can verify or reproduce the result. The protocol does "
    "not require a central intermediary between A and B.",
 8: "The engines evaluate artifacts and produce results and receipts; the Evidence Bundle gathers "
    "verifiable material. Publication in the Technical Registry is optional and BanzAI remains outside the "
    "technical determination.",
 9: "Threats considered, protection mechanisms and expected results. Security does not depend on implicit "
    "trust in the origin or in the evaluated operator.",
 10: "The evolution of the protocol separates proposal, recorded decision and versioned publication. "
     "Governing rules does not amount to operating transactions or to authorising participants.",
 11: "BANZA evaluates observable technical conditions; regulatory authorisation, internal controls, "
     "commercial agreements, scheme admission and effective access to operational infrastructures remain "
     "outside that result.",
 12: "Pre-production state: no production operators, no active technical certifications, real money "
     "disabled and no demonstration, to date, of an independent implementation developed by third parties.",
}


def build():
    pt = json.load(open(PT))
    old = json.load(open(EN))
    new = dict(old)
    new['abstract'] = ABSTRACT
    secs = []
    for s in pt['sections']:
        n = s['number']
        paras = list(PARAS[n])
        blocks = []
        for b in s['blocks']:
            if b['t'] == 'p':
                assert paras, f'EN paragraphs exhausted in section {n}'
                blocks.append({'t': 'p', 'text': paras.pop(0)})
            elif b['t'] == 'list':
                assert n == 12 and len(b['items']) == len(LIST_12), 'list mismatch'
                blocks.append({'t': 'list', 'items': list(LIST_12)})
            else:
                blocks.append(dict(b))
        assert not paras, f'unused EN paragraphs in section {n}: {len(paras)}'
        old_sec = next(o for o in old['sections'] if o['label'] == s['label'])
        secs.append({'id': s['id'], 'number': n, 'title': old_sec['title'],
                     'label': s['label'], 'blocks': blocks})
    new['sections'] = secs
    figs = []
    for f in pt['figures']:
        g = dict(next(o for o in old['figures'] if o['id'] == f['id']))
        g['caption'] = CAPTIONS[f['n']]
        figs.append(g)
    new['figures'] = figs
    new['references'] = list(pt['references'])
    return new


if __name__ == '__main__':
    out = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        if open(EN).read() != out:
            print('whitepaper-en-translation: DRIFT — content/en.json is not the official translation of '
                  'the canonical PT structure', file=sys.stderr)
            sys.exit(1)
        print('whitepaper-en-translation: ok — en.json matches the PT structure + official translation')
    else:
        open(EN, 'w').write(out)
        print(f"written {EN}: {len(build()['sections'])} sections, "
              f"{sum(1 for s in build()['sections'] for b in s['blocks'] if b['t']=='p')} paragraphs")
