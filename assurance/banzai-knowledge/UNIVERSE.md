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
| BANZA_NORMATIVE | 32 |
| BANZA_CANONICAL | 5 |
| RUNTIME_TRUTH | 7 |
| DOMAIN | 50 |
| HYBRID | 9 |
| CAPABILITY | 25 |
| **total** | **128** |

`universe_hash` **a5133aebd2302727e96560391a606278** · `corpus_hash` **081e6274bc73ade97d72fbc22684f7e3**
· 412 corpus items.

## Granularity decisions, made from the registry rather than from difficulty

**Invariants are units by FAMILY, not by id.** The registry holds 55 `critical` invariants across 12
families. A reader asks "what are the ledger invariants?"; nobody asks about INV-LEDGER-003 by number.
An individual id is an artifact identifier and the family is the fact BanzAI serves. Each unit records
its members, so the mapping back to the registry stays exact. This was decided from the registry's
shape before any benchmark existed — not after finding which ids were awkward to probe.

**Hybrid relations are declared, not Cartesian.** Nine relations exist where BANZA genuinely has a
position on the concept. Generating 50 concepts × every relation would manufacture a denominator nobody
could satisfy and that nothing in the protocol asks for.

**Capabilities are units.** Factual coverage can be complete while the engine remains unable to use the
facts. Each capability declares a positive owner, a negative owner and a mutation owner; one with a
missing owner is reported UNOWNED by the guard rather than omitted from the count.

## The closed-world guard

`services/banzai-api/test/semantic-universe-closure.test.js` fails when an eligible unit has no
coverage, a critical capability has no owner, a corpus item names no unit, a corpus item names a unit
that does not exist, a normative unit has no authority, a domain unit has no source, or the corpus was
generated from a different universe than the one on disk.

It also refuses to pass vacuously: a generator returning nothing would satisfy every other assertion,
so the unit count, the declared totals and the per-class counts are asserted first.

Five mutations, each proven to go red for its own reason and restored green:

| mutation | red for |
|---|---|
| U1 · an eligible unit with no benchmark mapping | coverage |
| U2 · every mapping stripped from one critical unit | coverage |
| U4 · authority source removed from a normative unit | authority |
| U5 · mutation owner removed from a critical capability | ownership |
| U-hash · corpus generated from a different universe | binding |

## What the guard does not assert at zero

Reader-facing entries that map to no declared unit are **counted and pinned**, not asserted at zero.
The mapping is by authority, and a number of entries describe the repository's own tooling — CI, guards,
crates, the indexer — resting on sources no protocol unit names. They are legitimately reader-facing and
legitimately outside the protocol's semantic universe. The count is pinned so a NEW orphan is visible;
it is not zero, and claiming it were would be false.
