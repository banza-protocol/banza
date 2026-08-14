# BANZA Trust Material Freshness and Anti-Rollback — Normative Specification

- **Status:** Normative
- **Protocol version:** BANZA 1.0.0
- **Authority:** [ADR-028](../decisions/adr/ADR-028-anti-rollback-for-versioned-trust-material.md); extends ADR-025 and ADR-025, which are unchanged
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
| **Set consistency (mix-and-match)** | Each artifact is fresh and monotonic **within its own key, independently**. A verifier can therefore be served a fresh Key Manifest together with a fresh, unexpired BRL that has not yet revoked a key the manifest endorses — every artifact individually valid, and no two of them necessarily from one coherent publication state. **Expiry does not close this**: it constrains how old any single artifact may be, not whether several current artifacts belong together |

Four guarantees have to be kept apart, because they are easy to confuse and only two of them are
provided:

| | Provided? | What it means |
|---|---|---|
| **Artifact freshness** | yes | An expired artifact is not accepted |
| **Local monotonicity** | yes | Within an observed scope, a verifier does not go back below the highest marker it has accepted |
| **Set consistency** | **no** | BANZA does not currently guarantee that several individually valid, fresh artifacts belong to a single coherent publication state |
| **Cross-observer consistency** | **no** | BANZA does not provide global transparency or split-view detection |

Set consistency is stated here rather than solved. Solving it in general means a signed statement about
the *set* of current artifacts — a snapshot role, with its own key, its own expiry and its own stale
state to handle. BANZA does not adopt one, and does not claim the property in the meantime.

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

| Artifact | Logical authority scope | Ordering marker | Acceptance rule |
|---|---|---|---|
| BANZA Revocation List | `issuer` | `issued_at` | §3 |
| Key Manifest | `root.key_id` — the root the manifest is anchored to | `not_before` | §3 |
| Signed protocol metadata | the signing `key_id` together with the subject it binds | `issued_at` | §3 |

The ordering markers are RFC 3339 instants declared with `format: date-time`, whose granularity may be
whole seconds. **Two legitimate consecutive publications can therefore carry the same marker**, which is
why §3.1 is mandatory rather than defensive.

**Why these members and not a sequence number.** Each is already REQUIRED by its contract, already
carries the semantics of "when this version came into force", and is already inside the signed bytes —
so an attacker cannot alter it without invalidating the signature. Introducing a new integer sequence
would change the wire form of artifacts under a protocol version that does not change it (ADR-008).

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
3. If `v == mark(k)`, see §3.1 — the marker alone is not sufficient to decide.
4. If `v < mark(k)`, the artifact **MUST be rejected**, fail-closed, with reason code
   `trust_version_rollback`. The evaluation that depended on it MUST NOT succeed.

A rejection under (3.1) or (4) MUST NOT modify the recorded state. An attacker who can serve old or
conflicting artifacts MUST NOT be able to move the mark backwards by serving them.

### 3.1 Equal marker: the content decides

Because the ordering markers are timestamps and not counters, an equal marker does not by itself mean
"the same artifact". A verifier MUST therefore record, alongside the mark, the **content digest** of the
artifact accepted at that mark.

The content digest is **SHA-256 over the artifact's signing input**: the same canonical byte sequence,
produced by the same BCJ/1 rule ([`spec/canonicalization.md`](canonicalization.md) §5), that the
artifact's signature covers. It is not a second digest rule invented here — it is the digest of the bytes
that were signed, so identical digests mean identical signed content, and a change to any member the
signature covers changes it.

The three artifacts do **not** share a member name for the signature, so the excluded member is named per
type rather than assumed:

| Artifact | Member excluded from the signing input | Why |
|---|---|---|
| BANZA Revocation List | `signature_ref` | It references the detached signature over the list's canonical bytes. A reference to a signature cannot lie inside the bytes that signature covers |
| Key Manifest | `root_signatures` | The threshold signatures are attached to the document they sign |
| Signed protocol metadata | `signatures` | Same: the signatures are attached to the document they sign |

Exactly one BCJ/1 rule applies to all three; only the excluded member differs, and it differs because the
contracts differ. An implementation MUST NOT substitute its own digest rule here: a digest taken over
different bytes than the signature covers would compare something other than the signed content.

Where an artifact is later defined whose signature covers a different member, this table is extended.
An artifact type absent from it has no defined digest for this purpose, and MUST NOT be admitted to the
rule by guessing one.

On receiving an artifact whose marker equals the mark for key `k`:

- **Same digest** — this is the same artifact seen again. It is **accepted** as an idempotent
  observation. Re-fetching the current artifact is normal traffic and MUST NOT be treated as an attack.
- **Different digest** — two distinct artifacts claim the same position in the same authority's
  sequence. The verifier has observed **local equivocation**, and it MUST be rejected, fail-closed, with
  reason code `trust_version_equivocation`. The evaluation MUST NOT succeed, and the recorded state MUST
  NOT change.

Silently accepting the second artifact would let a party that can serve two differently-signed documents
at one instant choose which one a verifier acts on. Silently preferring the first would make the outcome
depend on fetch order.

#### Publisher obligation

The rule above is stated for verifiers, and it implies an obligation on the other side that MUST be
stated rather than left to be discovered:

> **An authority MUST NOT publish two distinct artifacts of the same type carrying the same ordering
> marker.** Where two artifacts would otherwise share a marker, the second MUST carry a strictly greater
> one.

This is not a new constraint on the wire form — it is the constraint verification already depends on. A
publisher that emits two differently-signed artifacts at one marker has produced, from every verifier's
point of view, local equivocation; the second is rejected fail-closed and the first stays in force. An
implementation that never did this was already conforming, and one that did was already failing.

Because `format: date-time` permits whole-second granularity, an authority publishing more than once per
second MUST either use sub-second precision or defer the second publication. Neither requires a schema
change: RFC 3339 already admits fractional seconds.

This detection is **local and stateful**, exactly like §3. It sees a conflict only when one verifier
observes both artifacts. It does not detect equivocation across observers, which remains outside this
specification (§1).

## 4. Persistence

The high-water mark **and the digest recorded with it** (§3.1) **MUST survive process restart**. An implementation that keeps it only in process
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

**Publisher clock regression.** If a publisher's clock moves backwards and it issues an artifact with a
marker earlier than one it has already published, verifiers that observed the earlier publication will
refuse the new one under §3(4). That is the intended outcome: a verifier cannot distinguish an
accidental clock regression from a deliberate rollback, and refusing is the correct response to not
knowing. The rule MUST NOT be relaxed to let a lower marker reset the mark. Publishers are responsible
for monotonic issuance.

## 8. Reason codes

Rollback detection emits the core reason code **`trust_version_rollback`**; the equal-marker conflict of
§3.1 emits **`trust_version_equivocation`**. Both are published in
[`contracts/production/reason-code-registry.production.json`](../contracts/production/reason-code-registry.production.json).

As everywhere in BANZA, the **status decides and the reason code explains**
([`spec/reason-codes.md`](reason-codes.md) §1): the evaluation's outcome is carried by its status field,
and the code states why.

## 9. Conformance

An implementation conforms if, for every vector in
[`conformance/vectors/trust-freshness.json`](../conformance/vectors/trust-freshness.json), it reaches the
stated outcome: first observation, idempotent re-observation, forward, rollback, rollback after restart,
concurrent acceptance, equal-marker conflict in either arrival order, and conflict detection after
restart.

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
- **Same-marker substitution** — addressed by §3.1. Without it, a timestamp-ordered rule would let two
  differently-signed artifacts at one instant both be acceptable, and fetch order would decide which one
  a verifier acted on.
- **False confidence** — the most serious risk in this area is describing a stateful local defence as
  transparency. §1 exists to prevent that, and it MUST be preserved in any restatement of this rule.
