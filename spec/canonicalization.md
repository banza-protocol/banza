# BANZA Canonical JSON (`BCJ/1`) — Normative Specification

- **Status:** Normative
- **Version:** `BCJ/1`
- **Protocol version:** BANZA 1.0
- **Authority:** [ADR-082](../decisions/adr/ADR-082-banza-canonical-json.md); versioning per [ADR-081](../decisions/adr/ADR-081-normative-completeness-versioning-decision.md)
- **Test vectors:** [`conformance/vectors/canonicalization.json`](../conformance/vectors/canonicalization.json)

> The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**,
> **MAY** and **OPTIONAL** in this document are to be interpreted as described in BCP 14
> ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174))
> when, and only when, they appear in all capitals.

This document defines the byte form BANZA signs and digests. It is written so that an implementation can
be built from this text alone, in any language, without reference to the BANZA reference implementation.

---

## 1. Scope

`BCJ/1` applies wherever BANZA computes a **signature** or a **content digest** over a JSON artifact:
signed protocol metadata, Key Manifest, BANZA Revocation List, conformance evidence, evidence bundles,
receipts, and any future signed artifact that declares `BCJ/1`.

It does **not** apply to transport encoding, to JSON documents that are neither signed nor digested, or to
webhook signatures, which have their own specification (`contracts/webhooks/signature.json`).

## 2. Basis

`BCJ/1` is [RFC 8785 — JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785),
restricted by the profile rules in §3. Where this document and RFC 8785 disagree, **this document
governs**; where this document is silent, RFC 8785 applies.

From RFC 8785, unchanged and REQUIRED:

1. Output is **UTF-8** with no whitespace between tokens.
2. Object members are **sorted by member name**, comparing the names as sequences of **UTF-16 code units**
   (RFC 8785 §3.2.3). Sorting is applied at every nesting level.
3. **Array order is preserved.** Arrays are ordered data and MUST NOT be sorted.
4. Strings use RFC 8785 minimal escaping: `"` and `\` are escaped; `U+0008`, `U+0009`, `U+000A`,
   `U+000C`, `U+000D` use their short forms (`\b`, `\t`, `\n`, `\f`, `\r`); other code points below
   `U+0020` use `\u00xx` lowercase hex; every other code point is emitted literally.
5. `true`, `false` and `null` are emitted as those literals.

> **Note on ordering.** UTF-16 code-unit ordering is not the same as UTF-8 byte ordering for code points
> outside the Basic Multilingual Plane. Implementations that sort by UTF-8 bytes (for example a naive use
> of an ordered map in some languages) will diverge for such member names. This is stated because the
> BANZA reference implementation previously had exactly this property.

## 3. BANZA profile rules

### P1 — Numbers MUST be integers

A canonicalizable BANZA artifact MUST NOT contain a JSON number in fractional or exponent form. Numbers
MUST be integers and MUST be serialised as an optional `-` followed by digits with no leading zeros
(`0` itself is `0`; `-0` MUST be rejected).

Rationale: BANZA already requires integer minor units across its entire monetary surface, and no signed
artifact schema declares a `number` type. Excluding fractional numbers removes ECMAScript double
formatting, which is the largest source of cross-language divergence in RFC 8785.

### P2 — Integers MUST be within the safe range

An integer MUST satisfy `-(2^53 - 1) ≤ n ≤ 2^53 - 1`, that is `-9007199254740991 … 9007199254740991`.

A value outside this range MUST cause the artifact to be **rejected** (fail-closed). It MUST NOT be
truncated, rounded, converted to a float, or re-encoded as a string during canonicalization.

Rationale: RFC 8785 numbers are ECMAScript Numbers; integers beyond 2⁵³ are not exactly representable.
BANZA's ledger type is 64-bit, so the boundary is real and MUST be stated rather than discovered.

### P3 — Duplicate member names MUST be rejected

If any JSON object contains the same member name more than once, at any nesting level, the artifact MUST
be **rejected** (fail-closed). Implementations MUST NOT apply last-wins, first-wins or merge semantics.

Rationale: duplicate members are the classic signature-confusion vector — two parsers can disagree about
which value was signed.

### P4 — Unknown members are preserved

Members not described by the artifact's schema MUST be preserved and canonicalized like any other member.
They are part of the signed content.

Rationale: a signature covers the whole document. Dropping unknown members would let an intermediary
remove content while leaving a signature that still verifies.

### P5 — No Unicode normalisation during canonicalization

Canonicalization MUST NOT apply NFC, NFD or any other Unicode normalisation. Bytes are canonicalized as
received.

Publishers **MUST** emit string content in **NFC**. Verifiers **MUST NOT** normalise before verifying.

Rationale: normalising at verification time would cause two genuinely different documents to verify
against one signature. Normalisation is an obligation on the party creating the artifact, not a step in
deriving bytes.

### P6 — Member ordering is by UTF-16 code units

Stated in §2 item 2; repeated here because it is a profile-visible requirement.

### P7 — Canonicalization identifier

Artifacts that declare their canonicalization MUST use the exact string `BCJ/1`.

## 4. The signed bytes

For every signed BANZA artifact the signing input is derived as follows. This procedure is normative.

1. Take the complete artifact as a JSON object.
2. **Remove the signature envelope member** — the member that carries the signature itself, named in §6
   for each artifact type. Removal is shallow: only that top-level member is removed.
3. Verify P1, P2 and P3 over the remaining document. If any fails, **reject**; do not sign or verify.
4. Canonicalize the remaining document per §2 and §3.
5. The resulting UTF-8 byte sequence **is** the signing input. It MUST be signed as-is, with no length
   prefix, no additional framing, no trailing newline and no further transformation.

Signature algorithm: **Ed25519** ([RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)), over exactly those
bytes. Signatures are encoded **base64url without padding**.

> Only the signature member is removed. Every other member — including `key_id`, timestamps, identifiers
> and unknown members — is inside the signed bytes.

## 5. The digested bytes

A content digest over a BANZA artifact is computed as:

1. Steps 1–4 of §4, removing the members named for that artifact in §6 — for a digest this is the
   signature member **and** the digest member itself, so that the digest does not attempt to cover itself.
2. `SHA-256` ([FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/fips/nist.fips.180-4.pdf)) over the resulting
   bytes.
3. The digest is encoded as **lowercase hexadecimal**, 64 characters, with **no** algorithm prefix unless
   the field's schema explicitly requires one (for example a `sha256:` prefix where the schema says so).

A verifier reproduces a digest by repeating this procedure. Any implementation following §4 and §5
obtains the same bytes and therefore the same digest.

## 6. Per-artifact excluded members

The members removed before canonicalization, by artifact type. This table is normative and is what makes
independent verification possible.

| Artifact | Signature member | Additionally excluded for digests |
|---|---|---|
| Signed protocol metadata | `signature` | `content_hash` where present |
| Key Manifest | `signature` | `manifest_hash` where present |
| BANZA Revocation List (BRL) | `signature` | `list_hash` where present |
| Delegated signing key declaration | `signature` | — |
| Trust root metadata | `root_signatures` | — |
| Conformance evidence package | `package_signature` | `evidence_hash` |
| Evidence bundle | `signature` where present | `bundle_hash` |
| Operator manifest | `signature` where present | `manifest_hash` |
| Receipts (journey, operation) | `signature` where present | `receipt_hash` where present |

For the trust root metadata the signature member is an **array** of detached signatures; the array member
is removed in full before canonicalization, and each signature in it is verified over the same bytes.

## 7. Verification procedure

A verifier MUST:

1. Reject if P1, P2 or P3 fails.
2. Derive the signing bytes per §4.
3. Resolve the verification key by `key_id` through the trust path in force (ADR-079 Model A: the Trust
   Root signs only the Key Manifest; delegated keys sign domain artifacts per ADR-038).
4. Verify the Ed25519 signature over those bytes.
5. Reject on any failure. There is no partial acceptance and no fallback to an alternative
   canonicalization.

## 8. Conformance

An implementation conforms to `BCJ/1` if, for every vector in
[`conformance/vectors/canonicalization.json`](../conformance/vectors/canonicalization.json), it produces
the stated canonical bytes and digest, and rejects every vector marked as rejected for the stated reason.

## 9. Versioning

`BCJ/1` is versioned independently of the protocol version (ADR-081). A change to any rule in §2–§6 that
alters produced bytes REQUIRES a new canonicalization version (`BCJ/2`, …). The protocol version in force
declares which canonicalization applies
(`contracts/production/protocol-version.json` → `canonicalization`).

## 10. Security considerations

- **Signature confusion** — mitigated by P3 (duplicate rejection) and by signing the whole document minus
  only the signature member.
- **Number ambiguity** — mitigated by P1/P2. A protocol carrying money MUST NOT allow `1`, `1.0` and `1e0`
  to be alternative spellings of the same signed value.
- **Unicode ambiguity** — mitigated by P5: exactly one party (the publisher) normalises, and verification
  is byte-exact.
- **Content stripping** — mitigated by P4: unknown members are signed, so removal invalidates.
- **Downgrade** — an artifact declaring a canonicalization other than the one in force MUST be rejected;
  there is no negotiation.
