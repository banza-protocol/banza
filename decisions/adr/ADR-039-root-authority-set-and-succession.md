# ADR-039 — Root Authority Set and succession

## Context

BANZA v1.0.0 declared a three-authority Root with a threshold of two (`INV-ROOT-007`) and asserted that
losing a seat could not compromise continuity (`INV-ROOT-009`). Neither was true of the protocol.

The threshold lived in ceremony evidence. The runtime chain a verifier actually walks anchored **one**
root public key and accepted a Key Manifest carrying **one** signature, so nothing a verifier checked
could distinguish a two-authority authorisation from a single key signing. Continuity had no mechanism
at all: there was no representation of an authority *set*, so there was nothing to succeed.

The ceremony validator was worse than incomplete. It was **self-authorising**: a set `{A,B,C}` signed by
two of its own keys validated, and so did an unrelated `{X,Y,Z}` signed by two of *its* own keys. It
proved *"two keys named in this document agree with each other"* — a statement anyone can produce about
keys they generated a moment earlier. It never proved *"the set that was already trusted authorised this
one"*, which is the only thing that makes a root a root.

The three shapes of the same artifact — `root_signatures` in the specification, no signature member at
all in the production schema, a single `signature` in the vectors and the reference implementation —
meant an implementer following the specification and one following the vectors produced documents that
failed each other.

## Decision

**Root authority is a lineage of signed sets. Each set is authorised by the threshold of the set it
succeeds; the first is authorised by explicit pinning.**

Two artifacts, kept apart:

| Artifact | Answers | Changes when |
|---|---|---|
| **Root Authority Set** | who may exercise Root authority | an authority is replaced |
| **Key Manifest** | what the Root currently delegates | delegated keys rotate |

```
pinned genesis set (sequence 0)
    │  threshold of set N authorises set N+1
    ▼
set N … active set
    │  two distinct active authorities sign
    ▼
Key Manifest → delegated keys, within scope
```

A successor names its predecessor by digest, advances the sequence by exactly one, and carries
signatures from at least two **distinct** authorities **of the predecessor set**. The genesis set has no
predecessor and is accepted only when its digest equals one the verifier was explicitly given; trust on
first use is refused.

The model remains **three authorities, threshold two**. Nothing else was introduced: no secret sharing,
no threshold cryptosystem, no consensus, no transparency log.

`authority_id` is a cryptographic label. No organisation name participates in validity.

## Rationale

Predecessor authorisation is the whole correction, and it is one rule. It converts "these keys agree
with each other" into "the trusted set authorised this one", which is the difference between a lineage
and a self-assertion. Nothing larger was needed: the earlier gap was not a shortage of cryptography, it
was a missing link.

Separating the set from the Key Manifest matters for a practical reason. Delegated keys rotate often and
the authority set rarely; binding them into one document would force a Root-threshold ceremony for every
routine delegation. A threshold that must be convened constantly is a threshold that gets worked around,
and the security property would erode through ordinary operational pressure rather than through attack.

Counting **distinct** authorities rather than signature entries is what stops one custodian signing
twice from reaching the threshold alone — the same defect the sweep found in the ceremony validator, now
prevented in the layer that decides.

Counting the **predecessor's** signatures is what keeps the recovery path at 2-of-3. If the successor's
own authorities counted, the authority being removed could be required to consent to its own removal,
which would make the path effectively 3-of-3 and hand an obstructive or compromised authority a veto.

Refusing trust on first use follows from what a root is for. An unpinned root is not a root; it is
whichever document arrived first, which is precisely the property an attacker supplies.

Blocking continuity when fewer than two authorities remain is deliberate. Any emergency key, override or
single-signer break glass would be a one-party route to the maximum authority in the protocol — the
exact condition the threshold exists to prevent — and its existence would be more dangerous than the
loss it insures against.

## Alternatives considered

**Keep one root key and withdraw the claims.** Smallest change: retract `INV-ROOT-007` and
`INV-ROOT-009` and admit a single-key root. Rejected because it discards the property the architecture
exists to provide — no unilateral control of critical authority — to avoid a version increment.

**Add `root_signatures` to the Key Manifest and stop.** Nearly right, and it merges two questions into
one artifact. Every delegated-key rotation would then require the Root threshold, and the set that may
sign would still have no lineage — a manifest could be signed by any three keys claiming to be the root.

**Larger thresholds — 3-of-5, 5-of-9, Shamir, MPC.** Rejected. None of them supplies predecessor
authorisation, which was the missing property; they only change the arithmetic of a threshold that was
already unenforced. Redundancy beyond one-authority failure tolerance is not demonstrated to be needed,
and each option adds seats, custody surface and ceremony states.

**Certificate transparency or a log over authority-set changes.** Rejected: it addresses cross-observer
consistency, which BANZA does not claim and does not obtain here either. The lineage proves descent from
the pinned genesis set; it does not prove that two verifiers were shown the same lineage.

## Consequences

- A single authority cannot control the Root at any layer a verifier checks — the claim is now a
  property of the chain rather than of a procedure.
- The surviving two authorities can replace the third without its participation, so loss, compromise and
  obstruction are all recoverable, and `INV-ROOT-009` finally has a mechanism.
- A new authority set cannot self-declare legitimacy; it must derive from the trusted predecessor.
- Losing two authorities blocks canonical continuity with no cryptographic backdoor. Recovery is a
  governance matter and may end in credible exit under a different pinned anchor, which does not inherit
  canonical lineage.
- A v1.0.0 Key Manifest does not verify under this model. This is a wire-incompatible change to a
  production contract, so the protocol version becomes **2.0.0** under ADR-008's own rule.
- Independent control domains remain a **production governance gate**, evidenced before the first
  production ceremony — not something a verifier can check, and not a claim the protocol makes today.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/root-authority-set.md`](../../spec/root-authority-set.md)
- [`contracts/production/root-authority-set.production.schema.json`](../../contracts/production/root-authority-set.production.schema.json)
- [`contracts/production/key-manifest.production.schema.json`](../../contracts/production/key-manifest.production.schema.json)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-ROOT-002`, `INV-ROOT-007`, `INV-ROOT-009`, `INV-ROOT-011` … `INV-ROOT-014`
- [`conformance/vectors/root-authority-set.json`](../../conformance/vectors/root-authority-set.json)
