# ADR-038 — Open Protocol Trust Model Without CA

- **Status:** Accepted
- **Date:** 2026-07

## Context

BANZA is an open financial protocol. Its trust model does not depend on a central authority over
operators. The open governance model is recorded in `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` and
`docs/governance/OPEN_PROTOCOL_ARCHITECTURE.md`, enforced by `engines/banza-open-governance` and
`make open-governance-check`.

An earlier design placed a central authority inside the trust path of federation, as load-bearing protocol
machinery rather than mere vocabulary:

- It defined federation routing as **"Verificação Tripla = Registo Público + certificado válido +
  ausência do BRL"** — a central-authority certificate issued by BANZA about an operator sat in the middle
  of the routing rule, so a peer could not route without it.
- It made issuance of that certificate a nine-step trust protocol whose steps included fetching and
  verifying the centrally-issued artifact, gated by **a mandatory human approval step** before issuance.

That certificate, that central issuing authority and that human gate are removed by this decision. Per
**ADR-005** (protocol-first), the change is defined here, in an ADR, before it is implemented anywhere.

The canonical decision this ADR implements, in its canonical Portuguese form:

> "BANZA é um protocolo financeiro aberto. A participação de operadores não depende de uma autoridade
> humana central, certificado emitido pela BANZA ou aprovação humana. Operadores independentes implementam
> o protocolo, publicam manifests, expõem endpoints compatíveis e produzem evidência verificável de
> conformidade. O trust do protocolo é baseado em signed protocol metadata, conformance evidence, public
> protocol registry, trust root, delegated signing keys e revocation/fail-closed."

## The problem with CA/certificate-based operator trust

An artifact issued by a central body about an operator, gated by a human review before issuance, is
incompatible with an open financial protocol, for four independent reasons — any one of them sufficient.

**1 — It makes participation depend on a central authority.** A conformant implementation could pass every
public vector on its own infrastructure and still be unable to participate, because participation would
wait on one team's decision. The defect is the *existence* of the gate, not how benevolently it is
operated: the same gate is equally available to a successor, an acquirer, a court order or an attacker.

**2 — It concentrates the ecosystem on one team, so the protocol dies with its founders.** Issuance,
renewal, review and the recovery procedures behind them put one team permanently on the critical path of
every new participant — a mortal, fundable, suable, resignable single point of failure. The protocol must
survive its founding team (`docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` § 9); a trust model that fails
closed on the founders' continued existence contradicts that criterion.

**3 — It reads as regulatory permission BANZA cannot grant.** An artifact issued by a central body, named
with the vocabulary of authorisation and required before an entity may handle other people's money, will
be read as permission to provide financial services. BANZA is a protocol, not a payment service provider:
it does not authorise, certify, accept or approve operators, does not issue licences and does not move
funds. Authorisation to provide financial services is granted by the competent regulator to the operator,
and BANZA is not a party to that relationship.

**4 — Conformance is a measurement, not a decision.** Conformance is a *reproducible property of published
artifacts*: run the public vectors of a stated spec version against an implementation and the result is
deterministic — anyone can obtain it, nobody needs to be asked. Compressing that measurement into a
signature over a claim about an entity destroys information and adds nothing: the resulting artifact is
strictly *less* verifiable than the evidence it replaced, because a holder can check only that a key
signed it — never that the implementation is actually conformant.

## Decision

**BANZA removes CA/certificate-based operator trust from the active protocol model. Protocol compatibility
is demonstrated through signed protocol metadata, operator manifests, conformance evidence, public protocol
registry entries, trust root/delegated signing keys and revocation/fail-closed checks.**

Consequently:

| ID | Decision |
|----|----------|
| **D-038-01** | The removed federation rule "Verificação Tripla = Registo Público + certificado válido + ausência do BRL" is replaced by the **Open Trust Evaluation** defined below. No step of it involves an artifact issued by BANZA about an operator, and no step of it involves a human decision. |
| **D-038-02** | The former central-authority nine-step certificate-dependent trust protocol is superseded in full by the Open Trust Evaluation. |
| **D-038-03** | Trust material is **published by the operator and re-checkable by anyone**. A verifier reaches its conclusion from public artifacts, offline, without contacting BANZA and without asking permission. |
| **D-038-04** | The Trust Root signs **only the Key Manifest**, which endorses the delegated signing keys; protocol metadata, releases, the revocation list and conformance evidence are signed by those delegated keys within their domains — never by the root directly (INV-ROOT-004; reconciled by ADR-079). It does not authorise operators, does not authorise payments, does not issue licences, does not confer status and does not move funds. Its scope is unchanged by this ADR and is permanent. |
| **D-038-05** | The **Public Protocol Registry** is a verifiable, replicable **index** of published manifests and evidence. It is not an approval list, not a whitelist and not a licence list. Listing grants nothing; absence forbids nothing. |
| **D-038-06** | Revocation is a **protocol security signal** over cryptographic material and artifacts. It is never a regulatory sanction, never a licence, and never a judgment about an entity. |
| **D-038-07** | Evaluation is **local to the evaluating party**. Operator A decides, under its own policy and its own regulatory obligations, whom it interoperates with. BANZA publishes the rules and the vectors; it does not make, and cannot make, that decision for Operator A. |
| **D-038-08** | The evaluation is **fail-closed**: missing, invalid, expired, revoked or incompatible trust material means the evaluating party does not interoperate. |
| **D-038-09** | No human step may convert a negative conformance result into a positive one, and no human step is required to obtain a positive one. |

## The new model

### Open Trust Evaluation

**Open Trust Evaluation = Public Registry metadata + signed protocol metadata + conformance evidence +
manifest compatibility + trust root/delegated signature verification + revocation/fail-closed.**

Operator A evaluates Operator B as follows. Every input is public; every step is a computation; no step is
a request. The **normative, per-check enumeration for federation routing is the ten mandatory checks of
ADR-040**; the six steps below group those checks for exposition, ordered for cheap-rejection first. The
evaluation is a conjunction — all of it must hold.

```
INPUT   operator identity to evaluate; the interaction Operator A intends
OUTPUT  a local, re-derivable verdict: interoperate / do not interoperate

STEP 1 — Discover
  Resolve the identity to a manifest URL via the Public Protocol Registry index,
  a well-known URL, or DNS. The registry is an index: it locates, it does not vouch.
  → not resolvable ⇒ FAIL-CLOSED (no evidence located; not a rejection of the entity)

STEP 2 — Trust root and delegated keys
  Fetch root metadata; verify the signing threshold over the root keys.
  Fetch the signed protocol metadata; verify it against a delegated signing key that is
  itself within scope, unexpired, and endorsed by root-signed metadata.
  The protocol metadata states which spec versions, schemas and conformance vectors are
  genuine, and their digests.
  → unsigned / unverifiable / stale / out-of-scope key ⇒ FAIL-CLOSED

STEP 3 — Manifest authenticity
  Fetch Operator B's manifest; validate against the schema named by the protocol metadata.
  Verify the manifest signature against the public key material the manifest itself binds.
  This proves the manifest is genuine and unmodified — it proves nothing else, and is not
  a statement by BANZA about Operator B.
  → invalid schema / bad signature / identity mismatch ⇒ FAIL-CLOSED

STEP 4 — Conformance evidence
  Read the Evidence Bundle referenced by the manifest. Verify the hash triple:
    manifest_hash             — binds the evidence to this exact manifest
    conformance_report_hash   — binds the evidence to this exact report
    evidence_bundle_hash      — binds the bundle as a whole
  Verify the bundle is signed by Operator B with the key material bound in the manifest.
  Verify the bundle names a spec version and vector set whose digests match the signed
  protocol metadata from STEP 2 — evidence against unknown or non-genuine vectors is not
  evidence.
  Any verifier MAY re-execute the public vectors and MUST obtain the same report. This is
  the property the removed certificate never had.
  → missing / unverifiable / mismatched / stale-versioned evidence ⇒ FAIL-CLOSED

STEP 5 — Manifest compatibility
  Check that what Operator B declares is compatible with what Operator A intends:
  protocol version compatibility, the required capabilities, the required endpoints, and
  evidence covering that capability scope.
  → incompatible ⇒ FAIL-CLOSED (an ordinary, non-adversarial outcome)

STEP 6 — Revocation
  Load a signed, unexpired Revocation List. Verify its signature against a delegated
  revocation key endorsed by root-signed metadata.
  Check that none of the material relied upon in STEPS 2–4 is revoked: operator key
  material, delegated keys, releases, artifacts.
  → list unavailable / expired / unverifiable, or relied-upon material revoked ⇒ FAIL-CLOSED

VERDICT  All checks hold ⇒ Operator A MAY interoperate with Operator B, under its own policy.
         The verdict is Operator A's, is re-derivable by any third party from the same
         public artifacts, and is re-evaluated as the material changes.
```

### Invariants

The former central-authority federation-trust invariant series (`INV-TRUST-001` … `INV-TRUST-007`) was
expressed entirely over the removed issued certificate and is superseded in full. The offline-root
invariant series `INV-ROOT-001` … `INV-ROOT-006` survives, re-scoped from the removed certificate to
protocol metadata and delegated keys (see *Legacy compatibility*). This ADR adds the Open Trust Evaluation
series:

| ID | Invariant |
|----|-----------|
| **INV-OTE-001** | Protocol metadata MUST verify against a delegated signing key endorsed by valid root-signed root metadata, within that key's scope and validity. Unverifiable protocol metadata MUST be treated as absent. |
| **INV-OTE-002** | An Evidence Bundle MUST verify against the public key material bound in the manifest it names, and its `manifest_hash` MUST bind to that same manifest. Evidence that does not bind to a manifest is not evidence. |
| **INV-OTE-003** | Conformance evidence MUST name a spec version and vector set whose digests match root-signed protocol metadata. Evidence produced against unknown, unpinned or non-genuine vectors MUST NOT be accepted. |
| **INV-OTE-004** | Re-executing the named public vectors against the same artifacts MUST reproduce `conformance_report_hash`. A bundle that does not reproduce is invalid. |
| **INV-OTE-005** | Missing, invalid, expired, revoked or incompatible trust material MUST result in non-interoperation. No grace period, no default-allow, no override. |
| **INV-OTE-006** | A Revocation List MUST be signed and unexpired to be relied upon. An unsigned, unverifiable or expired list MUST be treated as unavailable, which is itself fail-closed (INV-OTE-005). |
| **INV-OTE-007** | No artifact issued by BANZA about an operator may be an input to the Open Trust Evaluation. A verifier that requires one is not implementing this protocol. |
| **INV-OTE-008** | No human decision may be an input to the Open Trust Evaluation, and no human decision may convert a negative conformance result into a positive one. |
| **INV-OTE-009** | The Trust Root MUST NOT sign any statement about an operator's identity, status, eligibility or right to participate. The Trust Root signs only the Key Manifest that endorses the delegated signing keys; protocol metadata, releases, the revocation list and conformance evidence are signed by delegated keys within their domains, never by the root directly (INV-ROOT-004; ADR-079). |
| **INV-OTE-010** | Fail-closed is a decision by the evaluating party about an interaction. It MUST NOT be recorded, published or communicated as a rejection, sanction or judgment about the entity. |

No financial invariant (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`,
`INV-QR-*`) is weakened, altered or removed by this ADR. They are orthogonal to it: they govern what a
correct implementation does with money, not who is allowed to be one.

## Consequences

**Positive.**

- **The protocol survives its founders.** No party is on the critical path of participation. If the current
  maintainers stop, specs, engines, vectors and metadata remain public and replicable, and independent
  implementations continue to interoperate by re-checking each other's evidence.
- **Trust becomes re-derivable.** Under the removed model a peer could verify only that a key had signed a
  claim. Under this model a peer can verify the claim itself, by re-running the measurement.
- **The regulatory boundary becomes structural, not editorial.** There is no artifact left to mistake for
  permission. The protocol cannot be read as authorising financial services because it no longer issues
  anything about anyone.
- **A high-value key disappears.** The removed issuance key could mint trust directly (see *Security*).
  Deleting the mechanism deletes the target.
- **Participation is O(1) in maintainer effort.** The hundredth implementation costs the maintainers
  exactly what the second one does: nothing. There is no queue, because there is no server.

**Negative (accepted).**

- **Nobody vouches for anyone.** Operator A must run the evaluation and own the outcome, rather than
  deferring to an artifact. This is a real transfer of work and responsibility to the evaluating party. It
  is also honest: the removed artifact never actually carried that responsibility, it only appeared to.
- **Evidence is larger than a signature.** A bundle plus hashes plus vector digests is more to fetch,
  cache and verify than a small signed blob. Caching and the hash triple bound the cost; re-execution is
  optional per-verifier, not per-transaction.
- **Freshness is now per-verifier policy.** The removed 90-day expiry imposed a single ecosystem-wide
  refresh rhythm. Each verifier now sets its own staleness policy over evidence and revocation. This is
  more correct — staleness tolerance is a risk decision belonging to the party at risk — but it is no
  longer uniform, and interoperating parties may disagree.
- **Weak evidence is possible.** Anyone may publish a bundle covering a trivial capability scope and claim
  little. That is not a defect: the evaluation checks scope compatibility (STEP 5), so thin evidence simply
  fails to support a rich interaction. Nothing is granted by publishing.

## Conformance levels

The L0–L4 level numbering survives **as a descriptive grouping of conformance scope** — a way to name
which vectors an implementation ran. It does not survive as a status, an eligibility gate, or a value
bound into an issued artifact. ADR-021 is authoritative for level names and capability mapping; the M2
state model is the primary conformance surface. A federation-eligibility threshold expressed as a granted
level, and the expiry or immutability of a level bound inside the removed certificate, are superseded:
capability scope is read from the manifest and the evidence, not from a granted level.

## Legacy compatibility

**What survives from the former central-root architecture, unchanged and re-expressed here.** The root key
architecture was never the problem — the process layered on top of it was. These properties are carried
forward verbatim in intent:

- The root is **offline**, under **threshold custody**, with a documented recovery procedure (M2.1 root
  ceremony, 2-of-3).
- The root signs **metadata only** — never routine artifacts.
- **Delegated signing keys** are short-lived, scope-limited and domain-separated; rotation is routine.
- **Private key material never exists** in repositories, published artifacts or serving infrastructure
  (ADR-028).
- The **signed key manifest** remains the trust-anchor distribution mechanism, and is the `signed protocol
  metadata` of STEP 2.
- `INV-ROOT-001` survives with force: material whose key id carries the `test-` prefix MUST NOT be accepted
  as production-valid.

**What is removed from it.** The `certification` issuing domain and its key; the issuance, renewal and
expiry lifecycle of the removed artifact; and the human-gated review layer. The `revocation` and
`conformance-evidence` domains survive.

**Routes.** Any legacy route that named the removed artifact remains a compatibility shim only: it may
explain the removal, and must not behave as though the removed mechanism were active or produce an artifact
of the removed kind.

## Security

Removing the central certificate **strengthens** the security posture, because it deletes the two assets
whose compromise was catastrophic and replaces an unverifiable claim with a re-executable measurement.

- **No issuance key to mint trust.** Under the removed model, whoever held the central issuance key could
  bind any identity to an attacker-controlled key and be trusted by every peer, because the signature
  *was* the check — a forged artifact and a genuine one were cryptographically identical. That key no
  longer exists.
- **No gate to capture.** There is nothing to subpoena, buy, pressure, outlast or shut down to control who
  participates, and nothing whose failure denies participation to everyone. This attack has no target.
- **Forgery now requires actually being conformant.** To be trusted, an attacker must forge a manifest
  signature, produce an Evidence Bundle whose hash triple binds correctly, *and* have that bundle
  re-execute to the same report against the public vectors on the verifier's own machine. The last is not
  a forgery problem — it requires implementing the protocol correctly. Compromising a delegated signing
  key can at most lie about which vectors are genuine; it cannot make a non-conformant implementation
  reproduce a conformant run, and such keys are short-lived, scope-limited and endorsed only by the
  offline threshold root, which itself signs nothing about an operator (INV-OTE-009).
- **Stale or revoked material fails closed.** Revocation entries are signed and dated; an unavailable,
  expired or unverifiable list is treated as unavailable, which is itself refusal (INV-OTE-006,
  INV-OTE-005).

The trust chain does not shrink — it moves: from *"a central authority signs an operator's right to
exist"* to *"the Trust Root signs protocol metadata, and the operator publishes verifiable evidence that
anyone can re-check."* Both anchor in the same offline threshold root; the difference is that the leaf now
carries the **inputs** the peer re-checks, not a **conclusion** the peer must accept on authority. Nothing
that was protecting money has been deleted — what has been deleted is a key whose compromise minted trust
outright and a process whose capture controlled the network.

**Why fail-closed is the safe default.** The two failure modes are not symmetric. Wrongly refusing costs a
transaction that does not happen — recoverable, retryable, visible, and cheap. Wrongly accepting costs
funds delivered to an adversary with **no recovery path** — irreversible and total. When trust material is
missing, invalid, expired, revoked or incompatible, the verifier's honest state is *"I do not know"*, and
in financial infrastructure "I do not know" must resolve to "not this time". A system that continues under
uncertainty converts technical faults into financial losses. So: no grace period, no default-allow, no
override.

**Fail-closed is not a judgment.** This distinction is load-bearing and must survive every downstream
migration. Absent, invalid, expired or unverifiable evidence means **absence of evidence** — it is a
statement about artifacts, made locally, about one interaction. It is never a decision *about the entity*,
never a rejection, never a sanction, and must never be surfaced as one (INV-OTE-010). Likewise, revocation
says only *this cryptographic material is no longer trustworthy*; it says nothing about the legitimacy,
lawfulness or quality of whoever published it. An entity whose key is revoked publishes new material and
carries on — revocation is never expulsion, because there is no admission.

## Impact on operators

- **No permission is required, and none is available.** There is no application, no queue, no reviewer and
  no artifact to obtain. Read the versioned specification, implement it, publish a signed manifest, run the
  public vectors, publish the signed Evidence Bundle. That is the complete process.
- **No renewal treadmill.** Nothing expires that must be re-obtained from anyone. Evidence is re-produced
  when the implementation or the spec version changes, on the operator's own schedule, with its own tools.
- **Operators publish their own evidence and sign it with their own keys.** Nobody publishes evidence on
  another's behalf, and the Trust Root does not sign operator evidence.
- **Each operator evaluates its own counterparties.** Operator A applies its own policy — and its own
  regulatory obligations — when deciding whether to interoperate with Operator B. BANZA supplies the rules
  and the vectors; the decision is, and remains, Operator A's.
- **Regulatory responsibility is unchanged and undiminished.** Legal standing, authorisation from the
  competent regulator where applicable, capital, risk controls, data protection and continuity belong to
  the operator. Nothing in this ADR grants, implies or substitutes for any of it. Removing the removed
  artifact does not lower a regulatory bar — it removes something that was never a regulatory bar and
  should never have looked like one.

## Impact on the registry

The **Public Protocol Registry** is a verifiable **index**: it locates published manifests and evidence.
This ADR removes any residual reading of it as a list of admitted entities.

- Listing **grants nothing**. Absence **forbids nothing** and blocks nothing.
- The registry **does not vouch**. It is STEP 1 (discovery) of the evaluation — the cheapest step and the
  least authoritative. Every claim reachable through it is verified in STEPS 2–6 against artifacts, not
  against the registry's say-so.
- Every entry is **independently verifiable** and the whole index is **replicable**. A mirror is as
  authoritative as the origin, because neither is authoritative — the artifacts are.
- The registry MUST NOT expose an entity-level status field of the removed kind, a level as a granted
  status, or an admission/approval state. It indexes artifacts and their digests.
- A registry that went offline permanently would not stop federation: discovery has other paths
  (well-known URLs, DNS), and every other step is over artifacts the verifier already fetches directly.

## Impact on BRL/revocation

The revocation layer survives, with its scope sharpened. What changes is **what it covers** and **what it
means**:

- **Scope.** Revocation covers **cryptographic material and artifacts**: compromised or superseded
  delegated keys, operator key material that is no longer trustworthy, corrupted or defective releases,
  compromised protocol artifacts. It no longer carries entity-level states of the removed kind
  ("suspended", "revoked" *as a status over an operator*) — those were governance verdicts over entities,
  and there is no longer anyone with standing to issue one.
- **Meaning.** Revocation is a **protocol security signal**: *this cryptographic material is no longer
  reliable*. It is **never** a regulatory sanction, **never** a licence or its withdrawal, and **never** a
  decision about an entity's conduct, legitimacy or right to operate. It confers and withdraws nothing,
  because nothing was conferred.
- **Mechanics, unchanged in force.** Entries are signed and dated; unsigned entries are ignored. Lists are
  versioned and publicly distributed. Verification is performed **locally by the verifier**, not by calling
  a central service — the same offline discipline the removed model claimed and this one keeps.
- **Fail-closed.** An unavailable, expired or unverifiable list means material is not accepted
  (INV-OTE-006). A stale list is not "probably fine".
- **Recovery is no longer human-gated.** Under the removed model, recovering from an issuance-key
  compromise required re-running a human approval process for every affected identity — days. Now the
  affected operator publishes new key material and fresh evidence, and peers re-evaluate. No queue, no
  reviewer, no permission.

## Impact on the Evidence Bundle

The Evidence Bundle is promoted: under the removed model it was an input to someone else's decision; it is
now the **trust artifact itself**.

- It is **self-contained**: manifest + traces + reports + hashes + signatures, verifiable offline by anyone
  without contacting BANZA.
- It carries the **hash triple** — `manifest_hash`, `conformance_report_hash`, `evidence_bundle_hash` —
  binding the evidence to one exact manifest and one exact report, under root-signed protocol metadata.
- It is **signed by the operator**, with the key material bound in its manifest. The Trust Root does not
  sign it.
- It is **version-anchored**: it names the spec version and vector set it was produced against, whose
  digests must match root-signed protocol metadata (INV-OTE-003). Evidence is always relative to a stated
  version — never a timeless status.
- It is **re-executable**: any verifier may re-run the named public vectors and MUST obtain the same report
  (INV-OTE-004). This is the property that makes the removed artifact unnecessary, and it is why the
  bundle is a stronger artifact than the thing it replaces.
- A bundle **grants nothing**. It reports a measurement. Its consumers decide what to do with it.

## Impact on the Workbench

The Workbench runs real Rust/WASM engines in the browser and shows verifiable output. Under this ADR it
must show the **Open Trust Evaluation** as the trust surface:

- Present the six steps — registry/discovery, protocol metadata, manifest authenticity, conformance
  evidence, manifest compatibility, revocation — with each verdict derived by the engines, never by
  TypeScript. UI renders; Rust decides (ADR-037).
- Present **fail-closed outcomes as fail-closed**: "trust material missing/invalid/expired/revoked/
  incompatible ⇒ not interoperable", never as a verdict about an entity.
- Never present a removed artifact, a removed human step, or a granted status as an active mechanism, and
  never offer an action that appears to obtain one. Where the removed model is shown at all, it is shown as
  removed.
- Continue to reflect reality without embellishment: no operator is activated, no artifact of the removed
  kind is produced, and no funds move. `/operators` remains `[]` and `production_certificates` remains
  `false`.
- The trust-model surfaces are covered by the governance guard and by engine tests; the authority is the
  engine suite, not the copy.

## Impact on the Assistente

The Assistente explains the protocol. It has never had authority and gains none here. Under this ADR:

- It **explains** the Open Trust Evaluation, the Evidence Bundle, the hash triple, the Trust Root's bounded
  scope, revocation-as-security-signal, and fail-closed.
- It **explains the removal** when asked about the old model: names it as removed, says what replaced it,
  and does not describe it as active. The existing deprecation intents remain the correct answer surface.
- It **refuses** to act as an authority — it does not certify, approve, accept, activate or authorise
  anything, does not create operators, does not issue artifacts of the removed kind, does not grant status
  and does not move funds. This boundary is permanent and is not softened by this ADR; it is made
  structural by it, since the authority the Assistente was already forbidden to exercise no longer exists
  for anyone.
- Its refusals must not name a removed authority as though it were the party with the power instead
  ("BANZA would have to approve that") — the correct answer is that no such approval exists anywhere,
  because participation is demonstrated, not granted.
- Its answers remain pinned by Rust tests. An executed test over real output is the authority; the copy is
  not.

---

## Related

- **ADR-001** — Open Financial Protocol: implementation independence
- **ADR-003** — Operator separation; operator neutrality
- **ADR-005** — Protocol-first product development
- **ADR-021** — Conformance level capability alignment (authoritative for level names/capabilities)
- **ADR-028** — Private keys never reside on serving infrastructure
- **ADR-037** — Rust-first policy for official engines
- **ADR-039** — Operator self-publication and machine-verifiable conformance
- **ADR-040** — Federation trust evaluation without certificates (the normative ten-check enumeration)
- **ADR-041** — BanzAI as a native, non-authoritative protocol agent
- `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` — canonical open governance decision
- `docs/governance/OPEN_PROTOCOL_ARCHITECTURE.md` — the eight-layer open protocol architecture
- `docs/governance/OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md` — how an implementation publishes and demonstrates conformance
