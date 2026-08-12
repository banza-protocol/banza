# BANZA v1.0 — Canonicalization Migration / Compatibility Note

> Companion to [ADR-081](../../decisions/adr/ADR-081-normative-completeness-versioning-decision.md) and
> [ADR-082](../../decisions/adr/ADR-082-banza-canonical-json.md). Records what publishing `BCJ/1` changed,
> what it did not, and the conditions under which the equivalence recorded here would cease to hold.

## Summary

**No artifact requires regeneration. No signature was invalidated. The protocol version does not change.**

Publishing the canonicalization rule was expected to change the bytes signed and hashed. It was tested
rather than assumed, and for every artifact BANZA actually produces the bytes are **identical**.

## What changed

The *authority* moved. The rule was `serde_json::to_string()` inside the Rust engine; it is now
`spec/canonicalization.md` (`BCJ/1`), and the engine implements that specification. A third party can now
derive BANZA's signing bytes from text and public vectors, with no access to BANZA code.

## What did not change

| | |
|---|---|
| `protocol_version` | `1.0.0` |
| Wire shape of any contract | unchanged |
| Bytes signed for existing artifacts | unchanged (measured) |
| Existing signatures | still verify (asserted in test) |
| Published PDFs, website, deployed services | untouched — no deploy was performed |

## Why the bytes are unchanged

`BCJ/1` and the prior behaviour coincide exactly when all three hold:

1. every object member name is ASCII — UTF-16 and UTF-8 ordering then agree;
2. every number is an integer within ±(2⁵³−1) — no float formatting is reached;
3. no C0 control characters appear in strings.

All three hold for every BANZA artifact. Verified in
`engines/banza-trust/tests/canonical_migration.rs` across signed protocol metadata, trust root metadata,
operator manifest, conformance evidence, registry entry and BRL; and independently against the live
Operator Zero artifact (19 members, all-ASCII names, all integers safe).

## When the equivalence would cease to hold

An artifact that introduces **any** of the following diverges from the prior behaviour, and under `BCJ/1`
the first two are rejected outright:

- a non-integer number, or an integer outside ±(2⁵³−1) — **rejected** (P1/P2);
- an object with duplicate member names — **rejected** (P3);
- a non-ASCII member name — accepted, but ordered by UTF-16 code units, which can differ from the previous
  UTF-8 byte ordering.

This is the intended effect: the rule is now explicit, so these cases have defined outcomes instead of
implementation-dependent ones.

## For implementers

Conformance is `conformance/vectors/canonicalization.json`: produce the stated canonical form and SHA-256
for all 14 accept vectors, and reject all 6 reject vectors for the stated rule. The vectors were generated
from the specification text by an implementation sharing no code with the BANZA engine.
