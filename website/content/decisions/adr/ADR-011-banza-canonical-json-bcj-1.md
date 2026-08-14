# ADR-011 — BANZA Canonical JSON (BCJ/1)

## Context

Every signature, digest and request identity in BANZA is computed over bytes. JSON does not have unique
bytes: the same document can be serialised with different key orders, different spacing, different
number formats and different escaping, all equally valid. Two implementations that agree completely
about meaning will therefore disagree about signatures unless the byte form is fixed.

This is the first thing an independent implementation encounters and the first thing that can silently
break it, because the failure looks like a bad signature rather than a serialisation difference.

## Decision

**Adopt RFC 8785 (JSON Canonicalization Scheme) as the basis, restricted by an explicit profile. The
result is `BCJ/1`.**

The profile removes ambiguities RFC 8785 leaves open and constructs BANZA does not need:

| Rule | Why |
|---|---|
| Numbers are JSON integers; fractional and exponent forms are invalid | Removes ECMAScript double formatting — the hardest and most divergence-prone part of RFC 8785. Monetary amounts are already integer minor units, and no signed-artifact schema has a floating-point field |
| Integers lie within ±(2⁵³−1) | RFC 8785 numbers are ECMAScript Numbers and cannot represent larger integers exactly. A 64-bit type permits values that would not round-trip, so the boundary is stated rather than discovered |
| Duplicate object members cause rejection, before any semantic interpretation | RFC 8785 assumes a parsed structure and does not define duplicate handling; parsers differ (last-wins, first-wins, error). Signature confusion is the direct risk |
| Unknown members are preserved and canonicalized like any other | Signatures cover the whole document. Dropping unknown members would let an intermediary strip content while keeping the signature valid |
| No Unicode normalisation during canonicalization: publishers emit NFC, verifiers do not normalise | Normalising at verification would make two genuinely different documents verify identically. Normalisation is a publication obligation, not a canonicalization step |
| Member ordering is by UTF-16 code units, per RFC 8785 | Stated explicitly because it differs from the UTF-8 byte ordering a sorted map gives for characters outside the Basic Multilingual Plane |

The identifier `BCJ/1` is carried by artifacts that declare their canonicalization.

## Rationale

Starting from a published standard rather than inventing a rule gives independent implementations in
several languages to check against, and gives an implementer prior art instead of a novel algorithm.

The profile is subtractive, and that is the whole design. Each rule removes a case rather than adding a
mechanism, so `BCJ/1` is strictly smaller than RFC 8785 and every removal deletes a class of
divergence. Integers-only removes the floating-point formatting problem entirely rather than specifying
it more carefully.

Rejecting duplicates *before* semantic interpretation is the security-critical ordering. If a verifier
parses first and canonicalizes after, two parsers that resolve duplicates differently will authenticate
different documents under one signature.

Refusing verifier-side normalisation is the rule most likely to be "helpfully" reversed by an
implementer, and it is stated with its reason for that reason: a normalising verifier accepts documents
that are not the document that was signed.

## Alternatives considered

**Plain RFC 8785 with no profile.** Rejected: it leaves duplicate handling undefined and requires the
full ECMAScript number algorithm, which is where independent implementations diverge in practice.

**A BANZA-specific canonicalization from scratch.** Rejected. It would provide no property the profile
lacks while discarding existing implementations and review.

**A binary encoding such as CBOR or protobuf.** Genuinely canonical and genuinely better on the merits,
and rejected because the entire wire surface, tooling and debugging story is JSON. The migration cost is
not repaid by a problem the profile already solves.

## Consequences

- Two conformant implementations produce identical bytes for the same document, so a signature mismatch
  means a real difference.
- Fractional numbers cannot appear in a signable artifact — accepted, since monetary values are integer
  minor units.
- Publishers carry the NFC obligation, which cannot be enforced by a verifier without breaking the
  byte-exactness the scheme exists for.
- Canonicalization can advance to `BCJ/2` without moving the protocol version (ADR-008).

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/canonicalization.md`](../../spec/canonicalization.md)
- [`conformance/vectors/canonicalization.json`](../../conformance/vectors/canonicalization.json)
