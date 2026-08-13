# ADR-024 — Idempotency

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

---

## Idempotency semantics: scope, retention and request identity

- **Status:** Accepted
- **Date:** 2026-08
- **Relates:** ADR-024 (idempotency invariant and rate limiting — extended, not replaced), ADR-010 (`BCJ/1`), ADR-009 (versioning)
- **Audit basis:** clean-room blocker **X-05**; audit finding **F-06**
- **Normative specification:** [`spec/idempotency.md`](../../spec/idempotency.md)
- **Invariants:** `INV-IDEM-001`, `INV-FED-004`, `INV-FED-IDEM-001`, `INV-COLLECTION-008`

## Context

The audit recorded idempotency as unspecified. The final verification pass of the remediation established
that this was wrong: `INV-IDEM-001` already carries the invariant *and* the conflict rule (same key with a
different body → 409, never silently serve the first response), `INV-FED-004` and `INV-FED-IDEM-001` cover
cross-operator routing, and `federation-routing.json` fixes the `rr-<uuid>` format as stable across
retries.

Three questions were genuinely open, and a clean-room implementation could not answer any of them:

1. **Scope** — what makes two keys the same key. `INV-FED-IDEM-001` answers it for federation (globally
   unique) and nothing answered it for the operator write path.
2. **Retention** — how long a key is remembered. ADR-024 states deliberately that the protocol does not
   prescribe TTL values. That protects operator neutrality, but it leaves two implementations able to
   conform while disagreeing about whether a retry is a replay or a new operation.
3. **"Different body"** — the conflict rule turns on a comparison that was never defined.

## Decision

### D-1 · Key scope is a four-part tuple

`(receiving_implementation, authenticated_caller, operation, idempotency_key)`.

Neither wider nor narrower. Wider creates false conflicts across callers and operations; narrower lets the
same intent execute twice. `authenticated_caller` is the component that prevents one caller from probing or
occupying another's key space.

Cross-operator routing keeps its own rule: `routing_request_id` is globally unique, so its tuple degenerates
to the key alone.

### D-2 · Request identity is the `BCJ/1` digest of the body, minus four excluded members

Reuse `BCJ/1` rather than define a second comparison. Raw HTTP byte comparison would break a legitimate
retry that re-serialised its JSON differently; a vague semantic comparison would let a materially different
request be served the first response. `BCJ/1` is insensitive to formatting and member order and sensitive
to every value.

Excluded: `idempotency_key`, trace/correlation/request identifiers, client timestamps, `nonce`. Everything
else is inside — including unknown members and **including any signature over the request**.

Including the signature is the conservative direction. Excluding it would let an attacker who can strip or
replace a signature reuse a victim's idempotency record. The cost is that a client which re-signs a retry
produces a 409; such a client must reuse its original signed request. A spurious conflict is safe; a
collapsed distinction is not.

### D-3 · Retention is a normative floor plus a mandatory declaration

At least **24 hours** from terminal state, and the actual window MUST be declared in the capabilities
document as `idempotency.retention_seconds`.

This is the decision that required a genuine choice rather than a derivation, and it is recorded as such:
no BANZA artifact bounds a retry horizon, so there was nothing to derive from. The structure follows the
pattern the protocol already uses everywhere else — the Key Manifest, the BRL and trust metadata each carry
`expires_at` and a counterparty reads it rather than assuming. Retention is declared the same way.

The floor exists only to exclude a degenerate implementation that forgets keys in minutes and silently
double-posts. The **declared** window, not the floor, is what a counterparty reasons about. Twenty-four
hours is the smallest period spanning a full operational day including an overnight incident and the
following reconciliation.

ADR-024 is respected: no storage engine, topology or maximum TTL is prescribed.

### D-4 · Concurrency has a normative observable behaviour, with two permitted shapes

Exactly one of two concurrent same-key requests performs the operation. The other either waits and replays
the result, or is rejected as in-progress with no side effect. Both are conformant; a caller must handle
either. What is forbidden is performing the operation twice, reporting success before a terminal state, or
reporting a conflict when the digests are equal.

Leaving this undefined would let a race condition in one implementation become accidental semantics for
every other.

## Alternatives considered

**A fixed protocol-wide TTL with no declaration.** Rejected: it contradicts ADR-024's explicit
non-prescription of TTL, and a counterparty still could not verify what an implementation actually does.

**Declaration with no floor.** Rejected: an implementation could declare 60 seconds and be conformant while
silently double-posting on any realistic retry.

**Compare raw request bytes.** Rejected: it breaks legitimate retries for reasons that have nothing to do
with the caller's intent.

**Compare a schema-aware "semantic" projection of the body.** Rejected: it requires a second comparison
rule per operation, and any field it ignored would become a place to smuggle a different request past the
conflict check.

**Exclude signatures from request identity.** Rejected on security grounds — see D-2.

**Define a universal idempotency semantics for all payment operations.** Rejected as out of scope. Where a
Layer-3 scheme defines its own rule, that rule is the scheme's; BANZA does not restate it.

## Consequences

- A clean-room implementation can determine replay, conflict, distinct-operation and rejection outcomes
  from published text alone.
- Request identity and signature verification now share one canonicalization, so an implementation cannot
  hold two disagreeing notions of "the same document".
- Implementations must publish `idempotency.retention_seconds`. The capabilities document already permits
  additional members, so this is additive.
- The honest consequence of expiry is stated in the specification rather than left to discovery: after the
  window, a key is forgotten and a late retry is a new operation.
- `protocol_version` does not change (ADR-009).

## Boundary

This ADR defines when a repeated request is the same request. It defines no payment state machine, no
settlement, clearing or ledger behaviour, and no scheme rule. It does not alter the security model:
idempotency and replay protection remain distinct properties (`spec/idempotency.md` §10).

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json)
- [`spec/idempotency.md`](../../spec/idempotency.md)
