# ADR-045 — Current-only canonical ADR tree

## Context

Architecture decision records accumulate. A decision is taken, later amended, later corrected, later
superseded — and the conventional practice is to keep every step, marked. After enough steps the
directory answers a question nobody asked (*how did we get here?*) far better than the one everybody
asks (*why is it like this?*), and a reader must reconstruct the current architecture by walking a
chain and inferring which links are still live.

The failure is not the storage. It is that a superseded record still reads as a decision. Someone will
implement from it.

## Decision

**The ADR tree contains only current decisions.** When a decision is replaced, the record is rewritten
or deleted — never marked superseded and kept. Numbering is contiguous from `ADR-001`, and IDs are
reassigned when the tree is reorganised.

Specifically:

- no superseded records, no amendment chains, no tombstones, no "historical" section;
- no permanent old→new ID map, no aliases, no redirect files;
- one decision per record, with records split or merged as the decisions themselves split or merge;
- the index lists exactly the tree.

Git holds the history. The directory holds the present.

## Rationale

The value of an ADR is that a new engineer can read why the architecture is what it is, and that a
maintainer can tell whether a decision still stands. Both are destroyed by supersession chains: the
first because the reader must filter, the second because "superseded" is a claim about a document
rather than about the architecture, and it drifts.

Reassigning IDs is the part that feels wrong and is not. A stable ID is only valuable if something
external depends on it; nothing normative does, because ADRs are not normative. What would depend on it
is history — and history is in Git, where it is more accurate than any map.

## Alternatives considered

**Keep superseded ADRs, marked.** The common practice. It preserves the reasoning trail inside the
directory, at the cost that every reader must establish which records are live. Rejected: the trail is
already in Git with authorship and dates, which is strictly better than a status line someone must
remember to update.

**Keep IDs stable forever, allowing gaps.** Avoids rewriting references. Rejected because gaps are a
supersession cemetery by another means — a missing number is a question, and answering it requires the
history the tree is supposed to have shed.

**Maintain an old→new map.** Helpful exactly once, during a renumbering, and misleading forever after:
it reintroduces the retired IDs into the present as permanently resolvable names.

## Consequences

- Reorganising the tree means rewriting every ADR reference across the repository in one mechanical
  pass, verified by a guard that resolves every referenced ID against the tree.
- A reader can trust that every record in the directory describes the current architecture.
- Recovering a retired decision requires Git. That is the intended cost.
- The guard derives contiguity and resolvability from the tree, never from a list of retired IDs — such
  a list becomes wrong the moment a number is reused.
