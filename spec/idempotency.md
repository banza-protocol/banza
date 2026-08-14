# BANZA Idempotency — Normative Specification

- **Status:** Normative
- **Protocol version:** BANZA 1.0.0
- **Authority:** [ADR-022](../decisions/adr/ADR-022-idempotency.md); extends ADR-022, which established the invariant and deliberately left these questions open
- **Invariants:** `INV-IDEM-001`, `INV-FED-004`, `INV-FED-IDEM-001`, `INV-COLLECTION-008`
- **Test vectors:** [`conformance/vectors/idempotency.json`](../conformance/vectors/idempotency.json)

> The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**,
> **MAY** and **OPTIONAL** in this document are to be interpreted as described in BCP 14
> ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174))
> when, and only when, they appear in all capitals.

This document closes audit blocker **X-05**. It does **not** redesign idempotency: `INV-IDEM-001` already
establishes the invariant and the conflict rule, and ADR-022 already establishes that the protocol does not
prescribe storage technology. What was missing, and what this document supplies, is exactly three things:
**key scope**, **retention**, and **what makes two requests the same request**.

---

## 1. Scope of this specification

Idempotency in BANZA is not one rule. It is three, and they have different owners:

| Surface | Key | Scope classification | Governed by |
|---|---|---|---|
| Operator write path (transfers, collections, payment intents) | `idempotency_key` | **PROTOCOL NORMATIVE** — §2–§7 of this document | `INV-IDEM-001`, `INV-COLLECTION-008` |
| Cross-operator routing | `routing_request_id` | **PROTOCOL NORMATIVE** — §8 | `INV-FED-004`, `INV-FED-IDEM-001` |
| Webhook and event delivery | `event.id` | **PROFILE NORMATIVE** — consumer-side deduplication, already specified in `contracts/events/webhook-types.json` | — |

Explicitly **out of scope**, and unchanged by this document: settlement finality, clearing, ledger
mechanics, scheme rules, an operator's internal storage, and any retry policy a scheme imposes on its
participants. Where a Layer-3 scheme defines its own idempotency, that rule is the scheme's and BANZA does
not restate it.

## 2. Key scope

An idempotency key is **not** globally unique, and MUST NOT be treated as such on the operator write path.
Two unrelated callers using the key `order-001` are describing two different operations, and an
implementation that treated them as one would be conflating two callers' intents.

The identity of an idempotency record is the tuple:

```
(receiving_implementation, authenticated_caller, operation, idempotency_key)
```

where:

- **`receiving_implementation`** — the implementation that received the request. Keys are never shared
  across implementations.
- **`authenticated_caller`** — the identity the request authenticated as. Two distinct callers MUST NOT
  share an idempotency record, even with an identical key.
- **`operation`** — the protocol operation being performed. The same key on a transfer and on a collection
  share-payment are two records, not a conflict.
- **`idempotency_key`** — the caller-supplied value.

Two requests are the **same intended operation** when, and only when, all four components match. If any
component differs, they are different operations and neither is a replay or a conflict of the other.

An implementation MUST NOT widen this scope (which would create false conflicts across callers or
operations) and MUST NOT narrow it (which would allow the same intent to execute twice).

## 3. Request identity — what makes a body "the same"

`INV-IDEM-001` distinguishes a replay (same key, same request) from a conflict (same key, different
request). This section defines that comparison, and it is defined so as to be reproducible in any language.

The **request identity digest** of a request is:

1. Take the request body as a JSON object.
2. Remove the members listed in §4 as excluded.
3. Compute the digest per [`spec/canonicalization.md`](canonicalization.md) §5 — that is, `BCJ/1`
   canonical bytes, then SHA-256, lowercase hex.

Two requests carrying the same key in the same scope are the **same request** when their request identity
digests are equal, and a **different request** otherwise.

BANZA deliberately reuses `BCJ/1` rather than defining a second comparison. Raw HTTP byte comparison would
make a legitimate retry fail merely because a client re-serialised its JSON with different whitespace or
member order; a loose "semantic" comparison would let a materially different request be served the first
response. `BCJ/1` is exactly the middle: it is insensitive to formatting and member order, and sensitive to
every value.

A request body that `BCJ/1` **rejects** (a fractional number, an out-of-range integer, a duplicate member)
has no request identity digest and MUST be rejected before any idempotency processing. It is not treated as
a new request, and it MUST NOT create or consume an idempotency record.

## 4. Excluded members

The following are removed before computing the request identity digest, because they legitimately differ
between a request and its own retry, and including them would break every retry:

| Member | Why excluded |
|---|---|
| `idempotency_key` | It is the lookup key, not part of what is being described |
| `trace_id`, `correlation_id`, `request_id` | Observability identity; a retry is a new attempt with a new trace |
| `timestamp`, `requested_at`, `client_time` | A retry is by definition later than the original |
| `nonce` | Freshness material, regenerated per attempt |

Everything else is included, and this is exhaustive: an implementation MUST NOT exclude any other member.
In particular the following are **inside** the identity, because a change to any of them is a change to
what the caller is asking for:

- amounts, currencies, counterparties, references, descriptions;
- every unknown member (`BCJ/1` P4) — an extension field is part of the request;
- any signature over the request. A different signature over identical content is a different request.

> **Note on signatures.** Excluding a signature would let an attacker who can strip or replace it reuse a
> victim's idempotency record. Including it means a client that re-signs a retry with fresh material
> produces a conflict; such a client MUST reuse the original signed request when retrying. This is the
> conservative direction: a spurious 409 is safe, a collapsed distinction is not.

## 5. Retry semantics

For the same key in the same scope with the same request identity digest:

1. The implementation **MUST return the result of the original operation** and MUST NOT perform the
   operation again. No second ledger posting, no second transfer, no second state transition.
2. The response **MUST** carry the same resource identity as the original — the same resource id, the same
   operation id, and the same terminal status the original reached.
3. The implementation **MAY** recompute a representation of that result rather than replaying stored bytes.
   The response need not be byte-identical to the original; it MUST be *semantically* the same result, in
   the sense of [`spec/reason-codes.md`](reason-codes.md) §8.
4. Fields that legitimately vary MAY differ: timestamps of the response itself, trace identifiers, and
   any measurement of duration.

**If the original operation is still in progress**, the implementation MUST NOT start a second one. It MUST
respond with either the operation's current non-terminal state, or a retryable indication that the result
is not yet available. It MUST NOT report success, and MUST NOT report failure, for an operation whose
outcome is not yet known.

## 6. Conflict

For the same key in the same scope with a **different** request identity digest, the implementation:

1. **MUST reject the request.** The HTTP status is **409**.
2. **MUST NOT** perform the new operation.
3. **MUST NOT** return the original operation's result. Serving the first response for a second, different
   intent is the failure this rule exists to prevent.
4. **MUST NOT** modify, replace or invalidate the existing idempotency record. A conflict leaves the
   original untouched.
5. **MUST NOT** produce any other side effect.

The rejection is fail-closed: an implementation that cannot determine whether the digests match MUST treat
the request as a conflict, never as a replay.

## 7. Retention

An implementation **MUST** retain an idempotency record for at least **24 hours** from the moment the
operation reached a terminal state, and **MUST** declare its actual retention window.

**The declaration is the interoperable part.** BANZA follows the pattern it already uses for every other
time-bounded property — the Key Manifest, the BRL and trust metadata each carry their own `expires_at`,
and a counterparty reads it rather than assuming. Retention is declared the same way, in the capabilities
document:

```json
"idempotency": { "retention_seconds": 604800 }
```

- `retention_seconds` **MUST** be an integer of at least `86400` (24 hours).
- A counterparty **MUST NOT** rely on a window longer than the one declared.
- An implementation **MAY** retain longer than it declares; it **MUST NOT** retain less.

**After retention expires**, the key is forgotten. A request carrying an expired key is a **new** request
and is processed as one. This is the honest consequence and MUST be stated rather than left to discovery:
an implementation cannot distinguish a very late retry from a fresh request once the record is gone, which
is precisely why the window is declared and why a caller that needs replay safety beyond it must not rely
on the key alone.

The 24-hour floor is a normative decision, not a derivation: no existing BANZA artifact bounds a retry
horizon, and ADR-022 deliberately declines to prescribe storage. Twenty-four hours is the smallest period
that spans a full operational day including an overnight incident and the following reconciliation, which
is the realistic horizon over which a caller retries an operation whose outcome it never learned. The floor
exists to exclude a degenerate implementation that forgets keys in minutes and silently double-posts; the
declared window, not the floor, is what a counterparty reasons about.

## 8. Cross-operator routing

`routing_request_id` is governed by `INV-FED-004` and `INV-FED-IDEM-001` and differs from §2 in one
respect: it **is** globally unique, across all operators and all time, with the format `rr-<uuid>` and
stable across retries (`contracts/federation/federation-routing.json`,
`spec/federation/FEDERATION_CONTRACT_SURFACE.md`).

Because the key is globally unique, its scope tuple degenerates to the key alone. Everything else in this
document applies unchanged: §3 request identity, §5 retry semantics, §6 conflict, §7 retention.

## 9. Concurrency

Two requests carrying the same key in the same scope may arrive concurrently, before either has produced a
record. The observable behaviour is normative, because otherwise a race in one implementation becomes
accidental semantics for everyone.

**Exactly one of the two MUST perform the operation.** For the other, an implementation MUST do one of:

- **(a)** wait for the first to reach a terminal state and then return its result, as a replay under §5; or
- **(b)** reject it as still-in-progress under §5, with no side effect.

An implementation **MUST NOT**:

- perform the operation twice;
- return success for the second request before the first has a terminal state;
- report a conflict under §6 when the request identity digests are equal — concurrency is not conflict.

The choice between (a) and (b) is an implementation decision. Both are conformant, and a caller MUST be
able to handle either. `INV-IDEM-001`'s durability requirement applies: the uniqueness guarantee MUST come
from a durable authoritative store, not from an optional cache, so it cannot be defeated by two nodes
serving the same key.

## 10. Idempotency is not replay protection

These are different properties and MUST NOT be conflated:

| | Idempotency | Replay protection |
|---|---|---|
| Question | Did the caller already ask for this? | Is this authenticated material being reused illegitimately? |
| Mechanism | `idempotency_key` and the record | Signature validity windows, single-use challenges, revocation |
| Correct outcome on repeat | Return the original result | Refuse |

An implementation MUST NOT use an idempotency record to satisfy a replay-protection requirement, and MUST
NOT use replay protection to satisfy idempotency. A legitimate retry of a signed request is idempotent and
MUST succeed; a replayed single-use challenge is an attack and MUST fail. Nothing in this document changes
the security model.

## 11. Conformance

An implementation conforms if, for every vector in
[`conformance/vectors/idempotency.json`](../conformance/vectors/idempotency.json), it reaches the stated
outcome: replay, conflict, distinct operation, or rejection.

## 12. Security considerations

- **Cross-caller collision** — prevented by `authenticated_caller` in the scope tuple (§2). Without it, a
  caller could probe or occupy another caller's key space.
- **Cross-operation collision** — prevented by `operation` in the tuple. Without it, a key used on a
  transfer would block an unrelated collection payment.
- **Conflict as an oracle** — a 409 reveals only that *this* caller previously used *this* key for a
  different request, within its own scope. It reveals nothing about another caller.
- **Retention bypass** — an implementation that under-retains silently converts a retry into a second
  operation. This is why the floor is a MUST and why the declared window is published rather than assumed.
- **Canonicalization mismatch** — request identity uses `BCJ/1`, the same rule as signatures and digests,
  so an implementation cannot have two disagreeing notions of "the same document".
- **Malicious unknown fields** — unknown members are inside the request identity (§4), so an attacker
  cannot alter a request's meaning while keeping its digest. `BCJ/1` P1–P3 apply, so an unknown member
  cannot smuggle an ambiguous number or a duplicate key past the comparison.
