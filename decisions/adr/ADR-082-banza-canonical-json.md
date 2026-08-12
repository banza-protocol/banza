# ADR-082 — BANZA Canonical JSON (`BCJ/1`)

- **Status:** Accepted
- **Date:** 2026-08
- **Relates:** ADR-081 (versioning decision), ADR-079 (Model A signing), ADR-038 (domain separation), ADR-037 (Rust-first engines)
- **Audit basis:** `docs/audit/BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md` §14, finding **F-01 (P0)**
- **Normative specification:** [`spec/canonicalization.md`](../../spec/canonicalization.md)

## Context

BANZA signs and digests JSON artifacts — the Key Manifest, the BANZA Revocation List, signed protocol
metadata, evidence bundles, receipts. Verification requires that two parties derive **exactly the same
bytes** from the same logical document. Until now the rule was `serde_json::to_string()` in the Rust
reference implementation.

Measured behaviour of that rule (compiled and executed against the same `serde_json` version the engine
uses):

| Input | Prior output | Consequence |
|---|---|---|
| `{"b":1,"a":2}` | `{"a":2,"b":1}` | Keys sorted — deterministic, but by UTF-8 byte order and only because `preserve_order` happens not to be enabled |
| `1e2` | `100.0` | An RFC 8785 implementation emits `100`. Different bytes → signature fails |
| `10000000000000000000000` | `1e+22` | Precision-losing float form for a value that is not a float |
| `"café"` | preserved unnormalised | Two visually identical documents can digest differently |

The rule is therefore both **unpublished** and **language-coupled**: it is a property of one Rust crate's
serializer, not a property anyone can implement from a specification.

## Decision

**Adopt RFC 8785 (JSON Canonicalization Scheme) as the basis, restricted by an explicit BANZA profile.**
The result is named **BANZA Canonical JSON version 1**, identifier **`BCJ/1`**.

`BCJ/1` = RFC 8785, plus these profile rules, each of which either removes an ambiguity RFC 8785 leaves
open or removes a construct BANZA does not need:

| # | Profile rule | Reason |
|---|---|---|
| **P1** | **Numbers MUST be JSON integers.** Fractional and exponent forms are invalid in a canonicalizable BANZA artifact | Removes ECMAScript double formatting — the single hardest and most divergence-prone part of RFC 8785. BANZA already mandates integer minor units (`contracts/invariants.json`: *"Monetary representation — integer minor units across the entire surface"*), and **zero** `type: number` fields exist in any signed-artifact schema |
| **P2** | **Integers MUST be within ±(2⁵³−1).** Out-of-range values MUST be rejected, fail-closed | RFC 8785 numbers are ECMAScript Numbers and cannot represent integers beyond 2⁵³ exactly. `i64` permits larger values, so the boundary must be stated rather than discovered |
| **P3** | **Duplicate object member names MUST cause rejection**, fail-closed | RFC 8785 assumes a parsed structure and does not define duplicate handling; parser behaviour varies (last-wins, first-wins, error). Signature confusion is the direct risk |
| **P4** | **Unknown members are preserved and canonicalized** like any other member | Signatures cover the whole document. Silently dropping unknown members would let an intermediary strip content while keeping a valid signature |
| **P5** | **No Unicode normalisation is performed during canonicalization.** Publishers MUST emit NFC; verifiers MUST NOT normalise | Canonicalization must be byte-exact and reversible-free; normalising during verification would make two different documents verify identically. Normalisation is a *publication* obligation, not a canonicalization step |
| **P6** | **Member ordering is by UTF-16 code units**, per RFC 8785 §3.2.3 | Stated explicitly because it differs from Rust's `BTreeMap` UTF-8 byte ordering for characters outside the Basic Multilingual Plane |
| **P7** | The canonicalization identifier `BCJ/1` is carried by artifacts that declare their canonicalization | Makes the transition from the prior behaviour explicit rather than silent (ADR-081) |

## Evaluation of RFC 8785 (required by the remediation milestone)

| Criterion | Finding |
|---|---|
| Interoperability | Published IETF standard; the canonicalization already used by JWS-adjacent ecosystems |
| Multi-language support | Independent implementations exist in JavaScript, Java, Go, Python, C#, Rust |
| Member ordering | Fully specified (UTF-16 code units) — deterministic and implementable from text |
| Number representation | Fully specified, but via ECMAScript `Number::toString`; **this is the weak point**, addressed by P1/P2 |
| Unicode / escaping | Fully specified minimal escaping; no normalisation — addressed by P5 |
| Arrays | Order preserved (arrays are ordered data, not sets) |
| Compatibility with BANZA schemas | Verified: 0 `type: number` fields in signed artifacts; monetary values already integer minor units |
| Independent test vectors | RFC 8785 ships its own; BANZA additionally publishes profile-specific vectors |
| Limitations | Double formatting (removed by P1); duplicate keys undefined (fixed by P3); no normalisation (made explicit by P5) |

**Verdict: PROFILE RFC 8785.** Not bare adoption — the profile is what makes it safe for a financial
protocol — and not a bespoke BANZA scheme, which would forfeit existing implementations and vectors.

### Alternatives considered

**Specify the current `serde_json` behaviour.** Rejected outright. It would enshrine one crate's
serializer as the norm, keep the protocol language-coupled, and require every other language to
reverse-engineer Rust float formatting. This is precisely what the remediation forbids.

**Define a bespoke BANZA canonical form.** Rejected. It would discard mature implementations and
third-party test vectors and place the entire correctness burden on BANZA, for no benefit over a profiled
standard.

**Adopt RFC 8785 unprofiled.** Rejected. It would leave duplicate-key handling undefined and would admit
ECMAScript double formatting into a protocol that has no floats and cannot tolerate silent precision loss.

**Sign a non-JSON encoding (CBOR/COSE).** Rejected as out of scope: it would change every artifact's wire
form, which ADR-081 explicitly determined must not happen, and no finding requires it.

## Consequences

- `spec/canonicalization.md` becomes the normative definition; the Rust engine implements it. The
  direction of authority is inverted relative to the audited state.
- **No artifact required regeneration.** This ADR was drafted assuming the bytes would change for every
  signed artifact. That assumption was then measured and is false: `BCJ/1` and the prior behaviour coincide
  for every artifact BANZA actually emits — all use ASCII member names, integers in range and no
  fractional numbers — and a signature produced under the prior behaviour still verifies under `BCJ/1`,
  which it could only do if the signing bytes are unchanged. Evidence:
  `engines/banza-trust/tests/canonical_migration.rs`. The transition is a specification change, not a data
  migration. The divergences in the Context table above are real but unreached by present artifacts; they
  are what a *future* artifact would have hit, and P1/P2/P3 now forbid reaching them.
- P1/P2 impose a real constraint: a BANZA artifact carrying a fractional number, or an integer beyond
  ±(2⁵³−1), is not canonicalizable and MUST be rejected. This is a deliberate narrowing.
- P3 makes duplicate-key documents invalid rather than parser-dependent.
- Independent implementations can be written from `spec/canonicalization.md` plus the published vectors,
  with no access to BANZA code.

## Boundary

This ADR defines how bytes are derived. It does not define what is signed, by which key, or under which
trust rules — those remain ADR-079 (Model A) and ADR-038 (domain separation). It confers no authority over
protocol semantics, profiles or governance.
