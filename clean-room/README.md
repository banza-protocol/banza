# Clean-Room Trials

An experiment, not a specification. Nothing in this directory imposes a requirement on anyone, and no
entry in the question ledger may be cited as a rule. The
[Normative Manifest](../contracts/production/normative-manifest.json) remains authoritative.

## What the experiment measures

Whether the published BANZA surface is sufficient for someone who has never seen the reference
implementation.

The measurement is the **questions**. Every question an implementer has to ask is a place where the
specification did not answer them, and counting those is the only honest way to find out whether the
surface is complete — a repository can convince itself of completeness indefinitely by reading its own
code when the specification runs out.

## The export packages

`packages/<level>/` is built by [`tools/gen-clean-room-package.py`](../tools/gen-clean-room-package.py)
from the Phase D implementation set for that profile.

Built by **positive allowlist**: a file is present only because something in the normative surface
requires it, with the reason recorded against every entry. Nothing is copied and then removed — a
subtractive export is one forgotten deletion away from leaking the reference implementation.

Deliberately excluded, and asserted by a guard rather than trusted: `engines/`, the demonstration
operator, ADRs, the README, internal reports, the Whitepaper, the assistant, tooling, fixtures, and
anything resembling a secret or runtime state.

**The assistant is not part of the trial.** It may be offered later as separate human help, but the
first trial has to establish that the package suffices without it. A package that needs an assistant
to be usable has not demonstrated implementation independence.

## The question ledger

`questions.jsonl` — one JSON object per line, conforming to
[`question-ledger.schema.json`](question-ledger.schema.json).

### Classifications

The set is **closed**. A question that seems to need a new category is a finding about the categories,
argued before or after a trial and never invented during one.

| Classification | Meaning | What it implies about the surface |
|---|---|---|
| `CLARIFICATION` | The answer is in the package; the implementer wanted confirmation | Nothing is wrong. Wording could be plainer |
| `DISCOVERABILITY` | The answer is in the package but was not found | The rule exists and is in the wrong place, or nothing points to it |
| `AMBIGUITY` | The text supports two readings, both defensible | The rule exists and does not say one thing |
| `MISSING_RULE` | The behaviour is required and the package does not state it | **The specification is incomplete.** The rule must be promoted to the normative surface |
| `CONFLICT` | Two artifacts in the package say different things | **The specification contradicts itself.** One of them is wrong |
| `VECTOR_GAP` | A rule exists with nothing to test it against | Conformance to that rule cannot be demonstrated |
| `TOOLING` | About running things, not about the protocol | Says nothing about the specification |

`MISSING_RULE` and `CONFLICT` assert a defect and carry the highest cost to resolve. Both should carry
a `classification_note` saying why not a neighbouring category — the boundary with `AMBIGUITY` and
`DISCOVERABILITY` is where classification goes wrong, and it goes wrong in the flattering direction.

### What a trial must not do

- **Do not lead the implementer.** Do not ask whether something bothered them, and do not tell them
  which parts we already suspect are weak. A question that arrives unprompted is evidence; a question
  produced by asking for it is not.
- **Do not rewrite the question.** It is recorded as asked. Turning it into what we think they meant
  destroys the observation.
- **Do not answer beyond the package** without recording that this is what happened. An answer that
  had to come from a person is a different result from one found in the material, and
  `answered_from_package_alone` is the field that says so.
- **Do not treat a second team as an independent sample** if they have seen the first team's findings.

### Open hypotheses being measured

Recorded so that a later result can be checked against what was expected, rather than explained after
the fact:

| Hypothesis | Measured by |
|---|---|
| The vector files state expected outcomes in seven different shapes. Does that heterogeneity actually cost an implementer anything? | `caused_by_vector_grammar`, which implementers are not told about. If no question is attributable to it, the migration cost of normalising is probably not worth paying |
| L0 is 11 artifacts. Is that navigable, or merely small? | The ratio of `DISCOVERABILITY` to `MISSING_RULE` |
| Is `docs/guides/implement-l0.md` used as a map, or read as the specification? | Whether questions cite the guide or the artifacts it points to |

## What a trial cannot establish

A trial run by anyone who has seen this repository is not a clean-room implementation. It can measure
whether the package is **complete and self-contained**; it cannot measure whether the specification is
learnable by someone without prior context, because the reader already has that context.

**No independent implementation of BANZA has been demonstrated.** Any rehearsal conducted inside this
environment is a *package completeness rehearsal*, and must be labelled as one.
