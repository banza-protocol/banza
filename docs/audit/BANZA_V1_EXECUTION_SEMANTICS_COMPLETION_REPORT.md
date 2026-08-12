# BANZA v1.0.0 — Execution Semantics & Protocol Contract Completion

> Closes the two remaining clean-room blockers left by
> [`BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md`](BANZA_V1_NORMATIVE_REMEDIATION_REPORT.md): **X-04**
> (reason codes) and **X-05** (idempotency). This is the end of the normative-completeness phase.

| | |
|---|---|
| Branch | `protocol/banza-v1-execution-semantics-completion` |
| Base | `faabf7e` — the HEAD of the remediation branch. **PR #1 had not been merged when this milestone began**, so per §1 the work was stacked on it rather than rebuilt |
| Protocol version | **1.0.0 — unchanged** |
| Deploy | **None.** No deploy was performed and no public surface was republished |
| Whitepaper | **Untouched**, by design |

---

## 1. Executive summary

Two blockers are closed, and both were narrower than the original audit recorded — but one contained a
worse problem than the audit had found.

**X-04 was not "no taxonomy exists".** Five vocabularies were already closed. The real gap was that
**three vocabularies existed only in the Rust**: the 13 `trust_status` values, the 27 artifact-fetch
reason codes, and the engine-status → step-status mapping. `trust_status` is the field the entire trust
verdict rests on, and no contract mentioned it. A clean-room implementation could not have produced or
interpreted a single one of these values.

**X-05 was not "no rule exists".** `INV-IDEM-001` already carried the invariant *and* the conflict rule.
Three questions were genuinely open — key scope, retention, and what "a different body" means — and a
clean-room implementation could answer none of them.

Both are now published, machine-readable, vector-backed and guarded. The final **delete-the-Rust** test
passes on all seventeen capabilities, and the clean-room package has **no remaining normative blockers**.

**Verdict: READY FOR INDEPENDENT CLEAN-ROOM IMPLEMENTATION TEST.**

## 2. Scope

Every rule was classified before it was written (§5 of the milestone):

| Rule | Classification |
|---|---|
| `trust_status`, fetch reason codes, `failed_checks` | PROTOCOL NORMATIVE |
| Journey step status, engine-status mapping | PROFILE NORMATIVE (the validation journey) |
| Operator write-path idempotency (scope, identity, retry, conflict, retention, concurrency) | PROTOCOL NORMATIVE |
| Cross-operator routing idempotency | PROTOCOL NORMATIVE (already invariant-backed) |
| Webhook/event deduplication | PROFILE NORMATIVE (already specified) |
| Settlement finality, clearing, ledger, scheme declines, regulatory determinations, operator policy | **OUT OF SCOPE — unchanged** |

Nothing was added because a criticism suggested it. No payment state machine, no settlement engine, no
universal error taxonomy, no universal idempotency semantics.

## 3. X-04 — before

| Vocabulary | Where it lived | Closed? |
|---|---|---|
| Certification reason codes (18) | `certification-record.production.schema.json` | closed |
| Revocation entry reasons (7) | `revocation-entry.production.schema.json` | closed |
| Root revocation reasons (4) | `root-revocation.production.schema.json` | closed |
| BRL reasons (2) | `contracts/federation/revocation-list.json` | closed |
| Routing rejection codes (8) | `contracts/federation/federation-routing.json` | closed |
| OTE check ids (13) | `contracts/federation/federation-trust.json` | closed |
| **`trust_status` (13)** | **`engines/banza-trust/src/evaluate.rs`** | **code only** |
| **Fetch reason codes (27)** | **`engines/banza-artifact-fetcher/src/types.rs`** | **code only** |
| **Engine-status → step-status map** | **`engines/banza-target-registry/src/verdict.rs`** | **code only** |
| `failed_checks` | `federation-trust-evaluation…json` | `array<string>`, free |
| `reason_codes` (journey, operation) | the two receipt schemas | `array<string>`, free |

## 4. X-04 — decision (ADR-083)

**Core registry with a reserved extension namespace, five vocabularies kept separate.**

1. **A status decides; a reason code explains.** Not a new rule — it is what `verdict.rs` already did,
   deriving reason codes *from* the engine status. Stating it makes everything else follow.
2. **Five vocabularies, never one enum.** Merging a trust status, a fetch failure, a step status and a
   check identifier would make each less precise and would invite the universal-taxonomy expansion the
   milestone forbids.
3. **Closed enums stay closed.** `trust_status`, step status and `failed_checks` are decisional; a value
   outside them is schema-invalid.
4. **`failed_checks` references the existing check-id registry** rather than defining a second one.
5. **Extensions are `x-vendor.code`.** Core codes contain no `.`, so collision is impossible by
   construction.
6. **Unknown core-shaped codes are preserved, never rejected** — adding a code is backward compatible
   under ADR-081.

## 5. Reason-code model

| Vocabulary | Values | Closed | Scope |
|---|---|---|---|
| `trust_status` | 13 | yes | PROTOCOL |
| `fetch_reason_codes` | 27 | core closed, extensible | PROTOCOL |
| `journey_step_status` | 4 | yes | PROFILE |
| `engine_status_by_step` | 6 steps + 2 rule-based | yes | PROFILE |
| `failed_checks` | the 13 published check ids | yes | PROTOCOL |

Published in [`spec/reason-codes.md`](../../spec/reason-codes.md) and
[`contracts/production/reason-code-registry.production.json`](../../contracts/production/reason-code-registry.production.json)
(`banza-reason-codes/1`).

**Unknown-code handling** (§6 of the spec):

| Case | Behaviour |
|---|---|
| Core-shaped, unregistered | preserve, record, never verdict-affecting, never rejected |
| Extension `x-vendor.…` | preserve, never interpret |
| Anything outside a closed enum field | schema-invalid |

The asymmetry is deliberate: tolerating unknown *explanations* keeps additions backward compatible;
refusing unknown *decisions* is the only safe response to a verdict you cannot read.

**Semantic equivalence** (§8) is now defined, closing the field-level half of F-07. Two receipts are
equivalent when decisional statuses, input digests, core reason-code *sets* and `failed_checks` sets all
match. Timestamps, durations, execution and trace identifiers, extension codes, prose and array ordering
MAY differ. Byte equality is explicitly **not** the definition.

**One latent defect recorded, not silently fixed:** `verdict.rs` maps `TRUST_INCOMPLETE`, which is not in
`STATUS_VALUES` and therefore cannot occur. Registered in the registry as a reference-implementation
defect, not as a protocol value.

## 6. X-04 — tests and evidence

- **21 public vectors** — `conformance/vectors/reason-codes.json`: unknown codes, valid and invalid
  extensions, duplicates, ordering, the `failed_checks` emptiness rule in both directions, closed-enum
  rejection, and four equivalence cases.
- **Engine implementation** — `engines/banza-trust/src/execution.rs`, whose header states it *implements*
  the specifications and does not define them.
- **Cross-implementation test** — `tests/execution_semantics_vectors.rs` runs the vectors against the
  engine and asserts **bidirectional parity**: the registry and the engine's `STATUS_VALUES` must be
  identical, in both directions, so neither can drift.
- **Guard** — `tools/check-execution-semantics.sh`, in `make` and in the `banza-trust` CI job, with a
  two-sided self-test on the parity detector.

## 7. X-05 — before

Published and normative already: `INV-IDEM-001` (invariant **and** the same-key-different-body 409 rule),
`INV-FED-004`, `INV-FED-IDEM-001`, `INV-COLLECTION-008`, the `rr-<uuid>` format stable across retries, and
webhook deduplication on `event.id`.

Genuinely open: **key scope** (answered for federation, unanswered for the write path), **retention**
(ADR-011 deliberately declines to prescribe TTL), and **what "a different body" means**.

Also found: `contracts/openapi/transfers.yaml` never declared the **409** that `INV-IDEM-001` requires.

## 8. X-05 — decision (ADR-084)

Published in [`spec/idempotency.md`](../../spec/idempotency.md). ADR-011 is extended, not replaced.

## 9. Idempotency scope

```
(receiving_implementation, authenticated_caller, operation, idempotency_key)
```

Neither wider nor narrower. Wider creates false conflicts across callers and operations; narrower lets the
same intent execute twice. `authenticated_caller` is what prevents one caller from probing or occupying
another's key space.

Cross-operator routing keeps its own rule: `routing_request_id` is globally unique, so its tuple
degenerates to the key alone.

## 10. Retention

**A 24-hour floor plus a mandatory declaration**, published as `idempotency.retention_seconds` in the
capabilities document (minimum `86400`).

This is recorded as a **normative decision, not a derivation**: no BANZA artifact bounds a retry horizon,
so there was nothing to derive from. The *structure* follows the pattern the protocol already uses
everywhere — the Key Manifest, the BRL and trust metadata each carry `expires_at` and a counterparty reads
it rather than assuming.

The floor exists only to exclude an implementation that forgets keys in minutes and silently double-posts.
The **declared** window, not the floor, is what a counterparty reasons about. ADR-011 is respected: no
storage engine, topology or maximum TTL is prescribed.

The honest consequence is stated rather than left to discovery: after the window the key is forgotten and
a late retry is a **new operation**.

## 11. Request identity

The **`BCJ/1` digest** of the request body with four categories of member removed:
`idempotency_key`; trace/correlation/request identifiers; client timestamps; `nonce`. The list is
exhaustive and closed.

Reusing `BCJ/1` was the point: raw byte comparison breaks a legitimate retry that re-serialised its JSON;
a vague semantic comparison lets a materially different request be served the first response. And it means
an implementation cannot hold two disagreeing notions of "the same document", because signatures, digests
and request identity all use one rule.

**Signatures are inside request identity.** Excluding them would let an attacker who can strip or replace
a signature reuse a victim's record. The cost — a client that re-signs a retry gets a 409 — is the safe
direction. Unknown members are inside too (`BCJ/1` P4), so an extension field cannot alter meaning while
keeping the digest.

A body `BCJ/1` rejects has **no** request identity and MUST be rejected before any idempotency processing.

## 12. Retry semantics

Same key, same scope, same digest: return the original result, perform nothing, preserve resource and
operation identity and terminal status. The response MAY be recomputed rather than replayed byte-for-byte
— it must be *semantically* the same result. If the original is still in progress, no second operation may
start, and the implementation must report neither success nor failure.

## 13. Conflict semantics

Same key, same scope, different digest → **409**. MUST NOT perform the new operation, MUST NOT return the
original result, MUST NOT modify the existing record, MUST NOT produce any other side effect. Fail-closed:
an implementation that cannot determine whether the digests match treats it as a conflict.

`transfers.yaml` now declares the 409 with an `IDEMPOTENCY_CONFLICT` example.

## 14. Concurrency

**Exactly one of two concurrent same-key requests performs the operation.** For the other, two shapes are
conformant: wait and replay, or reject as in-progress with no side effect. Forbidden: performing twice,
reporting success before a terminal state, or reporting a conflict when the digests are equal —
concurrency is not conflict.

Defining this prevents a race condition in one implementation from becoming accidental semantics for
everyone.

## 15. X-05 — tests and evidence

- **15 public vectors** — `conformance/vectors/idempotency.json`, covering replay with differing
  formatting and excluded members, conflict one minor unit apart, all three scope dimensions, retention
  inside and outside the window, a sub-floor declaration, signature and unknown-member sensitivity,
  `BCJ/1` rejection for P1 and P3, concurrency, in-progress, and the federation key.
- The **request-identity digests were computed by an implementation written from the specification text**,
  sharing no code with the engine; `execution_semantics_vectors.rs` asserts the engine reproduces all
  eight of them exactly, and that the engine's excluded-member list equals the published one.
- 11 unit tests in `execution.rs`.

## 16. Updated normative surface

| | Before | After |
|---|---|---|
| Artifacts | 138 | **143** |
| `tier: implementation` | 82 | **85** |
| `tier: conformance` | 51 | **53** |

Added: `spec/reason-codes.md`, `spec/idempotency.md`,
`contracts/production/reason-code-registry.production.json` (implementation);
`conformance/vectors/reason-codes.json`, `conformance/vectors/idempotency.json` (conformance).

Changed contracts, authority only — no wire shape altered: `failed_checks` became an enum of the 13
published check ids with `uniqueItems`; `reason_codes` on both receipt types gained the published grammar;
the capabilities document gained `idempotency.retention_seconds`; `transfers.yaml` gained the 409.

## 17. Delete-the-Rust — final assessment

Assume `engines/` does not exist. The team receives the manifest plus its 85 implementation and 53
conformance artifacts.

| Capability | Verdict |
|---|---|
| Protocol identity | **YES** |
| Normative surface | **YES** |
| Canonicalization | **YES** |
| Signing | **YES** |
| Hashing | **YES** |
| Discovery | **YES** |
| Identity / trust | **YES** |
| Revocation | **YES** |
| Profiles L0–L4 | **YES** |
| Relevant payment contracts | **YES** |
| **Reason-code semantics** | **YES** — was NO before this milestone |
| **Idempotency semantics** | **YES** — was NO before this milestone |
| Federation | **YES** |
| Routing conditions | **YES** |
| Evidence | **YES** |
| Receipts | **YES** |
| **Semantic equivalence** | **YES** — was NO before this milestone |

**17/17 YES. No verdict depends on knowledge obtainable only from the Rust.**

## 18. Protocol vs conformance framework — final reassessment

The criticism: *"BANZA is a conformance framework, not a protocol."*

Answered against evidence rather than assertion. A protocol needs published rules for what is exchanged,
how it is authenticated, what the outcomes mean, and what happens when a message repeats. Each is now
published:

| What a protocol needs | Published |
|---|---|
| Execution contracts | 4 operator-implemented OpenAPI surfaces; 24 domain schemas |
| Operations and their artifacts | payment intents, sessions, collections, transfers, QR, settlements, proofs |
| Byte-exact authentication | `spec/canonicalization.md` + 24 vectors + 12 real-signature vectors |
| Outcome semantics | `spec/reason-codes.md` + `banza-reason-codes/1` + 21 vectors |
| Idempotency where it is needed | `spec/idempotency.md` + 15 vectors |
| Discovery | `.well-known/banza`, published across 8 implementation-tier artifacts |
| Trust and revocation | Key Manifest, BRL, delegation, Model A |
| Profiles | L0–L4 |
| Federation and routing conditions | 13 OTE checks; routing contract; `rr-<uuid>` |
| Evidence and receipts | bundles, receipts, digests, semantic equivalence |
| Conformance | suites and vectors — *one part of the surface, not the whole of it* |

**Verdict: REFUTADA.**

The criticism's strongest technical support was that the protocol's most load-bearing rules lived in its
reference implementation. Two milestones ago that was true of canonicalization; one milestone ago it was
true of `trust_status` and the fetch reason codes. It is now true of nothing: the delete-the-Rust test
passes on every capability, including the three the criticism actually targeted.

What remains fair, and is not the same claim: BANZA's conformance surface is *more developed* than a
mature protocol's would typically be, because certification is one of its three layers by design. That is
an architectural choice (ADR-059, ADR-061), not a missing protocol.

**This refutation concerns the specification.** It does not assert that an independent implementation
exists — none does, and the Whitepaper's hedge on that point remains true and untouched.

## 19. Clean-room readiness

**READY FOR INDEPENDENT CLEAN-ROOM IMPLEMENTATION TEST.**

All ten original blockers are closed:

| | Blocker | Closed by |
|---|---|---|
| X-01 | Canonical byte form | `spec/canonicalization.md` (previous milestone) |
| X-02 | Index of the normative surface | the manifest (previous milestone) |
| X-03 | BCP 14 convention | `contracts/README.md` (previous milestone) |
| **X-04** | **Reason-code taxonomy** | **`spec/reason-codes.md` + registry + 21 vectors** |
| **X-05** | **Idempotency rule** | **`spec/idempotency.md` + 15 vectors** |
| **X-06** | **Semantic equivalence** | **`spec/reason-codes.md` §8 + 4 vectors** |
| X-07 | Resolvable source of truth | corrected and guarded (previous milestone) |
| X-08 | Cryptographic vectors | `conformance/vectors/trust-signing.json` (previous milestone) |
| X-09 | L4 profile content | see §20 — reclassified, not a blocker |
| X-10 | Trust-material distribution | see §20 — reclassified, not a blocker |

## 20. Remaining non-blocking work

Neither of these prevents an implementation from determining required behaviour, so neither is a blocker
(§37 of the milestone):

- **X-09 — L4 profile content.** L4 is external interoperability, which is out of scope for a v1.0.0
  clean-room test: L0–L3 are fully specified and are what the test exercises. A team can implement
  everything BANZA 1.0.0 requires without it.
- **X-10 / F-08 — trust material from a single canonical origin.** An availability and architecture
  question, not a specification gap. The rules for fetching, verifying and refusing trust material are
  fully published; what is not specified is an alternative distribution channel. An implementation can be
  written and can be correct without it.

Also non-blocking and recorded: the four federation contracts that cite a Draft RFC in `_authority` (a
naming defect — the rules themselves are in the contracts); the seven production schemas that declare
`_status: reference` while being implementation-tier (audit backlog P2-6); and the `TRUST_INCOMPLETE`
dead branch in `verdict.rs`.

## 21. Conclusion

**BANZA v1.0.0 NORMATIVE COMPLETENESS PHASE — COMPLETE.**

The specification is sufficiently complete to be submitted to an independent implementation. That is the
whole of the claim.

It does **not** mean production, certification, adoption, validated performance, real external
interoperability, or a demonstrated independent implementation. The next proof should not come from more
internal documentation. It should come from someone else's code.

---

## 22. Mandatory answers

**Q1 — Is BANZA still `protocol_version = 1.0.0`?** **SIM.** Unchanged, and no alternative is proposed
anywhere in this document.

**Q2 — Was X-04 resolved?** **SIM.**

**Q3 — What is the normative authority for reason codes?**
[`spec/reason-codes.md`](../../spec/reason-codes.md) for the rules, and
[`contracts/production/reason-code-registry.production.json`](../../contracts/production/reason-code-registry.production.json)
(`banza-reason-codes/1`) for the vocabularies. ADR-083 records the decision; neither is required reading to
implement.

**Q4 — Is `failed_checks` still a semantically free `array<string>`?** **NÃO.** It is an `enum` of the 13
check ids published in `contracts/federation/federation-trust.json`, with `uniqueItems`, an
ordering-insignificance rule, and an emptiness rule that is an iff against `outcome`.

**Q5 — Is `reason_codes` still open without namespace or registry?** **NÃO.** Both receipt schemas now
constrain items to the core grammar or the reserved `x-<vendor>.<code>` namespace, and reference the
registry. It remains *extensible* — deliberately — but no longer arbitrary.

**Q6 — Does an independent implementation know how to handle unknown reason codes?** **SIM.** Three cases,
each with required behaviour, in `spec/reason-codes.md` §6 and vectors RC-004, RC-005, RC-015, RC-016.

**Q7 — Was X-05 resolved?** **SIM.**

**Q8 — What is the normative scope of an idempotency key?**
`(receiving_implementation, authenticated_caller, operation, idempotency_key)`. For cross-operator routing
the key is globally unique, so the tuple degenerates to `routing_request_id` alone.

**Q9 — What is the retention rule?** At least **86400 seconds (24 h)** from terminal state, and the actual
window MUST be declared as `idempotency.retention_seconds` in the capabilities document. A counterparty
MUST NOT rely on a longer window than declared; an implementation MAY retain longer, MUST NOT retain less.
After the window the key is forgotten and a late retry is a new operation.

**Q10 — How does BANZA determine same request vs different request?** The **request identity digest**: the
`BCJ/1` digest (`spec/canonicalization.md` §5) of the body with `idempotency_key`, trace/correlation/request
identifiers, client timestamps and `nonce` removed. Equal digests → same request; different → conflict.

**Q11 — Is that comparison language-independent?** **SIM.** It is `BCJ/1`, a profile of RFC 8785 with
implementations in at least six languages, and the vectors' digests were produced by an implementation
written from the specification rather than by the engine.

**Q12 — How are concurrent requests with the same key handled?** Exactly one performs the operation. The
other either waits and replays, or is rejected as in-progress with no side effect. Performing twice,
reporting success before a terminal state, and reporting a conflict on equal digests are all forbidden.

**Q13 — Is any protocol operation's idempotency behaviour still implicit in code only?** **NÃO.**

**Q14 — Is any protocol reason code's semantics still in code only?** **NÃO.** The three code-only
vocabularies are published, and a bidirectional parity guard prevents either side from drifting.

**Q15 — Final delete-the-Rust test?** **PASS** — 17/17 capabilities YES.

**Q16 — "BANZA is only a conformance framework, not a protocol"?** **REFUTADA.** See §18. The criticism
rested on load-bearing rules living in the reference implementation; that is now true of nothing.

**Q17 — Any normative blockers remaining for a clean-room implementation?** **NÃO.** X-09 and X-10 are
reclassified as non-blocking with reasons (§20); the remaining items are naming and documentation defects
that do not prevent an implementation from determining required behaviour.

**Q18 — Is BANZA v1.0.0 ready?** **READY FOR INDEPENDENT CLEAN-ROOM IMPLEMENTATION TEST.**
