# ADR-031 — Federation trust evaluation without certificates

- **Status:** Accepted
- **Date:** 2026-07
- **Companion:** ADR-027 — Open Protocol Trust Model Without CA (defines the Open Trust Evaluation this ADR applies to federation routing)
- **See also:** ADR-001, ADR-001, ADR-001, ADR-039, ADR-043, ADR-027, ADR-033, `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md`, `docs/governance/OPEN_PROTOCOL_ARCHITECTURE.md`, `docs/governance/OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md`

## Context

BANZA is an open financial protocol. Its trust model removes any central authority over operators: the
general Open Protocol Trust Model (ADR-027) replaced CA/certificate-based operator trust with signed
protocol metadata, operator manifests, conformance evidence, a public protocol registry, trust
root / delegated signing keys and revocation / fail-closed. This ADR applies that model to one specific
decision — **federation routing between two operators** — and specifies, check by check, how the routing
party makes it.

The canonical decision this ADR implements:

> "BANZA é um protocolo financeiro aberto. A participação de operadores não depende de uma autoridade humana central, certificado emitido pela BANZA ou aprovação humana. Operadores independentes implementam o protocolo, publicam manifests, expõem endpoints compatíveis e produzem evidência verificável de conformidade. O trust do protocolo é baseado em signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys e revocation/fail-closed."

### The mechanism being removed

The former federation routing rule was a *triple check* — three simultaneous conditions: the Public
Registry, plus a "valid certificate", plus absence from the revocation list. The certificate at its
centre was issued by a central authority to an operator, after a mandatory human review of that
operator's conformance results; a peer routing a transaction fetched that artifact and verified the
central authority's signature over it.

That design has a defect that no amount of cryptography repairs: **the central authority sat inside the
trust path of a transaction between two other parties.** Operator A could not route to Operator B unless
the authority had first issued something to Operator B. Whoever can decline to issue, or delay issuance,
or revoke issuance, governs participation — regardless of what the governance documents say. An open
financial protocol cannot have that step, because the step *is* the authority.

The three conditions were, however, protecting three real security properties: that the counterparty is
discoverable and identified, that its conformance was actually verified rather than asserted, and that
the verification is recent and has not been withdrawn. Those properties survive. Only the issuer does
not.

## Decision

**Federation routing is decided by a Federation Trust Evaluation: the federation-routing application of
the Open Trust Evaluation (ADR-027), performed by the routing party itself over public material, with no
artifact issued by BANZA to an operator and no human step anywhere in the path.**

ADR-027 defines the Open Trust Evaluation as six ordered steps for the general trust model. For
federation routing this ADR decomposes that same evaluation into **ten concrete, independently-testable
checks** — the six steps of ADR-027 made explicit, with the protocol-version, capability, endpoint and
evidence-freshness conditions that federation routing must test called out as checks in their own right.
It is the same conjunction: the same public inputs, the same fail-closed rule, and the same result. This
ADR does not redefine the Open Trust Evaluation; it specifies how it is applied when the interaction is
routing between two operators.

The former federation rule — a "triple check" pairing the Public Registry with a certificate issued by a
central authority and absence from the revocation list — is replaced, condition for condition and
stronger, by:

> **Federation Trust Evaluation** = Public Registry metadata + signed protocol metadata + conformance
> evidence + manifest compatibility + trust root / delegated signature verification + revocation /
> fail-closed.

The evaluation is **ten checks**. All ten are mandatory. All ten are executed locally by the verifying
party, offline, against published material. Any check that does not pass ends the evaluation and no
routing occurs.

| # | Check | Answers |
|---|---|---|
| 1 | Valid operator manifest | Is there a well-formed, self-consistent, self-published declaration? |
| 2 | Compatible protocol version | Do both sides mean the same thing by the same fields? |
| 3 | Signed protocol metadata | Are the rules I am measuring against genuine? |
| 4 | Conformance evidence present and valid | Was conformance demonstrated, reproducibly? |
| 5 | Trust root / delegated signature valid | Is the protocol material genuine and intact? |
| 6 | Not revoked in the revocation list | Is any relied-upon key or artifact known-compromised? |
| 7 | Capabilities compatible | Is the specific capability I need evidenced? |
| 8 | Endpoint contract compatible | Can the interaction actually be executed? |
| 9 | Evidence freshness within policy | Is the evidence recent enough to still mean something? |
| 10 | Fail-closed | What happens when any of the above is missing or unverifiable? |

### 1 — Valid operator manifest

Fetch the manifest from the `operator_manifest_url` the operator controls, validate it against the
schema for the declared version, confirm `operator_id` matches the identifier being resolved, and
recompute `manifest_hash` over the retrieved bytes.

- **Proves:** a well-formed, self-consistent, self-published declaration exists, and binds `operator_id`
  to public keys, endpoints, capabilities and `protocol_version` — and that the bytes evaluated are the
  bytes hashed.
- **Does NOT prove:** that the declaration is *true*. A manifest is a claim, not evidence, and nobody
  endorsed it. Checks 3–5 bind it to keys; check 4 tests the claim against reality.
- **Fail-closed:** absent, unreachable, schema-invalid, `operator_id` mismatch or hash mismatch ⇒ there
  is no trust material, therefore no routing. Absence of a manifest is absence of evidence — never a
  judgment about the entity.

### 2 — Compatible protocol version

Compare the manifest's `protocol_version` against the versions the verifier supports, under the
published compatibility rules (`docs/governance/OPEN_PROTOCOL_ARCHITECTURE.md` §1: additive changes are
minor; removed or re-semanticised fields, altered invariants and hardened validation are major).

- **Proves:** both parties share one versioned semantic — the same field meanings, the same invariants,
  the same terminal states.
- **Does NOT prove:** implementation correctness, capability, or that any evidence exists for that
  version. Speaking the same language is not the same as saying anything true in it.
- **Fail-closed:** missing, unparseable, or a major version outside the verifier's supported set ⇒
  reject. No lenient parsing, no silent downgrade, no "best effort" interoperation. Coexistence windows
  between major versions are public and explicit; outside the window, incompatible means no routing.

### 3 — Signed protocol metadata

Resolve the signed protocol metadata for the negotiated version — specification version, vector digests,
validator versions, compatibility rules — and verify its signature (check 5) before using it.

- **Proves:** the yardstick is genuine. The verifier and the operator are measured against the same
  published protocol material, not against material an attacker substituted or a local copy that drifted.
- **Does NOT prove:** anything whatsoever about the operator. This check authenticates the ruler, not
  the thing being measured. It is listed among the ten precisely because an evaluation against forged
  rules is worthless no matter how well the other nine checks pass.
- **Fail-closed:** metadata missing, unsigned, signature invalid, expired, or signed by an unknown key ⇒
  the verifier has no trustworthy yardstick ⇒ reject. A verifier MUST NOT fall back to unsigned or
  locally-mutable rules.

### 4 — Conformance evidence present and valid

Fetch the operator's published Evidence Bundle, recompute `conformance_report_hash`, `evidence_bundle_hash`
and `manifest_hash`, confirm `verified_by_tool_version` and `trust_root_version`, and confirm the run's
status, version and scope.

- **Proves:** a deterministic execution of the public Conformance Automation, at a stated
  `protocol_version`, against the declared implementation, produced the stated result — and any third
  party can re-run it over the same published artifacts and reach the same state independently.
- **Does NOT prove:** that anyone reviewed, endorsed or vouched for the operator — no one did, and no
  one can. It does not prove the operator is lawful, authorised, solvent or well-run. It does not prove
  correctness beyond the tested vectors. And it is not permanent: it describes one run, of one version,
  and may be re-evaluated by anyone at any time.
- **Fail-closed:** absent, hash mismatch, non-reproducible, failing status, or covering a different
  `protocol_version` or a narrower capability set than the interaction requires ⇒ reject.

Operators sign their own evidence with their own keys. The trust root does not sign operator evidence
(INV-FEDEVAL-009) — if it did, it would be attesting to operators, which is the authority this ADR
removes.

### 5 — Trust root / delegated signature valid

Verify that signatures over protocol metadata, releases and revocation entries chain to the trust root
through delegated signing keys that are in scope for what they signed, unexpired, present in signed root
metadata, and not themselves revoked; and that the root threshold is met.

- **Proves:** the protocol material presented is genuine and intact, and the delegated key was authorised
  *for that kind of artifact*.
- **Does NOT prove:** that BANZA authorised, accepted or vouched for the operator. A trust root signature
  answers exactly one question — *is this protocol artifact genuine and intact?* — and never *may this
  entity participate?*. The trust root signs only the Key Manifest that endorses the delegated signing
  keys; protocol metadata, releases and revocations are signed by those delegated keys within their domains, never by the root directly (INV-ROOT-004; ADR-027). It does not authorise operators, does not authorise payments, does not create operators,
  does not issue licences and does not move funds.
- **Fail-closed:** unknown, expired, out-of-scope or revoked delegated key; threshold not met; stale root
  metadata ⇒ reject.

### 6 — Not revoked in the revocation list

Fetch the signed, versioned, dated revocation list and check every key and artifact the evaluation relies
on against it. The check runs locally; it is not a call to a central service that can answer *yes*.

- **Proves:** at evaluation time, none of the cryptographic material relied upon — operator keys,
  delegated keys, releases, artifacts — is known-compromised or withdrawn.
- **Does NOT prove:** anything regulatory. Revocation is a protocol **security signal**: it says
  *this cryptographic material is no longer trustworthy*. It is never a sanction, never a licence, never
  a finding about conduct or legitimacy, and never a substitute for a competent regulator. A revoked key
  expels nobody — there was no admission to reverse. The entity publishes new material and continues.
- **Fail-closed:** list unavailable, unsigned, signature invalid, expired, or staler than the policy
  window ⇒ treat the material as untrusted. A revocation list that cannot be checked MUST NOT be read as
  an empty one: absence of an answer is never evidence of non-revocation.

### 7 — Capabilities compatible

Confirm that each capability the intended interaction requires is declared in the manifest **and** covered
by valid conformance evidence at the compatible protocol version.

- **Proves:** the counterparty has demonstrated, by reproducible evidence, the specific protocol
  capability this interaction needs.
- **Does NOT prove:** a rank, tier or status held by the entity. Capability is per-capability and
  per-version, not a grade conferred on an operator. A capability declared in a manifest but not covered
  by evidence proves nothing at all — declaration is not demonstration.
- **Fail-closed:** not declared, or declared without covering evidence ⇒ reject **that interaction**.
  Evaluation is per-capability: a capability that fails does not taint the capabilities that pass.

### 8 — Endpoint contract compatible

Confirm the endpoints backing those capabilities are exposed and match the public contract — OpenAPI and
schemas — at the negotiated version.

- **Proves:** the counterparty's surface is observably compatible right now, so the interaction can
  actually be executed rather than merely being claimed as possible.
- **Does NOT prove:** that the financial behaviour behind the endpoint is correct (check 4 covers
  behaviour under the vectors), nor availability, nor any service level.
- **Fail-closed:** endpoint missing, incompatible, or diverging from the contract ⇒ reject. No probing
  for undeclared endpoints, no guessing at shapes, no compensating for a mismatch.

### 9 — Evidence freshness within policy

Every piece of trust material carries an explicit validity window: the conformance evidence, the signed
protocol metadata and the revocation list each declare one. The verifier enforces all of them locally.
The effective trust lifetime is the **minimum** of the windows in play.

- **Proves:** the evidence describes a *recent* execution against *current* protocol material — staleness
  is bounded.
- **Does NOT prove:** quality. Fresh evidence of a failing run is still a failing run. And stale evidence
  is not a revocation and not a defect — it is simply material that has left its window.
- **Fail-closed:** outside the window ⇒ reject, with no grace period. Recovery needs no one's permission:
  the operator re-runs the public automation and re-publishes.

**Why this exists (and what it replaces).** The removed rule bounded staleness by expiring the issued
artifact — "certificates expire in ≤ 90 days" for federation. That expiry was never about the artifact.
It was protecting three properties: that a claim cannot outlive the verification behind it; that a
compromised key stops being useful within a bounded time; and that rotation stays routine rather than
exceptional. None of those three requires an issuer. They require a **validity window on evidence**,
enforced by the verifier.

The difference is where the recovery path leads. Expiry of an artifact issued *to* an operator could only
be cured by the issuer re-issuing — which made continued participation depend on that issuer's
availability, and willingness. A window on *self-published evidence* is discharged by the operator alone,
re-running public automation and re-publishing. The security property is preserved exactly; the
dependency on an authority is gone. Verifiers MAY adopt stricter windows as local policy, and MUST NOT
adopt more lenient ones than the protocol maximum.

### 10 — Fail-closed on missing, invalid, expired, revoked or incompatible trust material

The meta-rule governing the other nine.

- **Proves:** nothing by itself. It is not an observation but the rule that converts a failed or absent
  observation into a refusal. Its guarantee is negative: no interaction proceeds on material the
  verifying party could not verify.
- **Does NOT prove:** that a refusal is a verdict. Failing closed is a verifier declining to act on
  material it cannot verify. It says nothing about the counterparty's legitimacy, conduct or regulatory
  standing, and it is not a rejection *of an entity* — there is no entity-level state to reject.
- **Behaviour:** absent ⇒ reject. Malformed ⇒ reject. Signature invalid ⇒ reject. Expired or outside the
  freshness window ⇒ reject. Revoked ⇒ reject. Incompatible version, capability or contract ⇒ reject.
  Unreachable or indeterminate ⇒ reject. There is no default-allow, no degraded mode, no "assume valid
  and reconcile later". A verifier that cannot complete the evaluation does not route.

## Boundary

This section is normative and permanent.

**No step in this evaluation is a human decision.** All ten checks are executed by the verifying party's
own software over published material. "Human approval" and "manual approval" are not part of this
architecture and are not reintroduced here in any form, under any name.

**No step is a licence, and no step is operator certification.** The evaluation produces one output: a
local, per-interaction determination that specific published material verifies against specific published
rules. It confers no status, grants no permission, and creates no entitlement. BANZA does not authorise,
certify, accept or approve operators; it does not issue licences. Regulatory authorisation belongs to the
competent regulator and to the operator, and BANZA is not a party to that relationship.

**No step lets BANZA provide financial services.** BANZA is an open financial protocol, not a payment
service provider. It does not move funds, does not intermediate funds, does not authorise payments and is
not in the transaction path. Nothing in this evaluation places it there.

**BANZA is not in the trust path at all.** Operator A evaluates Operator B using public material and its
own software. There is no round trip to BANZA, and BANZA does not learn that the evaluation happened.
BANZA publishes rules and signs protocol metadata; it can neither enable nor prevent any routing decision
between two operators. This is the substantive difference from the removed model, in which issuance was a
precondition for routing.

**Routing depends on verifiable evidence and compatibility — never on an artifact issued by BANZA to an
operator, and never on BANZA's acceptance.** There is no acceptance to obtain.

**The Public Protocol Registry is an index, never an approval.** It is a verifiable, replicable directory
of manifests, evidence and metadata. Listing is not approval; absence is not impediment. Registry entries
are *verified* by checks 1–9, never trusted because they are listed — a full mirror of the registry works
identically, which is the test of whether it is an index or a gate.

**A passing evaluation obliges no one to route.** The ten checks are the protocol floor: necessary, never
sufficient. Operator A remains free to apply its own commercial, regulatory and risk policy on top, and to
decline for its own reasons. The protocol defines when routing MUST NOT happen — never when it must.

## Protocol Invariants (Federation Trust Evaluation)

| ID | Invariant |
|----|-----------|
| **INV-FEDEVAL-001** | A routing decision MUST NOT be made unless checks 1–9 all pass, evaluated by the deciding party itself over material it verified itself. |
| **INV-FEDEVAL-002** | Missing, invalid, expired, revoked, incompatible or indeterminate trust material MUST fail closed. Absence of an answer MUST NOT be treated as a passing answer. |
| **INV-FEDEVAL-003** | Conformance evidence MUST be reproducible: hashes recomputed from the published artifacts, and the automation re-executed by an independent third party, MUST yield the same state. Evidence that cannot be reproduced is not evidence. |
| **INV-FEDEVAL-004** | Signed protocol metadata MUST verify to the trust root through in-scope, unexpired, unrevoked delegated keys. Unsigned or unverifiable protocol material MUST NOT be used as the basis of an evaluation. |
| **INV-FEDEVAL-005** | The revocation list MUST be signed and within its freshness window. An unavailable, unsigned, unverifiable or stale list MUST be treated as untrusted material — never as an empty list. |
| **INV-FEDEVAL-006** | Trust material outside its declared freshness window MUST be rejected. No grace period is permitted. The effective trust lifetime is the minimum of the windows in play. |
| **INV-FEDEVAL-007** | Capability compatibility MUST be evaluated per capability and per protocol version. A capability declared without covering evidence MUST NOT be routed to. |
| **INV-FEDEVAL-008** | No evaluation step may be satisfied by a human decision, by an artifact issued to an operator by BANZA, or by the presence of an entry in the Public Protocol Registry. Registry listing is not a check. |
| **INV-FEDEVAL-009** | The trust root MUST NOT sign operator conformance evidence. Operators sign their own evidence with their own keys. |
| **INV-FEDEVAL-010** | Revocation MUST be applied as a cryptographic security signal only. It MUST NOT be represented or used as a regulatory sanction, a licence withdrawal, or a judgment about an entity. |

## Consequences

**Participation stops depending on an issuer.** Operator A and Operator B interoperate by publishing
manifests, running public automation, publishing evidence and exposing compatible endpoints. Neither
asks anyone for anything. There is no queue, no submission, no review and no one to contact — which is
the property that makes the protocol open rather than merely public.

**The security properties are preserved, not traded away.** Identity binding, verified conformance,
bounded staleness, compromise response and fail-closed all survive the removal, in stronger form: every
one is now independently reproducible by any party rather than asserted by a single signature. The
protocol moves trust from a decision to a computation.

**Availability improves.** The removed model required an issuance event before two other parties could
transact. This one does not, so no BANZA outage, backlog or decision can stall federation. The trust root
stays offline and signs protocol material on its own schedule.

**Verifiers carry more work.** Each verifying party fetches, hashes, re-executes and enforces windows
itself, rather than checking one signature. This is deliberate: the cost buys independence, and the
official engines are Rust (ADR-043), deterministic and cheap to run offline.

**Freshness becomes an operator-side operational routine.** Operators must re-run conformance and
re-publish evidence before their windows close, or peers will fail closed on them. Unlike renewal in the
removed model, this depends on nobody else.

**No financial invariant is touched.** `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`,
`INV-RECON-*` and `INV-QR-*` are unchanged. This ADR changes how two operators decide to interoperate —
never what correctness means once they do.
