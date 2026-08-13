# BANZA Capabilities — Normative Specification

- **Status:** Normative
- **Registry:** `banza-capabilities/1` — [`contracts/production/capability-registry.production.json`](../contracts/production/capability-registry.production.json)
- **Protocol version:** BANZA 1.0.0
- **Test vectors:** [`conformance/vectors/capabilities.json`](../conformance/vectors/capabilities.json)

> The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**,
> **MAY** and **OPTIONAL** in this document are to be interpreted as described in BCP 14
> ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174))
> when, and only when, they appear in all capitals.

This document closes one gap. BANZA described capabilities in three places with no published mapping
between them: the identifiers a conformance profile requires, the boolean `supports_*` flags of the
capabilities schema, and the free-form strings of an implementation's manifest. An implementation could
not determine which value to declare in order to satisfy a profile's requirement.

**It changes no wire form and adds no member.** What it adds is the semantics that were missing.

---

## 1. One canonical namespace

BANZA has **one** namespace of core capability identifiers, published in the capability registry. No
other surface may introduce a core capability identifier.

The identifiers are those the conformance-profile registry already uses to state what a profile
requires. They are canonical because that registry answers the normative question — *what does this
profile require?* — not because of how they read.

A core capability identifier is a string that appears as an `id` in the registry's `capabilities`
array. Anything else is not one.

## 2. Declaring a capability

An implementation declares its capabilities in the `capabilities` member of its manifest, which is an
array of strings. That form is unchanged.

**To satisfy a core capability requirement, an implementation MUST declare the corresponding canonical
capability identifier**, or an alias the registry accepts for it (§4).

Other strings MAY appear in `capabilities`: the member is not a closed enum, and this specification does
not make it one. But:

> A value that is not a registered core capability identifier or a registered alias **does not satisfy
> a core capability requirement**, whatever it resembles.

This is the whole of the change. The member accepts what it always accepted; what is now defined is
which of its values count.

## 3. No implicit normalisation

When deciding whether a declared value satisfies a core capability requirement, an implementation
**MUST** compare it as an exact string, and **MUST NOT**:

- fold case;
- substitute separators, in either direction — `consumer_payment` and `consumer-payment` are different
  strings, and are equivalent only if the registry says so;
- guess singular and plural forms;
- match on a prefix, a suffix or a substring;
- apply edit distance, phonetic matching, or any other fuzzy comparison.

Two strings are equivalent when the registry says they are, and at no other time.

**Why this is a MUST rather than a convention.** A verifier that normalises implicitly makes the set of
satisfying values depend on its own normalisation table, and two verifiers with different tables reach
different verdicts about the same manifest. Conformance would then be a property of who evaluated it.

## 4. Aliases

The registry MAY record an alias for a canonical identifier. An alias is **accepted on input** and
satisfies the capability it aliases.

**Canonical emission.** An implementation that produces a capability list **SHOULD** emit the canonical
identifier, not an alias. Aliases exist so that material already published remains valid, not so that
a second spelling becomes normal.

An alias is registered only where the equivalence is **semantically demonstrable** and the form is
already published. The registry records the evidence for each. A spelling found in non-normative
documentation is not grounds for an alias.

## 5. `supports_*` flags

[`conformance/capabilities/schema.json`](../conformance/capabilities/schema.json) declares boolean
flags that predate the capability registry. They remain valid and their meaning is unchanged.

Each flag was audited against the core capabilities individually, and the registry records the relation:
**exact**, **broader**, **narrower**, **composition**, or **none**.

**Only an `exact` relation permits a flag to satisfy a core capability requirement.** A broader flag
claims more than the capability and does not establish it; a narrower one claims less. Where a relation
is not exact, the registry states it and asserts no mapping.

The audit found exactly one exact relation. That is a fact about how the two vocabularies grew, not a
deficiency to be corrected by asserting the rest.

## 6. Determining satisfaction

Given a profile's `required_capabilities` and an implementation's declared capabilities, a verifier
**MUST** be able to decide satisfaction deterministically:

```
declared capabilities
  → resolve each value: canonical identifier, registered alias, or neither
  → the implementation's core capability set
  → for each required capability: present, or not
```

The procedure requires no implementation code, no ADR, no README, no assistant and no heuristic. Every
input to it is published: the requirement in the profile registry, the identifiers and aliases in the
capability registry.

A required capability that is not in the implementation's core capability set is **not satisfied**, and
the profile is not met. There is no partial credit and no inference from a related declaration.

## 7. Conformance

An implementation conforms to this specification if, for every vector in
[`conformance/vectors/capabilities.json`](../conformance/vectors/capabilities.json), it reaches the
stated outcome: a canonical identifier satisfies; a missing requirement does not; an unrelated
capability does not; an unregistered string does not; a registered alias does; and a near-spelling
never satisfies implicitly.

## 8. Boundary

This specification defines which declarations satisfy which requirements. It confers nothing: declaring
a capability is a statement by the implementation about itself, and is neither a certification, an
admission, nor an authorisation. Whether the declaration is true is established by conformance evidence,
not by the declaration.
