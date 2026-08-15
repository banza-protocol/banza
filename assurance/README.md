# BANZA Layered Assurance

> **Non-normative.** Nothing in this directory imposes a requirement on an implementation. It records
> whether the requirements defined elsewhere have actually been demonstrated. What binds an
> implementation is identified by [`normative-manifest.json`](../contracts/production/normative-manifest.json).

## Why this exists

BANZA accumulated a large amount of green, and green became the answer to *is this correct?*

It is not one. Three defects found while completing the Root model make the point, and none of them was
caught by a test going red:

- `INV-ROOT-007` declared a three-authority threshold and the runtime anchored one key. Every test
  passed, because no test asked the question the invariant answered.
- A freshness test asserted that the Key Manifest did *not* declare `root_signatures` — pinning the exact
  spec/contract/implementation mismatch as if it were the requirement.
- A manifest carrying its own authority set was rejected, but because fields were added after signing.
  That is tamper detection. The property claimed was that a verifier refuses a self-supplied anchor.

The common shape is a layer certifying itself.

## The four principles this serves

**BANZA R²S²** — *Robust · Resilient · Secure · Simple* — declared in
[`principles.json`](principles.json) and decided in [ADR-040](../decisions/adr/ADR-040-r2s2-fundamental-principles.md).

Resilience carries its own boundary: it preserves safe operation and deterministic recovery under
failure; it never permits bypassing trust, authorization, integrity or any other protocol invariant
merely to remain available. Availability is the easiest property to buy with someone else's safety.

## The gates

Run `make assurance-check`. The gates are decided by the Rust engine in
[`engines/banza-assurance`](../engines/banza-assurance); Make only orchestrates.

| Gate | Question |
|---|---|
| **AG-0** | Is the required behaviour defined by the normative public surface? |
| **AG-1** | Can the protocol represent — and reject — the property on the wire? |
| **AG-2** | Does a conforming independent implementation know exactly what result is required? |
| **AG-3** | Does the implementation enforce it? |
| **AG-4** | Does it hold across state, persistence, restart and concurrency? |
| **AG-5** | What happens when a dependency or participant fails? |
| **AG-6** | Does it survive deliberate attempts to break it? |
| **AG-7** | Do all surfaces agree, and has the guard been proven able to fail? |
| **AG-8** | Could a clean-room team derive it without the engines, records or authors? |
| **AG-9** | Does every public claim match its evidence class? |
| **AG-10** | Is it ready to freeze? |

Three rules give them force:

1. **A green test is not evidence of a property if it can pass for a reason different from the property
   being claimed.** Where the distinction is material, the expected *reason* is asserted, not just the
   outcome.
2. **A higher gate never compensates for a lower one.** Once a gate fails, those above it report
   `BLOCKED` rather than a verdict. `AG-3` passing while `AG-0` fails would say the implementation
   enforces something the protocol never required.
3. **Counting is not passing.** Test counts and guard counts are observations.

Results are `PASS`, `FAIL`, `BLOCKED`, `NOT_APPLICABLE` or `NOT_RUN`. `NOT_APPLICABLE` requires a
rationale. There is no *mostly*, *effectively* or *good enough*.

## What is in here

| File | What it records |
|---|---|
| [`principles.json`](principles.json) | the four principles, and what is deliberately *not* one |
| [`properties.json`](properties.json) | each claimed property and the chain behind it |
| [`resilience-matrix.json`](resilience-matrix.json) | failure modes, blast radius and recovery, per component |
| [`semantic-closure.json`](semantic-closure.json) | which artifacts are required globally rather than by a profile |
| [`mutations.json`](mutations.json) | the violation each critical guard must go red under |

## Reading a property

A `null` link means *not applicable to this property*. An **empty list** means *applicable and absent* —
and for a `CRITICAL` property that is a failure, not a gap to be explained later. The distinction is the
point: "no adversarial test because there is no adversary" and "no adversarial test" must never look the
same in a registry.

Where a `CRITICAL` property currently carries `null` for a link, the reason is:

- **state test** — the property is decided by a pure function over supplied inputs and retains nothing
  between calls, so there is no state for a restart to lose. Where trusted state *does* exist, the link
  is present.
- **resilience test** — the property is a property of a document or a comparison, not of a running
  component, so no dependency can fail underneath it.
- **wire representation** — the property constrains the project's own surfaces rather than any artifact
  an implementation exchanges. `R2S2_PRINCIPLE_SET_IS_EXACTLY_FOUR` is the example: nothing about it
  crosses a wire.

## Mutation proofs

`make mutation-proofs`.

Every critical guard must demonstrate it can go red. A guard nobody has seen fail is an untested
assertion with a Makefile target, and the common failure of a guard is not being wrong but being
inert — matching nothing, scanning the wrong directory, asserting a condition that no longer exists.

Each mutation runs in a **throwaway git worktree** created from `HEAD` and removed afterwards. The
primary worktree is never mutated. Two safeguards protect the framework from certifying itself:

- the guard must be **green before** the mutation, or a red result proves nothing — a missing Makefile
  target produces red just as reliably as a violated property;
- the mutation must **actually change the tree**, or a stale pattern that matches nothing reads as a pass.

Both were added because both happened. The first caught a guard target that did not yet exist; the second
caught a mutation whose pattern had drifted, silently making the proof vacuous. A third finding came out
of the framework working as intended: the root guard did not protect genesis pinning at all, and the
trust-on-first-use test was demonstrating *a digest mismatch is rejected* while claiming *trust on first
use is refused*.

## What this cannot do

Independent external implementation cannot pass any gate here. Until a real external team implements
BANZA from the published surface alone, that property is `NOT_DEMONSTRATED`, and no amount of internal
assurance changes it.

The claim ladder is `SPECIFIED` → `IMPLEMENTED` → `INTERNALLY ASSURED` → `INDEPENDENTLY IMPLEMENTED` →
`OPERATIONALLY DEMONSTRATED`. No level may be skipped. Everything in this directory is evidence for the
third.
