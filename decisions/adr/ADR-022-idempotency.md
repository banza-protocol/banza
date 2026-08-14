# ADR-022 — Idempotency

## Context

Networks fail after the request arrives and before the response returns. The caller cannot distinguish
that from a request that never arrived, so it retries — and in a payment system the retry is the danger,
because the first request may already have moved money.

Without a protocol answer, every operator invents one: a deduplication window, a hash of the request
body, a client-generated identifier with different scoping rules. Each is defensible, none interoperates,
and a caller integrating with two operators has to learn two retry semantics — precisely when they are
least able to reason, at three in the morning during an incident.

## Decision

**Idempotency is a protocol invariant. Every financial write carries a caller-supplied idempotency key.**

Re-submitting the same key returns the original result without creating a second effect. The same key
presented with a different request body is rejected as a conflict — never silently served the first
response, because that would let a caller believe a different operation succeeded.

**Rate limiting is an operator concern, not a protocol invariant.** The protocol defines only the
observable contract: an operator that applies a limit says so with a defined error. The limit values, the
counting algorithm and the window are operator choices, and the protocol prescribes none of them.

Implementation technology is left entirely to operators — no mandated storage engine, no service
topology, no time-to-live, no failure policy for any cache. Any technology that satisfies the invariant
above satisfies the protocol.

## Rationale

The key is caller-supplied because only the caller knows which requests are the same intent. An operator
deriving a key from the request body would treat two genuinely distinct payments of the same amount to
the same payee as duplicates — a real scenario that occurs whenever someone buys two identical coffees.

Rejecting a key reuse with a different body is the security-relevant half, and it is the part most often
omitted. Serving the cached response would tell the caller that *this* request succeeded, when a
different one did. A conflict is unambiguous, and the caller can resolve it.

The idempotency-versus-rate-limiting split marks a boundary the protocol keeps returning to: correctness
is protocol, capacity is operator. Idempotency changes what is true about the ledger, so it must be
uniform. A rate limit changes only whether a request is served now, so it can vary — and it must,
because operators have different capacity.

Robustness under independent implementation: the invariant is stated as observable behaviour, so it can
be verified from outside by replaying a request without knowing anything about the implementation.

## Alternatives considered

**Server-derived idempotency from a request digest.** Rejected: it cannot distinguish two legitimately
identical payments, which is the case it would silently break.

**A time-boxed deduplication window with no key.** Rejected. Correctness would depend on clocks and on
retry timing, and a retry after the window would duplicate money.

**Return the original response for any key reuse, ignoring the body.** Rejected: it converts a caller
error into a silent, wrong success.

**Standardise rate limits in the protocol.** Rejected — it would bind every operator to one capacity
model and would not improve interoperability, since a caller must handle the limit error regardless.

## Consequences

- A caller retries safely against any conformant implementation, with the same semantics everywhere.
- Callers must generate and retain keys, which is real work pushed to the client and is where the
  knowledge is.
- Key reuse with a changed body surfaces as an explicit conflict rather than a silent success.
- Operators tune limits freely; the error contract stays uniform.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/idempotency.md`](../../spec/idempotency.md)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-IDEM-*`
- [`conformance/vectors/idempotency.json`](../../conformance/vectors/idempotency.json)
