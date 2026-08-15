# BANZA v1.0.0 — Independent Implementation Trial Protocol

**Trial ID:** `banza-v1.0.0-l0-independent-trial-001`

This document is written **before** any external implementation exists. It fixes what is being tested,
what counts as a result, and what would make the result invalid — so that the answer cannot be shaped
after the fact by whoever is disappointed by it.

---

## 1. Objective

Answer one question:

> **Can a team that took no part in BANZA's development implement the BANZA v1.0.0 L0 profile from the
> frozen public package alone?**

Not "is BANZA good", not "is BANZA fast", not "does BANZA work". One profile, one package, one team,
one falsifiable question.

## 2. Scope

**In:** the L0 profile — Protocol Sandbox.

**Out:** L1, L2, L3, L4. A first trial that tried to demonstrate the whole protocol would demonstrate
nothing, because a failure anywhere would be unattributable. If L0 passes, later trials can extend
incrementally, each with its own frozen target and its own run.

## 3. Frozen target

The target is fixed by `TRIAL_MANIFEST.json` and does not move. It pins the protocol version, the
profile, the source commit, the Normative Manifest digest, the package file list with per-file digests,
and the package content-tree digest.

Everything the implementer is measured against is inside that package. Nothing outside it is a
requirement, including this repository.

## 4. Trial identity

A run is identified by the tuple: **trial ID + source commit + Normative Manifest digest + package
content-tree digest**. Any change to any element is a different run (§12), not a continuation of this
one.

## 5. Implementer qualification

The team completes `IMPLEMENTER_QUALIFICATION_FORM.md` **before** receiving the package. The claim
"independent external implementation" requires reasonable evidence that the team:

- took no part in BANZA's design;
- had no access to the reference implementation or the engines;
- had no access to Operator Zero's source, internal documents or private branches;
- received the same frozen public package as everyone else;
- implemented from that surface.

If any is untrue, the trial may still have technical value, but **the word "independent" is not
available** for describing it.

## 6. Isolation

Permitted and prohibited resources are listed in `ISOLATION_AND_PROHIBITED_SOURCES.md`. The short form:
public standards and ordinary development tooling are fine; anything derived from BANZA's own
implementation is not.

BANZA is not testing whether a team can reinvent cryptography or JSON parsing. It is testing whether the
**protocol** is implementable from what is published.

## 7. Stages

| Stage | What happens | Gate |
|---|---|---|
| 0 | Qualification form completed; package received; package digest verified by the team | digest matches |
| 1 | **BCJ/1 only.** No trust, no profiles, no downstream work | **stop gate — §8** |
| 2 | Remaining L0 obligations: capability matching, reason-code vocabulary, served operator manifest | all required cases |
| 3 | Adversarial set | no crash, deterministic |
| 4 | Implementation freeze (§10) | hashes recorded |
| 5 | Black-box comparison against the reference (§11) | discrepancies adjudicated |

## 8. First stop gate — BCJ/1

The canonical byte form is implemented and passed **before anything else**. Byte equality is the bar:
"semantically equivalent" is not a pass, because the bytes are what gets signed.

If BCJ/1 does not pass, the trial **stops**. The failure is classified as one of:

- `IMPLEMENTATION_BUG` — the specification determines the answer and the implementation got it wrong
- `SPECIFICATION_AMBIGUITY` — the specification admits both readings
- `VECTOR_DEFECT` — the vector's expected value is wrong
- `PACKAGE_DEFECT` — the package is missing or misstating something needed

Downstream work does not proceed over divergent canonical bytes. Everything downstream is computed from
them, so continuing would produce results that mean nothing.

## 9. Questions

Every question is recorded in the question ledger **before it is answered** (`QUESTION_LEDGER.json`),
in the team's own words, unedited afterwards.

Authors may answer in exactly two ways:

> **Existing rule** — "the answer is in artifact X, section Y."
>
> **Gap** — "the public specification does not currently determine this."

Never *"the reference implementation does X"*. Never *"the intended behaviour is…"* where that intent is
not in the frozen surface. An answer that supplies information the package does not contain has
converted the trial into a tutorial, and the result is no longer about the package.

Categories are closed: `CLARIFICATION`, `DISCOVERABILITY`, `AMBIGUITY`, `MISSING_RULE`, `CONFLICT`,
`VECTOR_GAP`, `TOOLING`. A `CLARIFICATION` is only available when the rule already exists and the answer
merely points at it. If new information is required, it is `MISSING_RULE`. If two authorities disagree,
it is `CONFLICT`. If two readings are both defensible, it is `AMBIGUITY`.

## 10. Implementation freeze

When the team declares the implementation complete, and **before any comparison with the reference**,
the following are recorded: implementation commit, archive content digest, dependency lock digest,
language and toolchain versions, environment, build command, test outputs, and the question ledger.

After that, no further edits to the external implementation count toward this run.

## 11. Black-box comparison

Only after the freeze. Where the external implementation and the reference differ, **difference is not
evidence that the external implementation is wrong**. The normative surface adjudicates, with three
possible outcomes:

- **External wrong** — the surface clearly determines the reference's behaviour;
- **Reference wrong** — the surface clearly determines the external behaviour; **the reference
  implementation is fixed**, and the specification is not changed to protect it;
- **Specification insufficient** — both readings are defensible; this is a finding about BANZA.

Operator Zero does not define BANZA (`ADR-035`). It can be wrong, and if it is, this trial is how we
find out.

## 12. No moving target

Once the external team starts, any change to a spec, contract, schema, registry, required vector,
profile semantic or capability semantic makes the current run `INTERRUPTED`. The procedure is: freeze
the run, document the finding, correct BANZA separately, produce a new source commit, produce a new
package digest, start a new run.

`main` may continue to receive unrelated development — the run is bound to a commit and a digest, so
later work cannot retroactively move it. What may not happen is presenting changed material to the team
inside a run that was frozen without it.

## 13. Result

Exactly one of:

| Result | Meaning |
|---|---|
| `PASS` | Every criterion in §14 satisfied |
| `FAIL` | The implementation did not meet the criteria, and the specification determined the answers |
| `SPECIFICATION_BLOCKED` | The team could not proceed because the public surface does not determine something required |
| `INVALID_TRIAL` | Isolation or independence was breached, or the target moved undetected |
| `INTERRUPTED` | The target changed mid-run, or the run stopped for reasons outside the experiment |

Not available: *mostly pass*, *provisional pass*, *partial success*, *effectively pass*, *close enough*.

## 14. PASS criteria — frozen

All thirteen, machine-checked where possible (`pass-fail-criteria.json`):

1. Independence qualification satisfied and recorded
2. Frozen package digest confirmed by the team before work began
3. BCJ/1 gate `PASS` — byte equality on every applicable vector
4. Every required L0 positive case passes
5. Every required L0 negative case passes
6. No unresolved `MISSING_RULE`
7. No unresolved `CONFLICT`
8. No unresolved material `AMBIGUITY`
9. Repeated execution is deterministic
10. Hostile inputs cause no crash, hang or panic
11. The external implementation was frozen before any reference comparison
12. Every discrepancy adjudicated against the normative surface, not against the reference
13. Evidence bundle complete per `schemas/evidence-bundle.schema.json`

## 15. Metrics — pre-registered

Recorded as observations, not scored: total elapsed time; BCJ/1 time; L0 time; total questions;
questions per category; blocking questions; artifacts most consulted; discoverability findings; tooling
findings; vector gaps; ambiguities.

There is no composite score. A number that combines "questions asked" with "hours spent" would let a bad
result be averaged into an acceptable one.

## 16. Evidence

The bundle is defined by `schemas/evidence-bundle.schema.json`. The question ledger is **primary
evidence**, not an appendix: resolved questions are not deleted, inconvenient questions are not
rewritten, and ambiguities, missing rules and navigation problems are not hidden. The point is to learn
whether the public surface works.

## 17. Confidentiality

The trial does not require publishing the external source. Public evidence (hashes, provenance, executed
tests, declarations, observations) is separable from confidential implementer material. Publication of
external code is not assumed and requires the team's own permission.

## 18. Claim policy

If and only if the result is `PASS`, the maximum claim is:

> An independent external implementation of the BANZA v1.0.0 L0 profile was demonstrated against a
> pre-registered public implementation package and test procedure.

Not available: BANZA fully independently implemented · production ready · L1–L4 demonstrated ·
end-to-end financial network demonstrated · scalability demonstrated · operational scheme demonstrated.

## 18a. What the rehearsal established

The harness was rehearsed before the trial with a **null adapter** — a program that implements nothing
and refuses every case. It is not an implementation and could never be presented as one; its purpose was
to execute the failure path before anyone relies on the success path.

Three things came out of it, and one of them matters methodologically:

- The stop rule fires. BCJ/1 failed, downstream gates were not run, and the result file said so.
- Every gate path executes and aggregates: capabilities 0/12, reason codes 0/21, manifest 0/4.
- **A program that refuses everything passes 9 of 24 BCJ/1 cases and 12 of 12 adversarial cases.**

That last number is the important one. Every negative case is satisfied by refusing, so negative results
in isolation demonstrate nothing at all. This is why the criteria require the positive cases *and* the
negative cases, and why "adversarial 12/12" must never be quoted on its own as evidence that something
was implemented. It is evidence only that nothing crashed.

## 19. Failure is a valid result

This experiment is not optimised for `PASS`. A `SPECIFICATION_BLOCKED` obtained honestly is worth more
than a `PASS` obtained by coaching, because the first tells us where the specification is thin and the
second tells us only that we are willing to help.

An experiment that cannot fail is not an experiment.
