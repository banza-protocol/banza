# The BanzAI semantic universe

## What the denominator is, and why it is not the test count

A coverage percentage means nothing without a denominator that exists independently of the thing being
measured. `215/215 entries bilingual` is a fact about serving artifacts. It is not knowledge coverage:
one entry can express several properties, several entries can express one, and a capability — comparing
two concepts, keeping a referent across turns — has no entry at all.

So the universe is derived from **authority and declared capability**, never from tests:

```
invariant registry + profile registry + lifecycle facts + DOMAIN registry + declared capabilities
        ↓
   semantic universe            (assurance/banzai-knowledge/semantic-universe.json)
        ↓
   coverage requirements
        ↓
   benchmark V2                 (assurance/banzai-knowledge/benchmark-v2.json)
```

Never the other way round. A universe read off the benchmark would make the benchmark self-defining,
and every number computed from it a tautology.

## Counts

| class | units |
|---|---|
| BANZA_NORMATIVE | 86 |
| BANZA_CANONICAL | 11 |
| BANZA_SUPPORTING | 3 |
| RUNTIME_TRUTH | 7 |
| REPO_TRUTH | 10 |
| DOMAIN | 50 |
| HYBRID | 9 |
| CAPABILITY | 27 |
| **total** | **203** |

`universe_hash` **bf1a472f7a99b68aa9df50021ca43b0e** · `corpus_hash` **ed36d4845054886d23fbf94a3933e0ea** · 572 corpus items.

### The superseded draft, kept as evidence

The first denominator — `a5133aebd2302727e96560391a606278`, 128 units, 412 items — did not survive its
own validity audit. It is preserved verbatim as `semantic-universe.v2-draft.json` and
`benchmark-v2.v2-draft.json` and is never silently rehashed: a hash that changes without leaving the old
one behind destroys the only record of what a past measurement measured.

Its production baseline was never completed. The run died at item 78 of 412 when an unrelated build
filled the disk, and the remaining scratch state was lost to a tmp sweep before it could be resumed.
Nothing was scored from it, and nothing should be: an audit had by then established that the
denominator itself was incomplete, so a number computed against it would have described the wrong
universe. This is recorded rather than quietly dropped.

## Granularity decisions, made from the registry rather than from difficulty

**Invariants are units at BOTH granularities.** The registry holds 55 `critical` invariants across 12
families. The earlier universe used the family alone, reasoning that a reader asks "what are the ledger
invariants?" and nobody asks for INV-LEDGER-003 by number. That is true about naming and irrelevant to
falsifiability, which is what a denominator has to track.

The atomicity audit (`invariant-atomicity.json`) read all 55 and asked of each: can this proposition be
true while a sibling in the same family is false? For all 55 the answer is yes — append-only and
integer-only are not one fact about ledgers, and an implementation can hold either while breaking the
other. A family unit therefore cannot detect that one member stopped being true, because an answer
naming any member satisfies it.

So both are units: the family for the reader's framing, the member for the proposition. The member
carries the direct question in both locales; the family carries the paraphrase.

**Hybrid relations are declared, not Cartesian.** Nine relations exist where BANZA genuinely has a
position on the concept. Generating 50 concepts × every relation would manufacture a denominator nobody
could satisfy and that nothing in the protocol asks for.

**Capabilities are units.** Factual coverage can be complete while the engine remains unable to use the
facts. Each capability declares a positive owner, a negative owner and a mutation owner; one with a
missing owner is reported UNOWNED by the guard rather than omitted from the count.

## The closed-world guard

`services/banzai-api/test/semantic-universe-closure.test.js` fails when an eligible unit has no
coverage, a critical capability has no owner, a corpus item names no unit, a corpus item names a unit
that does not exist, a normative unit has no authority, a domain unit has no source, a semantic id
appears twice, a conversational capability has no multi-turn journey, a journey turn asserts nothing,
or the corpus was generated from a different universe than the one on disk.

It also refuses to pass vacuously: a generator returning nothing would satisfy every other assertion,
so the unit count, the declared totals and the per-class counts are asserted first — for every class the
taxonomy declares, including the ones that are easy to leave empty.

| mutation | red for |
|---|---|
| U1 · an eligible unit with no benchmark mapping | coverage |
| U2 · every mapping stripped from one critical unit | coverage |
| U4 · authority source removed from a normative unit | authority |
| U5 · mutation owner removed from a critical capability | ownership |
| U-hash · corpus generated from a different universe | binding |
| O1 · a unit stops claiming its entries | closed world |
| O2 · a unit claims an entry that does not exist | ghost claim |
| O3 · one atomic invariant member removed, siblings kept | atomicity |
| O4 · the SUPPORTING class emptied | non-vacuity |
| O5 · a duplicated semantic id | uniqueness |

## Every reader-facing entry belongs to the universe

This section used to say the opposite, and the change is the substance of the audit.

The guard asserted `orphans.length <= 96`. The real count was 28. A bound sixty-eight above the truth is
not a ratchet, it is permission — sixty-eight entries could have stopped mapping to anything while the
suite stayed green. The pin was defended on the grounds that entries about the repository's own tooling
"legitimately rest on sources no protocol unit names", which is true about PROTOCOL authority and false
as an exemption: an entry about the repository's guards is still knowledge BanzAI serves, and knowledge
with no denominator to belong to is knowledge nothing measures.

All 28 were classified (`orphan-classification.json`). **None was legitimately outside.** Ten were
missing canonical or supporting units — conformance, PASS, evidence, the evidence bundle, the licence:
the L2 vocabulary the certification boundary rests on. Nine were repository truth with no class to live
in. Nine were behaviours belonging to capabilities that had never been declared at all, including the
action boundary, which is the engine's most safety-critical behaviour and was the one capability nobody
had written down.

The count is now **zero and asserted**. An entry joins the universe by one of three declared routes —
it answers a domain concept, it rests on a source some unit names, or a unit claims it by id — and
there is no fourth.

`BANZA_SUPPORTING` was likewise not legitimately empty. It had no generator path at all, and the
non-vacuity check omitted it from its own list of classes, so the hole was invisible from both sides.

## Conversations are exercised, not just declared

The draft corpus had 564 items and not one conversation. Eleven capabilities are claims about turn N
resolving against turn N-1, each owned by a unit test and none exercised against the deployed system.
Unit-test ownership shows the resolver works in-process; it cannot show that context survives the wire,
the server's field allowlist and the forward-context builder.

Eight multi-turn journeys now do, and every turn carries its own expectation — chosen to be
unsatisfiable without context, so that "qual é a diferença entre os dois?" cannot pass unless the prior
turns were actually carried.
