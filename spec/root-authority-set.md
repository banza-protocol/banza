# Root Authority Set

- **Status:** Normative
- **Protocol version:** 1.0.0
- **Canonicalization:** BCJ/1 ([`spec/canonicalization.md`](canonicalization.md))
- **Contract:** [`contracts/production/root-authority-set.production.schema.json`](../contracts/production/root-authority-set.production.schema.json)
- **Invariants:** `INV-ROOT-002`, `INV-ROOT-007`, `INV-ROOT-009`, `INV-ROOT-011` … `INV-ROOT-014`

This document defines **who may exercise BANZA Root authority**, and how that changes over time. What the
Root currently delegates is a separate artifact, the Key Manifest.

---

## 1. Two questions, two artifacts

| Artifact | Question | Changes when |
|---|---|---|
| Root Authority Set | who may exercise Root authority | an authority is replaced |
| Key Manifest | what the Root currently delegates | delegated keys rotate |

They are separate documents because they change on different schedules. Binding them together would
require a Root-threshold ceremony for every routine delegation, and a threshold that must be convened
constantly is a threshold that gets worked around.

## 2. The set

A Root Authority Set carries exactly **three** authorities and a **threshold of two**. Each authority is
a cryptographic label and an Ed25519 public key.

An `authority_id` is **not** an organisation. No organisation name participates in validity. That the
three holders occupy independent control domains is a production governance requirement, evidenced
before the first production ceremony — not a field a verifier checks. Cryptography determines who
signed; governance determines whether the holders satisfy independence.

## 3. The lineage

```
genesis set (sequence 0)          explicitly pinned
    │  threshold of set N authorises set N+1
    ▼
set 1 … set N                     each bound to its predecessor by digest
    │
    ▼
active set                        authorises the Key Manifest
```

Every set except the genesis set MUST be authorised by the set it succeeds. A set that carries only
signatures by its own authorities authorises nothing: it proves that some keys listed in a document agree
with each other, which anyone can produce.

## 4. Signing input

The signing input is the BCJ/1 canonical byte sequence of the document **excluding
`predecessor_signatures`**, for the same reason every other BANZA artifact excludes its own signature
member: a signature cannot lie inside the bytes it covers.

The **set digest** is SHA-256 over that signing input. It is the set's identity, and it is what a
successor's `predecessor_digest` and a Key Manifest's `root_authority_set.digest` refer to.

## 5. Accepting a successor

Given a trusted active set `P` and a candidate `S`, a verifier MUST accept `S` only when all of the
following hold:

1. `S` validates against the contract schema.
2. `S.set_sequence` equals `P.set_sequence + 1`.
3. `S.predecessor_digest` equals the set digest of `P`.
4. At least `P.threshold` **distinct** `authority_id`s appear in `S.predecessor_signatures` such that
   the id is an authority **of `P`** and the signature verifies over `S`'s signing input under that
   authority's public key **as recorded in `P`**.
5. `S` carries exactly three authorities with distinct ids and distinct public keys, and
   `threshold` is 2.
6. The verifier's clock is within `[S.issued_at, S.expires_at)`.

Any failure means `S` is not accepted and `P` remains active. There is no partial acceptance.

**Distinct authorities, not signature entries.** Two signatures by one authority count once. A single
custodian presenting the same key twice does not reach the threshold.

**A removed authority is never required.** Step 4 counts signatures from authorities of `P`. Replacing
`C` means `P = {A,B,C}` and `S = {A,B,D}`, authorised by `A+B`. `C` neither signs nor is asked. An
authority therefore cannot obtain a veto by refusing to participate, and a compromised authority cannot
block its own replacement.

## 6. The genesis set

The genesis set has `set_sequence` 0, `predecessor_digest` null and no predecessor signatures. A verifier
MUST accept it only when its set digest equals a digest the verifier was **explicitly configured with**.

A verifier MUST NOT trust an unpinned genesis set on first use. An unpinned root is not a root; it is
whatever arrived first.

## 7. Accepting a Key Manifest

A Key Manifest is accepted only when:

1. `root_authority_set.set_sequence` and `root_authority_set.digest` identify the **active** set; and
2. at least `threshold` **distinct** authorities of that set have valid signatures in `root_signatures`
   over the manifest's signing input (the canonical bytes excluding `root_signatures`).

The root signs the Key Manifest and root-level delegation, rotation, revocation and trust policy. It
signs nothing else (`INV-ROOT-004`).

## 8. Ordering, rollback and equivocation

The Root Authority Set is a versioned trust artifact under
[`spec/trust-freshness.md`](trust-freshness.md), with `set_sequence` as its ordering marker and the set
digest as its content digest. A verifier maintains the highest accepted sequence for the lineage:

| Observation | Outcome |
|---|---|
| lower sequence than the highest accepted | `trust_version_rollback` — rejected, fail-closed |
| equal sequence, equal set digest | idempotent re-observation — accepted |
| equal sequence, different set digest | `trust_version_equivocation` — rejected, fail-closed |
| higher sequence | eligible, subject to §5 |

Re-serving a superseded set after a successor is active is therefore rejected on the marker, before any
signature is considered.

## 9. Atomicity

The active set is a reference to one accepted document. A verifier either accepts a set whole or keeps
the previous one, so no state exists in which two, four, or mixed authorities are active. No additional
state machine is defined, because none is needed to obtain the property.

## 10. Loss of the threshold

If fewer authorities remain than `threshold`, no successor can be authorised and canonical Root
continuity is **blocked**.

This is deliberate and is not to be circumvented. An implementation MUST NOT provide an emergency master
key, a hidden recovery key, an administrator override, or any single-signer path that authorises a Root
action below threshold. Any such path would be a one-party route to the maximum authority in the
protocol, which is precisely what the threshold exists to prevent.

Recovery from that state is a governance matter, and may end in credible exit under a different,
explicitly pinned trust anchor — which does not inherit canonical BANZA lineage.

## 11. What this does not provide

Accepting a set proves it descends from the pinned genesis set by threshold authorisation at every step.
It does **not** provide cross-observer consistency: two verifiers with no shared state may be shown
different, individually valid lineages, and BANZA does not detect that. Split-view detection and global
transparency remain outside the protocol (`spec/trust-freshness.md`).
