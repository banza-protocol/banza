# Related Work and Architectural Positioning

- **Status: Informative.** This document imposes no conformance obligation and defines no BANZA
  requirement. It is not part of the normative surface
  ([`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json)),
  and nothing in it may be cited as a rule.
- **Purpose:** to state precisely where BANZA 1.0.0 sits relative to four bodies of work it is regularly
  compared to, and to record what each of them provides that BANZA does not.
- **Sources:** primary only — the specifications and their publishers' own documentation. Where a claim
  rests on a quotation, the quotation is given. Secondary commentary, vendor material and press coverage
  are not used.
- **Direction of authority:** this document reads the normative surface; the normative surface never
  reads this document. If the two ever disagree, the normative surface governs and this file is the
  defect.

---

## 0. How to read this document

Each section answers three questions, in this order:

1. **What is it, precisely?** — stated from the primary source, in the terms that source uses.
2. **Where is its architectural boundary?** — what it takes responsibility for, and what it leaves to
   someone else.
3. **What does that mean for BANZA?** — adopt, do not adopt, or not yet, with the reason.

The third answer is allowed to be **"do not adopt"**, and that is a result, not a failure. A comparison
whose only permitted conclusion is adoption is not a comparison. Likewise, none of these sections argues
that BANZA is better than the work it describes: three of the four solve problems BANZA does not solve,
and one of them solves a problem BANZA has explicitly declined to take on.

A note on fairness. It is easy to make a comparison flattering by describing the other system in the
weakest form it could take. Each section below therefore describes its subject in the strongest form its
own specification supports, and says what BANZA lacks by comparison before saying what differs.

---

## 1. Mojaloop

### What it is

Mojaloop is **both specification and software**, governed by the Mojaloop Foundation and published open
source. Its documentation describes open-source implementations together with "a standard set of
interfaces a DFSP can implement to connect to the system."

The FSPIOP specification document set is substantial: a Logical Data Model, Generic Transaction Patterns,
Use Cases, the API Definition, a Central Ledger API, JSON Binding Rules, Scheme Rules, and PKI Best
Practices, Signature and Encryption documents. There are also Administration, Settlement and Third-party
Payment Initiation APIs.

Describing Mojaloop as "an implementation, not a specification" would be **factually wrong**. Any
positioning that depends on Mojaloop lacking a specification is unsound.

### Its architectural boundary — specification and platform are not the same thing

This distinction has to be made carefully, because the obvious summary is wrong.

**The FSPIOP specification does not require a hub.** It states, in its own words:

> "The API does not specify any front-end services between a Payer or Payee and its own FSP; all services
> defined in the API are between FSPs. FSPs are connected either (a) directly to each other or (b) by a
> _Switch_ placed between the FSPs to route financial transactions to the correct FSP."

The specification carries that through: elsewhere it refers to the "optional Switch" when describing
expiry and timeout handling, and notes that an Account Lookup Service "could either be implemented by the
switch or as a separate service, depending on the setup in the market." So at the level of the
interoperability specification, **bilateral and Switch-mediated topologies are both admitted**, and any
claim that "a hub is architecturally required in Mojaloop" is false as a general statement.

**The reference platform and operational architecture are hub-centred.** That is a different layer of the
same project. The technical documentation describes "a set of central services [that] provides a hub
through which money can flow from one DFSP to another," comparing it to "a central bank or clearing
house," able to "provide identity lookup, fraud management, and enforce scheme rules." The Central Ledger
API exists so that **Hub Operators** can manage participants, endpoints, accounts, limits and positions.

Both statements are true, of different things. Keeping them apart is the whole of the correction:

| | What it is | Topology |
|---|---|---|
| FSPIOP specification | An interoperability API between FSPs | Bilateral **or** Switch-mediated; the Switch is optional |
| Mojaloop platform / reference deployment | An open-source platform and operational architecture for running a payment scheme | Organised around a Hub / Central Services, with central ledger, participant management, positions and limits, and settlement-related operations |

### Conformance: a difference of scope and evidence model, not of existence

Mojaloop has its own conformance instrumentation. The ML Testing Toolkit is documented as a tool by which
schemes "provide a set of rules and tests … and DFSPs can use it for self testing (or self-certification
in some cases)," to verify integration between a DFSP and a Mojaloop hub, easing DFSP onboarding.

It would be wrong to suggest Mojaloop has only informal onboarding. It has a specification, testing
tooling and onboarding processes. **The difference worth studying is scope and evidence model:** the
toolkit's documented purpose is integration testing between a participant and a hub under a scheme's
rules, whereas BANZA conformance is stated against a published specification and produces signed evidence
intended to be re-verified by a third party without access to either endpoint. Which model suits which
purpose is not settled here, and this document does not claim one is better.

### What that means for BANZA

The accurate formulation, checked against the sources quoted above:

> Mojaloop combines an interoperability specification with an open-source platform and operational
> architecture for deploying payment schemes, including a Hub / Central Services model. Its FSPIOP
> specification can support bilateral as well as Switch-based communication. BANZA places stronger
> architectural emphasis on separating the public protocol specification, deterministic conformance
> evidence, and operational schemes, such that no BANZA-maintained operational infrastructure is required
> as the authority or mandatory transaction intermediary.

That is a difference of **emphasis and separation**, not a difference between "hub" and "no hub".

One clarification, because an earlier draft of this document got it wrong. BANZA **does** specify
payment operations: `contracts/openapi/transfers.yaml` is a normative API on the surface, required at
L1, defining a transfer operation with its idempotency, currency and error semantics; payment intents,
payment sessions and QR payloads have normative schemas and lifecycles; federation routing and
settlement obligations have normative contracts. What BANZA does not do is **perform** any of them. It
specifies contracts that implementations implement, and runs no service that moves value.

So the comparison is between two specifications of payment interoperability, not between a payment
specification and something else. The difference remains where §1 puts it: what each takes
responsibility for operating, and how sharply the specification, the conformance evidence and the
operational scheme are held apart.

**Layer 3, as a BANZA-side reading.** A deployed Mojaloop Hub and its scheme is conceptually comparable
to what BANZA classifies as an independent operational scheme in Layer 3. This is **BANZA's architectural
interpretation, not a description Mojaloop makes of itself** — Mojaloop does not use BANZA's layer
categories, and nothing here should be quoted as though it did.

### On maturity, stated only as far as the sources go

Mojaloop publishes an operating open-source platform, deployment tooling and testing instrumentation, and
names central banks, hub operators and financial institutions as its intended users. The primary sources
consulted for this document make **no concrete claim about specific production deployments**, so this
document makes none either, and no such claim should be attributed to it.

What can be stated without qualification is the BANZA-side fact, which is verifiable in this repository:
**no independent implementation of BANZA has yet been demonstrated.** Whatever Mojaloop's deployment
footprint is, BANZA's is empty, and that asymmetry is real regardless of how the other side is counted.

**Conclusion: not a substitute in either direction.** BANZA adopts nothing from Mojaloop's platform
architecture because the two address different layers, and claims no superiority over a project operating
at a layer BANZA deliberately does not occupy.

---

## 2. Decentralized Identifiers (DID)

### What it is

*Decentralized Identifiers (DIDs) v1.0: Core architecture, data model, and representations* — a **W3C
Recommendation** of 19 July 2022. Its abstract describes identifiers "decoupled from centralized
registries, identity providers, and certificate authorities," where "the controller of a DID [can] prove
control over it without requiring permission from any other party."

### Its architectural boundary

DID Core defines an identifier syntax, a DID document data model, verification methods and services. It
deliberately **does not** define the operations that make an identifier usable: creation, resolution,
update and deactivation are delegated to individual DID methods, as is revocation. At publication the
specification recorded 103 experimental DID method specifications.

That is the boundary, and it is a real one: adopting "DIDs" is not adopting one mechanism. It is adopting
a data model plus a choice of method, and the method carries the operational properties that matter for
trust — how keys are published, how they are rotated, how revocation propagates, and what infrastructure
must exist for resolution to work.

### What that means for BANZA

BANZA needs to name signing authorities and bind them to public keys. DIDs are a well-specified way to do
that, and using them would place BANZA identifiers in a broader interoperability ecosystem. That is a
genuine benefit and is not dismissed here.

Against it: BANZA's current model publishes keys in a Key Manifest signed by a Trust Root, retrievable
from a canonical origin and verifiable offline with no resolution infrastructure. Adopting DIDs would add
a resolution step, and the properties that step delivers depend entirely on which method is chosen —
which is a decision BANZA would then have to make, defend and pin in a conformance profile. The
demonstrated need for that does not currently exist: BANZA has no cross-ecosystem identifier requirement
that its own key identifiers fail to meet.

**Conclusion: do not adopt in 1.0.0.** This is a "not needed yet", not a "not good". The condition that
would change it is concrete and worth recording: a requirement to interoperate with an identity ecosystem
that already resolves DIDs, or a party outside BANZA that must verify BANZA signatures using identifiers
it obtains elsewhere. Neither exists today. Adopting a resolution dependency before that requirement
exists would add operational surface for no verifiable gain.

---

## 3. Verifiable Credentials

### What it is

*Verifiable Credentials Data Model v2.0* — a **W3C Recommendation** of 15 May 2025. It describes "an
extensible data model for verifiable credentials, how they can be secured from tampering, and a
three-party ecosystem … composed of issuers, holders, and verifiers," together with a verifiable data
registry.

### Its architectural boundary

Two statements in the specification define its boundary precisely, and both are directly relevant to
BANZA:

- "verification of a credential does not imply evaluation of the truth of claims encoded in the
  credential"
- "upon establishing the authenticity and currency of a verifiable credential or verifiable
  presentation, a verifier validates the included claims using their own business rules before relying
  on them"

That is the same separation BANZA draws between *the artifact is authentic* and *the artifact justifies a
decision*. VCDM also leaves securing mechanisms and revocation procedures to other specifications.

### What that means for BANZA

The three-party model is a real fit in shape: BANZA has issuers of signed artifacts, parties that hold
and present them, and verifiers that evaluate them. Expressing BANZA's signed artifacts as verifiable
credentials would make them legible to tooling built for that ecosystem, and would let BANZA inherit an
externally maintained data model rather than maintain its own.

Against it: BANZA's artifacts are not credentials about a subject. A Key Manifest, a revocation list and
signed protocol metadata are **protocol state**, and their consumers are verification engines, not
holders presenting claims. Wrapping protocol state in a credential envelope would add a layer whose
semantics BANZA does not use, and would introduce an indirection between the bytes that are signed and
the bytes that are evaluated — precisely where BANZA has spent this milestone removing ambiguity
(`spec/canonicalization.md`, and the signing-input digest rule in `spec/trust-freshness.md` §3.1).

The strongest argument for VC is not technical, it is ecological: adoption buys interoperability with
tooling BANZA does not have to build. That argument becomes decisive when such tooling is actually in the
path of a BANZA use case. It is not today.

**Conclusion: do not adopt in 1.0.0.** BANZA keeps the *separation* VCDM articulates — authenticity is
not validity, and a verifier applies its own rules — because BANZA already holds that position
independently. It does not adopt the data model. The condition that would change this is a BANZA artifact
that genuinely is a claim about a subject, presented by a holder to a verifier that is not a BANZA engine.

---

## 4. Certificate Transparency

### What it is

*Certificate Transparency Version 2.0* — **RFC 9162**, December 2021, **Experimental**, obsoleting
RFC 6962. It defines logging of certificates "in a manner that allows anyone to audit certification
authority (CA) activity and notice the issuance of suspect certificates as well as to audit the
certificate logs themselves."

Its status is worth stating plainly: CT is enormously deployed in the Web PKI, and it is an Experimental
RFC. Both are true, and neither is a criticism.

### Its architectural boundary

CT requires four roles: **logs**, **submitters**, **monitors** and **auditors**. It provides, over Merkle
trees:

- **inclusion proofs** — this artifact is in this log
- **consistency proofs** — this log's state extends its earlier state, append-only
- an auditable public history that is independent of any single observer

And it explicitly does **not** provide, on its own:

- prevention of misissuance
- protection against a log presenting **inconsistent views to different clients**
- trust decisions about which logs to rely on

The second of those is stated by the RFC itself, in its Introduction, and it is worth quoting in full
because comparisons regularly overstate what CT delivers:

> "The log auditing mechanisms described in this document can be circumvented by a misbehaving log that
> shows different, inconsistent views of itself to different clients. Therefore, it is necessary to treat
> each log as a trusted third party. While mechanisms are being developed to address these shortcomings
> and thereby avoid the need to blindly trust logs, such mechanisms are outside the scope of this
> document."

So **CT does not, by itself, deliver cross-observer consistency either.** Detecting a split view requires
clients to compare the Signed Tree Heads they were served — a gossip mechanism that RFC 9162 explicitly
places outside its own scope. CT delivers the proofs that make such comparison *possible*, and requires
monitors and auditors to actually be running for its guarantees to be realised.

### What that means for BANZA, stated against what BANZA now actually does

BANZA 1.0.0 adopts a **monotonic trust observation mechanism** (`spec/trust-freshness.md`, ADR-030). Set
against CT, the comparison is now precise rather than approximate:

| Property | BANZA monotonic observation | CT |
|---|---|---|
| Rollback to a previously superseded version | Detected, stateful, per object and authority | Detected via consistency proofs |
| Two different artifacts at one already-observed ordering point | Detected as a local conflict, fail-closed | Detected as a log inconsistency, with proofs |
| Append-only public history | **No** | Yes, with inclusion and consistency proofs |
| Cross-observer consistency | **No** | Not from the log alone — needs a gossip mechanism the RFC does not define |
| Staleness on first observation | **Not detected** | Detectable by a monitor watching the log |
| Roles required to operate | None beyond the verifier | Log operators, monitors, auditors |

So CT has a **real additional property** that BANZA does not have and does not simulate: a public,
auditable, append-only history that a party who never observed an earlier state can still verify. A
monotonic local mark cannot produce that, and no amount of local state will.

The reason for not adopting it in the core is not that the property is unnecessary in general. It is that
CT's guarantees are delivered by **operating infrastructure** — logs that run, monitors that watch,
auditors that check — and BANZA 1.0.0 has no operator, no production traffic and no certificate for such
a log to protect. Adopting CT now would publish the shape of a mechanism whose guarantees nobody is in a
position to realise, which is worse than not adopting it: it would invite exactly the false confidence
that `spec/trust-freshness.md` §1 exists to prevent.

**Conclusion: not adopted in the 1.0.0 core; recorded with the threats it would cover.** The condition
that would change this is stated so it can be tested rather than argued: a party outside the publisher
that must detect equivocation *without* having observed both artifacts itself. That is CT's problem, and
when BANZA has it, CT — or a successor with the same properties — is the right technique.

---

## 5. The claim BANZA is entitled to make

Everything above converges on one sentence, which is recorded here so that later restatements can be
checked against it rather than drifting from it:

> A monotonic trust observation mechanism provides stateful rollback protection and detects conflicting
> content at an already observed ordering point; it does not provide global transparency or cross-observer
> consistency.

The five outcomes that sentence summarises, in full:

| Observation | Outcome |
|---|---|
| marker **<** high-water mark | rollback — refused, fail-closed |
| marker **=** mark, same content digest | idempotent replay — accepted |
| marker **=** mark, different content digest | local equivocation — refused, fail-closed |
| marker **>** mark | eligible new observation |
| first observation | recorded; **no** protection against a stale first view |
| independent observers | **no** guarantee of global consistency |

Any public restatement of this mechanism — in the Whitepaper, on the website, or in the BanzAI corpus —
is bounded by that sentence. It is deliberately phrased to be unusable as a transparency claim.

---

## 6. What this document is for

It feeds the Whitepaper's positioning and limitations, and nothing else. It is not a specification, not
an ADR, and not a source of requirements. If a future reader finds a BANZA rule that cites this file as
its authority, that rule is defective and this file is not the fix.

## Sources

All primary; retrieved for this analysis.

- [RFC 9162 — Certificate Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162.html) (IETF, Experimental, December 2021)
- [Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/) (W3C Recommendation, 19 July 2022)
- [Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/) (W3C Recommendation, 15 May 2025)
- [Mojaloop Technical Overview](https://docs.mojaloop.io/technical/) (Mojaloop Foundation)
- [Mojaloop FSPIOP API](https://docs.mojaloop.io/api/fspiop/) and [mojaloop/mojaloop-specification](https://github.com/mojaloop/mojaloop-specification) (Mojaloop Foundation) — the topology passage is quoted from `fspiop-api/documents/API-Definition_v1.1.1.md` §1 in that repository
- [mojaloop.io](https://mojaloop.io/) (Mojaloop Foundation) — consulted for deployment claims; it makes none, which is why this document makes none
- [Mojaloop ML Testing Toolkit](https://docs.mojaloop.io/technical/ml-testing-toolkit/) and [mojaloop/ml-testing-toolkit](https://github.com/mojaloop/ml-testing-toolkit) (Mojaloop Foundation)
