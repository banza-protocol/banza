# BANZA Reason Codes — Normative Specification

- **Status:** Normative
- **Registry:** `banza-reason-codes/1`
- **Protocol version:** BANZA 1.0.0
- **Authority:** [ADR-023](../decisions/adr/ADR-023-reason-code-model.md)
- **Machine-readable registry:** [`contracts/production/reason-code-registry.production.json`](../contracts/production/reason-code-registry.production.json)
- **Test vectors:** [`conformance/vectors/reason-codes.json`](../conformance/vectors/reason-codes.json)

> The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**,
> **MAY** and **OPTIONAL** in this document are to be interpreted as described in BCP 14
> ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174))
> when, and only when, they appear in all capitals.

This document closes audit blocker **X-04**. It is written so that an implementation can produce and
interpret BANZA reason codes from this text and the registry alone, in any language, without reference to
the BANZA reference implementation.

---

## 1. The distinction that makes the rest simple

**A status decides. A reason code explains.**

| | Decides | Explains |
|---|---|---|
| Trust evaluation | `trust_status` | `reason_codes` |
| Validation journey step | `status` (`VERIFIED` / `PENDING` / `FAILED` / `BLOCKED`) | `reason_codes` |
| Federation trust evaluation | `outcome` (`ROUTING_ALLOWED` / `FAIL_CLOSED`) | `failed_checks`, `detail` |
| Artifact fetch | `ok` | `reason_codes` |

A conformant consumer derives its behaviour from the **status**. It MUST NOT change a verdict because of
a reason code, and MUST NOT reject an artifact because it does not recognise a reason code.

This is what makes the vocabulary extensible without being dangerous: a code it has never seen can only
make an outcome *better explained*, never differently decided.

## 2. Five vocabularies, not one enum

BANZA does not have a single reason-code space, and MUST NOT acquire one. The registry publishes five
distinct vocabularies, each with its own domain, producer and closure:

| Vocabulary | Kind | Closed | Scope |
|---|---|---|---|
| `trust_status` | decisional status | **yes** — 13 values | PROTOCOL NORMATIVE |
| `fetch_reason_codes` | explanatory | core closed, extensible | PROTOCOL NORMATIVE |
| `journey_step_status` | decisional status | **yes** — 4 values | PROFILE NORMATIVE |
| `engine_status_by_step` | decisional status, per step | **yes** | PROFILE NORMATIVE |
| `failed_checks` | **check identifiers** | **yes** | PROTOCOL NORMATIVE |

Codes that are **out of scope for BANZA** and MUST NOT be added to these vocabularies: transport errors
(HTTP status, TLS alerts, DNS), scheme or Layer-3 operational declines, ledger or settlement outcomes,
regulatory determinations, and an operator's internal policy reasons. An implementation MAY report those
in the extension namespace of §5; the protocol does not define them.

## 3. `trust_status`

The outcome of evaluating an operator's published trust material. The field is a **closed enum**: a value
outside it makes the artifact schema-invalid.

Each value's meaning and its mapping onto a journey step status are published in the registry under
`vocabularies.trust_status.values`. Two properties are normative here:

1. **`TRUST_VALID` is the only success value.** Every other value is a refusal.
2. **Absence is not failure.** `TRUST_MISSING_CONFORMANCE_EVIDENCE`, `TRUST_MISSING_OPERATOR_MANIFEST`
   and `TRUST_MISSING_REGISTRY_ENTRY` map to `PENDING`, not `FAILED`: they say the publication is
   incomplete, not that it is wrong. Every other non-success value maps to `FAILED`.

A status this specification does not list MUST NOT be produced, and a consumer receiving one MUST treat
the artifact as schema-invalid — this is a closed enum field, and the rule of §6 does not apply to it.

## 4. `failed_checks` — identifiers, not free text

`failed_checks` in a federation trust evaluation carries **check identifiers**, and the only permitted
values are the check `id`s published in
[`contracts/federation/federation-trust.json`](../contracts/federation/federation-trust.json). It does not
define a second vocabulary and it does not carry prose.

- **Ordering is not significant.** A consumer MUST NOT infer precedence, causality or severity from
  position.
- **Duplicates are forbidden.** The field is a set expressed as an array.
- **It MUST be empty when `outcome` is `ROUTING_ALLOWED`**, and MUST be non-empty when `outcome` is
  `FAIL_CLOSED` — an evaluation that refuses must say which check refused it.
- A value that is not a published check id makes the evaluation **schema-invalid**.

Human-readable explanation belongs in `detail`, which is prose and carries no machine semantics.

## 5. Extension namespace

An implementation MAY emit reason codes beyond the core vocabularies. Every such code **MUST** match:

```
^x-[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[A-Za-z0-9_.-]+$
```

for example `x-acme.gateway_timeout`.

Core codes never contain a `.`, so a core code and an extension code can never collide, and no future
core addition can silently take over a vendor's meaning.

A consumer **MUST** preserve extension codes it receives and **MUST NOT** interpret them. An extension
code MUST NOT appear in a closed enum field (§3, §4).

## 6. Unknown reason codes

| Case | Required behaviour |
|---|---|
| Core-shaped code, not in the registry | **Preserve and record.** MUST NOT change any verdict. MUST NOT cause rejection |
| Extension code (`x-vendor.…`) | **Preserve, never interpret.** MUST NOT change any verdict |
| Any value outside a closed enum field | The artifact is **schema-invalid** (`trust_status`, `failed_checks`, step statuses) |

The asymmetry is deliberate. Adding a core reason code is a backward-compatible change under ADR-009's
versioning policy, so an implementation that rejected unknown core codes would make every future addition
a breaking change. A *status*, by contrast, decides an outcome, so an unrecognised one cannot be tolerated:
there is no safe way to act on a decision you cannot read.

## 7. Stability and evolution

- A published core code is **stable**: within protocol version 1.x it is never removed and never
  repurposed to mean something else.
- Adding a core code is **backward compatible** and does not change `protocol_version` (ADR-009).
- A code may be marked **deprecated** in the registry. A deprecated code MUST still be accepted by
  consumers; producers SHOULD stop emitting it. Deprecation never changes a code's meaning.
- Changing the meaning of an existing code is **not permitted**. A new meaning REQUIRES a new code.

## 8. Semantic equivalence of receipts

Two receipts produced by independent implementations for the same subject and the same inputs are
**semantically equivalent** when all of the following hold:

1. The **decisional statuses** are equal — overall status, and per step the step status and the engine
   status.
2. The **input bindings** are equal — the digests of the fetched artifacts, computed per
   `spec/canonicalization.md` §5.
3. The **core reason codes** are equal **as sets**, after removing extension codes. Order is not
   significant; duplicates are not significant.
4. `failed_checks`, where present, is equal **as a set**.

The following MAY differ without affecting equivalence, and a comparison MUST ignore them:

- timestamps, durations and any other measurement of when or how long;
- execution, receipt, trace and correlation identifiers;
- extension reason codes (`x-vendor.…`);
- prose fields: `detail`, human-readable messages, and any explanatory text;
- the identity and version of the implementation that produced the receipt;
- ordering of array members whose ordering this specification declares insignificant.

**Byte equality is not required and MUST NOT be used as the definition.** Two implementations that
recorded the same decision over the same inputs are equivalent even though no two receipts will share
bytes.

## 9. Conformance

An implementation conforms to `banza-reason-codes/1` if, for every vector in
[`conformance/vectors/reason-codes.json`](../conformance/vectors/reason-codes.json), it reaches the stated
outcome — accepting what the registry accepts, rejecting what the closed fields reject, preserving what
must be preserved, and judging equivalence as §8 defines it.

## 10. Security considerations

- **Information leakage.** A reason code is published material. A producer MUST NOT encode secrets,
  credentials, internal host names, stack traces or personal data in `detail` or in an extension code.
  The core vocabulary is deliberately coarse for this reason.
- **Spoofed extensions.** Because extension codes are never interpreted and never affect a verdict, an
  attacker who can influence them gains nothing. This is the reason for the rule, not a side effect.
- **Namespace collision.** The mandatory `.` in extension codes and its absence from core codes make
  collision impossible by construction rather than by convention.
- **Downgrade.** A consumer MUST NOT treat an unrecognised *status* as a weaker known status. Closed
  enums are closed precisely so that an unreadable decision fails rather than degrades.
- **Ambiguity.** Ordering and duplicates in `failed_checks` are declared insignificant so that two
  implementations cannot disagree about the meaning of the same set.
