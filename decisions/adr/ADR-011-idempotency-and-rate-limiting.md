# ADR-011 — Idempotency and Rate Limiting

**Status:** Accepted  
**Date:** 2026-05-13

---

## Context

BANZA defines the protocol rules and contracts that operator implementations must satisfy; it does not run an API, hold state, or move funds. Operators — not BANZA — expose the public API surface and process financial writes under their own technical and operational responsibilities.

Two cross-cutting concerns affect every financial write an operator exposes:

1. **Idempotency** — a caller's server may retry a request that appeared to fail (network timeout, 5xx response). If the original request actually succeeded, the retry must not create a second financial effect (for example, a duplicate charge or transfer).
2. **Rate limiting** — an operator's public API must be protected from abuse without blocking legitimate traffic.

Of these, only idempotency is a protocol integrity guarantee. Rate limiting is an operator operational concern.

---

## Decision

**Idempotency is a protocol invariant.** Every financial write MUST carry a caller-supplied `idempotency_key`. Re-submitting the same key MUST return the original result without creating a duplicate effect; the same key submitted with a different request body MUST be rejected with `409 Conflict`, and MUST NOT be silently served the first response. This is `INV-IDEM-001` (see `contracts/invariants.json`).

**Rate limiting is an operator operational concern, not a protocol invariant.** The protocol defines only the observable error contract: an operator that applies a limit returns `429 RATE_LIMITED`. The limit values, the counting algorithm, and the enforcement window are operator implementation choices; the protocol does not prescribe them.

**Implementation technology is left to operators.** The protocol does not prescribe a storage engine, a service topology, TTL values, or a fail-open/fail-closed policy for any operational cache. An operator may implement idempotency and rate limiting with whatever technology satisfies the invariant above (see `docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md`).

---

## Behaviour the protocol requires

Idempotency is observable at the API boundary regardless of how an operator implements it:

```
Financial write arrives with idempotency_key = <key>
  │
  ├─ key seen before, same request body
  │     → return the original result (replay-safe; no new effect)
  │
  ├─ key seen before, different request body
  │     → 409 Conflict (never silently serve the first response)
  │
  └─ key not seen before
        → process once, record the key with its result
```

The uniqueness guarantee MUST be durable: it cannot depend on an optional caching layer being available. An operator's authoritative store (for example, a uniqueness constraint on `idempotency_key`) is what enforces `INV-IDEM-001`; any fast operational cache in front of it is an optimisation, not the guarantee.

Federation extends this with `INV-FED-IDEM-001`: cross-operator routing keys (`routing_request_id`) are globally unique across all operators and all time.

---

## Rationale

### Why idempotency is a protocol invariant

Retries are unavoidable in distributed payments: a caller that does not receive a response cannot know whether the write succeeded. Without a replay-safe key, the only safe retry is no retry — which makes transient failures indistinguishable from real ones and pushes double-charge risk onto every integrator. Making idempotency a protocol requirement lets any caller retry safely against any operator, which is exactly the kind of cross-operator guarantee the protocol exists to provide.

### Why the same key with a different body is a conflict, not a replay

An idempotency key identifies one intended operation. If the body differs, the caller is describing a different operation under a reused key — returning the first response would hide a client bug and could mask a genuinely different second intent. Rejecting with `409 Conflict` surfaces the mismatch instead of silently discarding it.

### Why rate limiting is not a protocol invariant

Rate limiting protects an operator's own infrastructure; it does not affect the correctness, auditability, or reconcilability of the ledger. Two operators with different limits are equally conformant. The protocol therefore fixes only the observable error shape (`429 RATE_LIMITED`) so integrators can handle throttling uniformly, and leaves the policy to each operator.

### Why the protocol does not prescribe implementation technology

Operator neutrality is an architectural invariant of BANZA: the protocol must be implementable on any language, storage engine, or runtime that satisfies its invariants. Prescribing a specific cache, service topology, TTL, or numeric limit would bind the protocol to one operator's stack and add nothing to the integrity guarantee. The guarantee is the invariant; the mechanism is the operator's.

---

## Consequences

**Positive:**
- Double-charge prevention on retries is a uniform, protocol-level guarantee that any integrator can rely on across operators.
- Operators remain free to choose storage, topology, and limits appropriate to their scale without diverging from the protocol.
- Throttling is handled uniformly by integrators via the fixed `429 RATE_LIMITED` contract.

**Negative:**
- Idempotency is only as strong as an operator's durable uniqueness guarantee; an operator that enforces the key only in a volatile cache does not satisfy `INV-IDEM-001`. Conformance evidence must demonstrate the durable guarantee.
- Because the protocol does not prescribe rate-limit values, callers cannot assume a specific limit and must handle `429` responses defensively.

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Leave idempotency entirely to operators (no invariant) | Removes the cross-operator retry-safety guarantee that integrators depend on |
| Make idempotency best-effort (cache-only, no durable guarantee) | A cache loss would reintroduce duplicate effects; weakens a critical invariant |
| Silently replay the first response on a body mismatch | Hides client bugs and can mask a genuinely different second intent |
| Make rate limiting a protocol invariant with fixed limits | Rate limits are an operator infrastructure concern; fixing them would bind the protocol to one operator's scale |
| Prescribe a specific storage engine or service topology | Violates operator neutrality; the invariant, not the mechanism, is what the protocol guarantees |
