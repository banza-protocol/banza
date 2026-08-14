# ADR-027 — Open protocol trust model without a certificate authority

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
**ADR-001** (protocol-first), the change is defined here, in an ADR, before it is implemented anywhere.

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
| **D-038-04** | The Trust Root signs **only the Key Manifest**, which endorses the delegated signing keys; protocol metadata, releases, the revocation list and conformance evidence are signed by those delegated keys within their domains — never by the root directly (INV-ROOT-004; reconciled by ADR-027). It does not authorise operators, does not authorise payments, does not issue licences, does not confer status and does not move funds. Its scope is unchanged by this ADR and is permanent. |
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
ADR-031**; the six steps below group those checks for exposition, ordered for cheap-rejection first. The
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
| **INV-OTE-009** | The Trust Root MUST NOT sign any statement about an operator's identity, status, eligibility or right to participate. The Trust Root signs only the Key Manifest that endorses the delegated signing keys; protocol metadata, releases, the revocation list and conformance evidence are signed by delegated keys within their domains, never by the root directly (INV-ROOT-004; ADR-027). |
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
bound into an issued artifact. ADR-039 is authoritative for level names and capability mapping; the M2
state model is the primary conformance surface. A federation-eligibility threshold expressed as a granted
level, and the expiry or immutability of a level bound inside the removed certificate, are superseded:
capability scope is read from the manifest and the evidence, not from a granted level.

## Legacy compatibility

**What survives from the former central-root architecture, unchanged and re-expressed here.** The root key
architecture was never the problem — the process layered on top of it was. These properties are carried
forward verbatim in intent:

  ceremony, 2-of-3).
- The root signs **metadata only** — never routine artifacts.
- **Delegated signing keys** are short-lived, scope-limited and domain-separated; rotation is routine.
- **Private key material never exists** in repositories, published artifacts or serving infrastructure
  (ADR-029).
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
  TypeScript. UI renders; Rust decides (ADR-043).
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
- **ADR-001** — Operator separation; operator neutrality
- **ADR-001** — Protocol-first product development
- **ADR-039** — Conformance level capability alignment (authoritative for level names/capabilities)
- **ADR-029** — Private keys never reside on serving infrastructure
- **ADR-043** — Rust-first policy for official engines
- **ADR-033** — Operator self-publication and machine-verifiable conformance
- **ADR-031** — Federation trust evaluation without certificates (the normative ten-check enumeration)
- **ADR-042** — BanzAI as a native, non-authoritative protocol agent
- `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` — canonical open governance decision
- `docs/governance/OPEN_PROTOCOL_ARCHITECTURE.md` — the eight-layer open protocol architecture
- `docs/governance/OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md` — how an implementation publishes and demonstrates conformance

---

## Trust Invariant Registry Realignment (Retire the INV-TRUST Namespace)

- **Status:** Accepted
- **Date:** 2026-07
- **Completes:** **ADR-027** (which superseded `INV-TRUST-001…007` "in full" but left the removed
  identifiers in the contracts, specs, engines, grounding and public reference) and **ADR-031** (which
  defined `INV-FEDEVAL-001…010` but was never wired into the canonical invariant registry). This ADR
  reverses **no** decision of ADR-027/039/040 — it removes the residue those decisions left behind.
- **Related:** ADR-043 (Rust-first engines), ADR-033 (operator self-publication), ADR-026 (PostgreSQL
  is a protocol-state store, not a financial DB), ADR-045 (current-only canonical ADR tree)

---

## Context

ADR-027 removed CA/certificate-based operator trust from the active protocol model and stated, in its
*Invariants* section, that the former central-authority federation-trust series `INV-TRUST-001 … INV-TRUST-007`
"was expressed entirely over the removed issued certificate and **is superseded in full**", replaced by the
Open Trust Evaluation series `INV-OTE-001 … INV-OTE-010`. ADR-031 then decomposed that same evaluation, for
federation routing, into the ten mandatory checks and the invariant series `INV-FEDEVAL-001 … INV-FEDEVAL-010`.

Those two decisions are sound and stand. But they were applied to the *decisions* layer only. The
**implementation** layer — the canonical machine-readable invariant registry, the federation specifications,
the conformance fixtures and suite, the readiness/assurance/trust engines, the security corpus, the public
Reference, BanzAI's grounding index, and the protocol-state database schema — was never realigned. The

- **333 occurrences of the retired `INV-TRUST-*` identifiers across ~68 files.** The *statements* had
  already been re-narrated to the signed-protocol-metadata / conformance-evidence / revocation model, but
  they still wear the identifiers of the removed certificate series. A reader — or BanzAI's `/ask` grounding —
  reaches the removed identifiers as if they were the current canonical invariants.
- **The two canonical surviving families are entirely absent from the registry.** `contracts/invariants.json`
  declares `INV-TRUST-001…007` as live, contains **zero** `INV-OTE-*` and **zero** `INV-FEDEVAL-*`, and
  mis-attributes the removed `INV-TRUST` identifiers to ADR-031 (which defines `INV-FEDEVAL-*`, not
  `INV-TRUST-*`). The machine source of truth diverges from the ADRs it cites.
- **Residual operator-certificate artifacts survive as live content.** Seven `CERT-*.json` conformance
  fixtures model a BANZA-issued, expiring, level-bearing certificate *about an operator* — the exact artifact
  ADR-027 removed; fifteen manifest/routing fixtures carry a `certificate_url` pointing at a removed
  `/.well-known/banza/certificate.json`; a matrix row *requires* operators to publish that certificate; the
  verification-api exposes a `/certificates` route whose SQL selects issued operator certificates; and the
  protocol-state database schema defines a `certificates` table plus `certification_level` / `certificate_id`
  columns on `operators` and `brl_entry`.

persisting in the layers *below* the ADRs — the layers people and machines actually consume. Leaving it in
place means the protocol's canonical invariant registry, its conformance suite and its public Reference all
still describe, in identifiers and in artifacts, a Certificate Authority that ADR-027 removed.

## Decision

**The `INV-TRUST-*` identifier namespace is retired from the entire repository. Every surviving statement it
carried is re-homed, verbatim in intent, to the canonical series the current ADRs define — `INV-OTE-*`
(ADR-027, general Open Trust Evaluation), `INV-FEDEVAL-*` (ADR-031, federation-routing application), or the
surviving `INV-ROOT-*` family (root/key custody). Residual operator-certificate artifacts are removed as
removed-CA content. No invariant's normative meaning changes; only its identifier and, for the removed
certificate artifacts, its existence.**

| ID | Rule |
|----|------|
| **D-058-01** | **The `INV-TRUST-*` namespace is retired.** No canonical id, alias, citation, contract, spec, fixture, engine reason code, grounding chunk, public page or database comment may use an `INV-TRUST-*` identifier. The namespace is not re-mapped as an alias (an alias would keep the removed identifier alive); it is removed. |
| **D-058-02** | **The canonical registry carries the ADR-authoritative families.** `contracts/invariants.json` registers `INV-OTE-001…010` verbatim from ADR-027 and `INV-FEDEVAL-001…010` verbatim from ADR-031, and extends the surviving `INV-ROOT-*` family with the re-homed key/custody invariants. The `TRUST` family is removed. |
| **D-058-03** | **Re-homing preserves meaning.** Each retired statement is re-homed by the authoritative mapping table below. The re-homed statement's severity, behaviour and enforcement are unchanged; identifiers move, decisions do not. Where a target invariant already states the rule (ADR-027/040 are the authority), the retired statement's text is dropped in favour of the canonical text, not duplicated. |
| **D-058-04** | **Federation-routing citations map to `INV-FEDEVAL-*`.** Every `INV-TRUST-001…006` citation lives in a federation-routing context (federation specs, federation contracts, federation conformance, L3/L4 federation-eligibility readiness), so it re-homes to the federation-routing series `INV-FEDEVAL-*`, per the mapping. The general `INV-OTE-*` series is the canonical *general* trust series and is registered as such; it is not substituted into existing federation-routing citations. |
| **D-058-05** | **Key/custody invariants re-home to `INV-ROOT-*`.** The root-custody, bounded-delegation, seat-continuity and authenticated-key-rotation invariants are not part of the trust *evaluation*; they are key-lifecycle invariants and survive under the `INV-ROOT-*` family (ADR-027 *Legacy compatibility* carries the offline-threshold root, delegated keys and key manifest forward unchanged). `INV-TRUST-CA-001` and `INV-TRUST-DELEG-001` are the same statement and de-duplicate to one target. |
| **D-058-06** | **Operator-certificate artifacts are removed.** The `CERT-*.json` operator-certificate fixtures, the `certificate_url` field and its removed well-known path, the matrix requirement to publish an operator certificate, the verification-api `/certificates` issued-certificate route and its SQL, and the `certificates` table plus `certification_level` / `certificate_id` columns in the protocol-state schema are removed. The canonical published-material URL is signed protocol metadata; the canonical evidence route is `/conformance/evidence`. |
| **D-058-07** | **Surviving trust primitives are preserved exactly.** The offline threshold Trust Root, delegated signing keys, the signed Key Manifest, domain separation, key lifecycle, revocation-as-cryptographic-signal, the `root → delegated → signed-protocol-metadata` signature chain, and the `not_certificate` / `not_operator_certificate` boundary assertions in the production schemas all survive unchanged. This ADR removes the removed CA; it does not touch what ADR-027 kept. |
| **D-058-08** | **No financial invariant is touched.** `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`/`INV-STL-*`, `INV-IDEM-*`, `INV-RECON-*`/`INV-FED-RECON-*`, `INV-QR-*`, `INV-FED-*` and `INV-FED-LEDGER-*` are unchanged. They govern what a correct implementation does with money — orthogonal to who is trusted and by what identifier. |

### Authoritative mapping table

successor; the "meaning" column confirms the re-home preserves the statement.

| Retired `INV-TRUST-*` | Statement (unchanged) | Re-homed to | Authority |
|---|---|---|---|
| **INV-TRUST-001** | Signed protocol metadata is valid iff its signature verifies against the key resolved from the active Key Manifest for its `issuer_key_id` (trust root or delegated key). | **INV-FEDEVAL-004** | ADR-031 (check 5) |
| **INV-TRUST-002** | Trust material rejected past `expires_at`, no grace period; ≤ 90-day window for L3+. | **INV-FEDEVAL-006** | ADR-031 (check 9) |
| **INV-TRUST-003** | Any revoked key/artifact/implementation id → rejected from all routing, regardless of any other signal. | **INV-FEDEVAL-002** | ADR-031 (check 6 / fail-closed) |
| **INV-TRUST-004** | `supports_federation: true` requires published, valid, fresh, non-revoked L3+ conformance evidence that passes the Open Trust Evaluation. | **INV-FEDEVAL-007** | ADR-031 (check 7) |
| **INV-TRUST-005** | The Revocation List MUST be signed by the revocation-domain delegated key; unsigned/unverifiable ⇒ treated as absent (fail-closed). | **INV-FEDEVAL-005** | ADR-031 (check 6) |
| **INV-TRUST-006** | No routing decision against a Revocation List older than 6 hours (staleness within the list's freshness window). | **INV-FEDEVAL-005** | ADR-031 (check 6) |
| **INV-TRUST-007** | A key rotation MUST be authenticated by signing the rotation request with the currently-bound private key. | **INV-ROOT-010** | ADR-027 *Legacy compatibility* (key lifecycle) |
| **INV-TRUST-ROOT-001** | No single entity may solely control the protocol's maximum authority; root custody requires threshold control. | **INV-ROOT-007** | ADR-027 *Legacy compatibility* (offline threshold root) |
| **INV-TRUST-CA-001** | No delegated signing key may exercise authority beyond what the active Trust Root delegates to it. | **INV-ROOT-008** | ADR-027 *Legacy compatibility* (bounded delegation) |
| **INV-TRUST-DELEG-001** | *(identical to INV-TRUST-CA-001)* No delegated key may exercise authority beyond its explicitly delegated scope. | **INV-ROOT-008** | ADR-027 *Legacy compatibility* (bounded delegation) |
| **INV-TRUST-SEAT-001** | Loss or replacement of an institutional seat occupant cannot compromise continuity of the protocol's maximum authority. | **INV-ROOT-009** | ADR-027 *Legacy compatibility* (custody continuity) |

The `INV-TRUST-*` *family* references (`INV-TRUST-*` as a group name) become "the trust invariants
(`INV-OTE-*` / `INV-FEDEVAL-*`) and the root/key invariants (`INV-ROOT-*`)".

### Conformance vector renaming

The `FED-CERT-*` conformance vector group and the `CERT-*.json` fixtures are named for the removed operator
certificate. They re-home to `FED-SPM-*` (signed-protocol-metadata) vectors over `SPM-*.json` fixtures,
testing the same behaviours against the surviving artifact: expired signed protocol metadata, invalid SPM
signature, insufficient conformance scope, operator-id mismatch, capability gap, `issuer_key_id` absent
from the Key Manifest. The negative fixture asserting a manifest is invalid *without* a certificate URL is
deleted (it tested a removed requirement); "federation without a certificate" is recast to "federation
without published conformance evidence" (INV-FEDEVAL-007).

## Consequences

**Positive.**

- **The registry matches the ADRs.** `contracts/invariants.json` — the machine source of truth that contracts
  and the conformance suite must cite — carries exactly the families ADR-027 and ADR-031 define. The
  `trust_contract_adr_divergence` gate reaches zero.
- **No removed identifier survives.** A reader, an auditor, a verifier and BanzAI all reach `INV-OTE-*` /
  `INV-FEDEVAL-*` / `INV-ROOT-*` — never a `INV-TRUST-*` identifier and never an operator certificate. The
  `legacy_trust_invariants`, `removed_ca_content`, `ambiguous_certificate_routes` and
  `certificate_chain_runtime_paths` gates reach zero.
- **The conformance suite tests the real artifact.** `FED-SPM-*` vectors exercise signed protocol metadata —
  the artifact peers actually verify — rather than a certificate no one issues.
  makes it structural in the contracts, the engines, the schema and the public surface.

**Negative (accepted).**

- **A large, mechanical sweep.** 333 citations across ~68 files change identifier. The risk is a wrong
  mapping or a missed occurrence; it is contained by the single authoritative mapping table above, by
  adversarial per-batch verification, and by the `invariant-check` guard, which fails the build on any cited
  identifier absent from the registry.
- **Machine output changes.** Engines that emitted `INV-TRUST-*` reason codes now emit the re-homed
  identifiers; the affected golden vectors are updated in the same change. Evidence bundles produced after

**Untouched.** Every financial invariant; the offline threshold Trust Root and its custody; delegated keys;
the signed Key Manifest; revocation-as-security-signal; the surviving signature chain; operator neutrality;
Rust as the sole decision authority; and the rule that BanzAI's model never sits in a decision path.

## References

- ADR-027 *Invariants* — "`INV-TRUST-001 … INV-TRUST-007` … is superseded in full"; the `INV-OTE-*` series
- ADR-031 *Protocol Invariants* — the `INV-FEDEVAL-001 … INV-FEDEVAL-010` series
- `contracts/invariants.json` — the canonical machine-readable registry realigned by this ADR

---

## Canonical Trust Signing Model Reconciliation

- **Status:** Accepted
- **Date:** 2026-08
- **Completes:** ADR-027 (Open Protocol Trust Model Without CA), ADR-031 (Federation Trust Evaluation Without Certificates)
- **Relates:** ADR-027 (Trust Invariant Registry Realignment), ADR-004 (Certification / Admission / Authorisation Separation), ADR-045 (Current-Only Canonical ADR Tree)

## Context

BANZA's trust model has always been a chain: an offline **Trust Root** anchors a set of short-lived
**delegated signing keys**, and those delegated keys sign the day-to-day protocol artifacts. This is what
the deterministic trust engine (`engines/banza-trust`) actually implements, and what the critical
invariants `INV-ROOT-004`, `INV-ROOT-005`, `INV-OTE-001` and `INV-FEDEVAL-004` state.

A pre-existing contradiction had, however, spread across the canonical surface. One family of statements —
seeded by the second sentence of `INV-OTE-009` and copied into ADR-027 (D-038-04), ADR-031, both
`FEDERATION_TRUST_MODEL` documents, `BANZA_TRUST_ARCHITECTURE.md` §1, two production schemas,
`federation-trust.json`'s root block, and several diagram footnotes — asserted that **the Trust Root signs
protocol metadata, releases and the revocation list directly** ("Model B"). This contradicts the engine,
`INV-ROOT-004` ("the root signs only Key Manifests… never protocol metadata, conformance evidence, or
revocation lists directly"), `INV-ROOT-005` ("the BRL is signed by the designated revocation-domain
delegated key"), `revocation-list.json` ("NOT the root key"), and Reference §6.

Per the repository's authority order (`contracts/invariants.json` is the machine single-source-of-truth
and governs over prose where they disagree; accepted ADRs are the rule provenance; Rust is the sole
enforcement authority; `contracts/invariants.json:5-6`, `spec/README.md:57-61`, `ADR-027:63`), the engine
and the critical `INV-ROOT-*` invariants are the operative model. "Model B" is residue, not a decision.

This ADR fixes the canonical model as **Model A** and removes the residue from every canonical surface.
It **reverses no decision** of ADR-027 or ADR-031 — those ADRs already carry Model A in their own
evaluation flows (ADR-027 STEP 2 / STEP 6 / ":225 metadata only — never routine artifacts"; ADR-031 body).
It completes them by retiring the contradictory loose wording, in the manner ADR-027 completed ADR-027 by
removing the residue its decisions had left behind.

## Decision

| ID | Decision |
|---|---|
| **D-079-01** | The **Trust Root signs only the Key Manifest** (the root-signed metadata that lists and endorses the delegated signing keys). It signs nothing else directly. |
| **D-079-02** | The Trust Root **never signs, directly**, protocol metadata, protocol releases, the Revocation List (BRL), conformance evidence, receipts, or any statement about an operator's identity, status, eligibility or right to participate. |
| **D-079-03** | The **Key Manifest declares and authorises delegated signing keys within explicit domains**. The canonical domains are **`protocol-metadata`**, **`revocation`** and **`conformance-evidence`**. |
| **D-079-04** | **Domain separation is normative:** a delegated key may sign only artifacts belonging to its domain. A `revocation` key does not sign metadata; a `protocol-metadata` key does not sign evidence; a `conformance-evidence` key does not sign the BRL. |
| **D-079-05** | The **Revocation List (BRL) is signed by the `revocation`-domain delegated key**. The authority of that key is traced to the Trust Root **through the Key Manifest** — the root anchors revocation *indirectly*, and never signs the BRL itself. |
| **D-079-06** | Protocol metadata is signed by the `protocol-metadata`-domain delegated key; conformance evidence by the `conformance-evidence`-domain delegated key. Neither is signed by the root. |
| **D-079-07** | The delegated-key **domains are normative; key-id string formats are an operational naming convention** (e.g. `banza-{domain}-YYYYMM`). Where a schema enforces a name pattern, that is a deployment convenience, not a protocol conformance requirement (Reference §6). |
| **D-079-08** | Root custody: the **durable architectural invariant is threshold custody** (`INV-ROOT-007` — no single entity solely controls the root). The current architecture declares the concrete threshold: **three independent root signing authorities, any two of which authorise** (`docs/security/ROOT_KEY_CUSTODY_MODEL.md`). Authorization is cryptographic and logical; the number of secure modules is a custody control and never determines the threshold. |
| **D-079-09** | This reconciliation restates no new authority for the root. The Trust Root is **not a certificate authority over operators** (ADR-027); a valid trust result is **not** conformance, **not** BANZA Conformance & Interoperability Certification (Layer 2, ADR-004), **not** scheme admission (Layer 3), and **not** regulatory authorisation. These boundaries do not propagate. |

## Invariant impact

- **`INV-OTE-009`** — its second sentence (the Model-B "coverage" clause) is corrected in the registry to
  Model A. Its security intent (the root signs nothing about operators) is preserved verbatim. The ID,
  family, severity and source are unchanged. No invariant is added or removed; the `INV-OTE-*` and
  `INV-FEDEVAL-*` counts are unchanged (ADR-027 realignment intact).
- **`INV-ROOT-004` / `INV-ROOT-005` / `INV-OTE-001` / `INV-FEDEVAL-004`** — affirmed as the canonical
  statements of Model A. No change.
- **`INV-ROOT-007`** — affirmed. Custody is threshold custody; the concrete N-of-M is operational config.

## Consequences

**Reconciled to Model A on the canonical surface:** the registry (`INV-OTE-009`), ADR-027 (D-038-04,
INV-OTE-009 restatement, loose wording), ADR-031, `BANZA_TRUST_ARCHITECTURE.md` §1, both
`FEDERATION_TRUST_MODEL` documents, `contracts/federation/federation-trust.json`, the two production
trust schemas, the `key-manifest.json` example key-id, and the trust diagrams. A new guard,
`check-trust-signing-chain.sh`, protects the chain semantically and asserts registry↔ADR agreement on
`INV-OTE-009` / `INV-ROOT-004`. The `banza-trust` domain primitives gain positive/negative tests proving
the root signs the manifest, the revocation-domain key signs the BRL, and a root-signed BRL is rejected.

**No cryptographic material was created, rotated or re-emitted** (no root ceremony has been performed; all
artifacts are schemas, fixtures and demos). This ADR is normative and documentary.

**Deliberately left for a separate operational-config alignment** (tracked; not a normative contradiction):
the concrete 2-of-3 values still present in the ceremony engine constants
(`engines/banza-root-ceremony`), the production custodian-enum schema, and the trust test fixtures must be
aligned to the 2-of-3 model when the ceremony is prepared; the divergent delegated-key scope enums
across `contracts/production/*` should be reconciled to the canonical three domains; and the legacy
`certification`-domain / `banza-cert-` shapes in the L3/L4 readiness *test fixtures* are implementation-only
residue. These are configuration/implementation items, out of scope for this normative reconciliation.

## Regra global

A trust chain must read the same way in the contract, the engine, the invariant registry, the ADRs, the
architecture documents, the tests and the Reference: **Trust Root → Key Manifest → delegated key by domain
→ signed artifact → verification.** If a surface tells a different story, the model is not yet reconciled.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/federation/federation-trust.json`](../../contracts/federation/federation-trust.json)
- [`contracts/invariants.json`](../../contracts/invariants.json)
- [`spec/README.md`](../../spec/README.md)
