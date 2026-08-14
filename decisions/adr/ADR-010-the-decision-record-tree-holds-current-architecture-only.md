# ADR-010 — The decision-record tree holds current architecture only

## Context

Decision records accumulate. The usual discipline — never delete, mark the old one superseded, add a
record that amends it — produces an archive that is honest about the past and useless for the present.
A reader asking "how does BANZA authorise a root action?" finds three answers, two of them wrong, and
has to reconstruct chronology from record numbers to find out which is live.

That is a bad trade for an architecture meant to be read by someone implementing against it. They do not
need the sequence of decisions; they need the current one and the reason for it.

## Decision

**The tree holds only current decisions, and answers one question: why is BANZA designed this way?**

- No superseded records, no amendment chains, no tombstones, no historical sections. When a decision is
  replaced, its record is rewritten or deleted.
- One decision per record. Records split when the decisions split and merge when the decisions are
  inseparable — a test with a sharp edge: if one part can change without the other, they are two
  decisions.
- Numbering is contiguous from `ADR-001` and IDs are reassigned when the tree is reorganised. No
  permanent old-to-new map, no aliases, no redirect files.
- The index lists exactly the tree.
- No record is normative. Nothing here binds an implementation, and no rule may be discoverable only
  from a record — the delete-the-records test below.

**Delete-the-records test.** Conceptually remove the entire tree. An engineer with no prior context must
still be able to implement BANZA from the published normative surface alone: canonicalization, numeric
domain, wire messages, states, reason semantics, idempotency, profiles, capabilities, trust, the root
threshold, conformance, evidence and vectors. If any of those becomes undeterminable, the gap is in the
normative surface, and the fix is to publish the rule there — never to keep the record as a load-bearing
document.

Then conceptually restore the tree and ask the opposite question: is the architecture now easier to
understand? A record that does not improve understanding has no reason to exist.

## Rationale

History is already kept, completely and immutably, by version control. Keeping a second lossy copy in
the tree adds no information and costs every future reader the work of distinguishing it from the
present.

Renumbering is uncomfortable and correct while IDs are still development material. The alternative —
frozen numbers with gaps and out-of-order topics — trades a one-time cost for permanent unreadability.
That trade is worth taking exactly once, before the IDs become stable external references.

The delete-the-records test is what keeps the tree honest about being explanatory. Without it, a record
gradually becomes the only place a rule is written, and then it is a specification that nobody is
validating.

## Alternatives considered

**Immutable records with supersession, the conventional practice.** It is the right answer for a team
reconstructing its own reasoning, and the wrong one for a published architecture read mostly by
newcomers. Its cost falls on every future reader; its benefit is already provided by version control.

**Keep records but add a status field.** Rejected: a reader must then check a status before trusting any
statement, and a stale status is indistinguishable from a current one.

**No decision records at all.** Rejected — this is the add-the-records-back test failing. The normative
surface states what the rules are and deliberately never says why, so without the tree, every design
question becomes archaeology.

## Consequences

- A reader can trust every record in the tree without checking whether it is still live.
- Rewriting a record on change costs more than appending one, and that cost is paid by the small group
  making the change rather than by everyone reading it.
- Cross-references must be updated as a set whenever the tree is reorganised, which is why the
  reorganisation happens once and the IDs then freeze.
- A record that only restates a rule has nothing left to say, and is removed.

---

## Normative authority

The decision above is explanatory, and this record is deliberately the strongest case of it: the tree it
governs binds nothing. What binds an implementation is the surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
