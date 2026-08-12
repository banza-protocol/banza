# BANZA Trust Material Freshness and Anti-Rollback — Normative Specification

- **Status:** Normative
- **Protocol version:** BANZA 1.0.0
- **Authority:** [ADR-085](../decisions/adr/ADR-085-trust-material-anti-rollback.md); extends ADR-038 and ADR-079, which are unchanged
- **Test vectors:** [`conformance/vectors/trust-freshness.json`](../conformance/vectors/trust-freshness.json)

> The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**,
> **MAY** and **OPTIONAL** in this document are to be interpreted as described in BCP 14
> ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174))
> when, and only when, they appear in all capitals.

This document closes one gap: BANZA trust artifacts carry issuance instants and validity windows, and a
verifier could previously accept an **older but still validly signed and still unexpired** artifact after
having already accepted a newer one. Nothing in the published surface forbade that.

It changes no wire form and adds no field. It constrains **acceptance**, using members these artifacts
already declare as REQUIRED.

---

## 1. What this specification does and does not provide

This is the most important section, and it is first on purpose. Anti-rollback is a **stateful local
defence**. It is not transparency, and it must not be described as such.

**Provided.** A verifier that has already accepted a given version of a trust object will not later
accept an older one for the same object, even if that older artifact is correctly signed and still
inside its validity window.

**Not provided, and MUST NOT be claimed:**

| Not provided | Why |
|---|---|
| **First-observation staleness** | On first contact there is no prior version to compare against. A verifier that has never seen a newer version cannot detect that the one it received is historical |
| **Global equivocation** | Two verifiers with no shared state can be served different-but-individually-valid artifacts and both accept. Local monotonicity constrains one observer's history, not consistency across observers |
| **Suppression** | A publication origin that withholds a newer artifact — a revocation not yet observed, for instance — is not detected by this rule. It prevents replacing a known newer version, not withholding an unknown one |
| **Availability** | This rule says nothing about what happens when material cannot be fetched. That is §6 |

Detecting the first three would require an append-only public history with inclusion and consistency
proofs, audited across observers. BANZA 1.0.0 does not define one. See
[`docs/research/related-work-positioning.md`](../docs/research/related-work-positioning.md).

## 2. Scope of the rule

The rule applies to a trust object's **acceptance for use in an evaluation**, per logical object, per
authority. It is not a global `max()` across unrelated artifacts.

The **monotonic key** is:

```
(artifact_type, authority_identity)
```

where `authority_identity` is the identity the artifact itself declares for the party whose sequence it
belongs to. Two artifacts of the same type from different authorities are independent objects and MUST
NOT be compared.

| Artifact | `artifact_type` | `authority_identity` | Ordering member |
|---|---|---|---|
| BANZA Revocation List | `brl` | `issuer` | `issued_at` |
| Key Manifest | `key_manifest` | `root.key_id` (the root the manifest is anchored to) | `not_before` |
| Signed protocol metadata | `signed_protocol_metadata` | the signing `key_id` and the subject it binds | `issued_at` |

**Why these members and not a sequence number.** Each is already REQUIRED by its contract, already
carries the semantics of "when this version came into force", and is already inside the signed bytes —
so an attacker cannot alter it without invalidating the signature. Introducing a new integer sequence
would change the wire form of artifacts under a protocol version that does not change it (ADR-081).

Where a future artifact declares an explicit integer sequence, **that sequence takes precedence** over
the instant, and this table is extended rather than reinterpreted.

Artifacts whose only version-shaped member is a **schema or format version** — `schema_version`,
`protocol_version` — are **out of scope**. Those identify a document format, not a position in a
sequence, and applying monotonicity to them would be an invented constraint.

## 3. The rule

A verifier MUST maintain, for each monotonic key it has observed, the **highest accepted ordering value**
— the *high-water mark*.

A trust artifact is **accepted** only after it has been obtained from a valid origin, verified
cryptographically, found within its validity window, and passed every other applicable check. Only then
does it affect the high-water mark.

On accepting an artifact with ordering value `v` for key `k`:

1. If `k` has no high-water mark, record `v`. **This is a first observation** — see §1.
2. If `v > mark(k)`, the artifact is accepted and `mark(k)` becomes `v`.
3. If `v == mark(k)`, the artifact is accepted and the mark is unchanged. Re-fetching the current
   artifact is normal and MUST NOT be treated as an attack.
4. If `v < mark(k)`, the artifact **MUST be rejected**, fail-closed, with reason code
   `trust_version_rollback`. The evaluation that depended on it MUST NOT succeed.

A rejection under (4) MUST NOT modify the high-water mark. An attacker who can serve old artifacts MUST
NOT be able to move the mark backwards by serving them.

## 4. Persistence

The high-water mark **MUST survive process restart**. An implementation that keeps it only in process
memory is not conformant: restarting is the cheapest way for an attacker to clear the defence.

This specification defines observable behaviour, not storage. Any mechanism that preserves the mark
across a restart of the verifying component satisfies it — a file, a database row, a key-value store.
BANZA prescribes none.

## 5. Concurrency

Two refreshes of the same key may complete concurrently. Updating the high-water mark MUST be atomic
with respect to other updates of the same key: after concurrent acceptance of `v₁` and `v₂`, the mark
MUST be `max(v₁, v₂)`.

A race MUST NOT be able to move the mark backwards. An implementation that reads, compares and writes
without atomicity can lose the higher value, which silently disables the defence.

## 6. Relationship to availability

This rule constrains **which** artifacts are acceptable. It says nothing about **obtaining** them.

BANZA trust material is currently published at a single canonical origin, and evaluations that require
freshly fetched material fail closed when it cannot be obtained. That is intentional — refusing is the
correct response to not knowing — and it is a **current operational limitation**, recorded as such in
[`spec/federation/FEDERATION_PROTOCOL_FLOW.md`](federation/FEDERATION_PROTOCOL_FLOW.md) and in the
Whitepaper's limitations. Redundant distribution of already-signed artifacts would address availability;
it is not defined in 1.0.0.

Availability and anti-rollback are different properties with different mechanisms. Neither substitutes
for the other.

## 7. Legitimate rotation is unaffected

Key rotation, emergency replacement, succession and revocation all publish artifacts that move
**forward**: a new Key Manifest has a later `not_before`, a new BRL a later `issued_at`. The rule
constrains only regression, so no legitimate procedure is blocked by it.

If a recovery procedure ever required republishing at an **earlier** ordering value, that would indicate
a defect in the versioning model rather than a reason to weaken this rule, and MUST be reported as such.

## 8. Reason code

Rollback detection emits the core reason code **`trust_version_rollback`**, published in
[`contracts/production/reason-code-registry.production.json`](../contracts/production/reason-code-registry.production.json).

As everywhere in BANZA, the **status decides and the reason code explains**
([`spec/reason-codes.md`](reason-codes.md) §1): the evaluation's outcome is carried by its status field,
and `trust_version_rollback` states why.

## 9. Conformance

An implementation conforms if, for every vector in
[`conformance/vectors/trust-freshness.json`](../conformance/vectors/trust-freshness.json), it reaches the
stated outcome: first observation, equal, forward, rollback, rollback after restart, and concurrent
acceptance.

## 10. Security considerations

- **Replay of validly signed history** — the threat this rule addresses, and only within the bound of §1.
- **Mark poisoning** — a rejected artifact never updates the mark (§3), so serving old artifacts cannot
  lower it.
- **Restart clearing** — addressed by §4; a memory-only mark is defeated by restarting the verifier.
- **Race-condition clearing** — addressed by §5.
- **Clock manipulation** — the ordering members are inside the signed bytes, so a remote party cannot
  alter them without invalidating the signature. The verifier's comparison is between two signed values,
  not against its own clock; local clock use for validity windows is governed separately by
  INV-FEDEVAL-006.
- **False confidence** — the most serious risk in this area is describing a stateful local defence as
  transparency. §1 exists to prevent that, and it MUST be preserved in any restatement of this rule.
