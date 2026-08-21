# What the production runs found

Two full read-only benchmarks against **live production**, one before the repair and one after
deploying it. The corpus, both raw runs and the probe are beside this file; every number below is
recomputable from them.

## The two measurements that mattered

| | before `src-14df955` | after `src-2a01974` |
|---|---|---|
| records | 62 | 115 |
| model-answered | 18 (29%) | 15 (13%) |
| **model answers citing only ADR-001** | **9 of 18** | **4 of 15** |
| **`answer_locale` absent** | **18 of 18 model answers** | **0** |
| zero-source refusals | 18 (29%) | 22 (19%) |
| latency p50 / p95 | 1039 ms / 19605 ms | 1136 ms / 18048 ms |

**Half of every model answer cited ADR-001 and nothing else.** That is what a subject that never
resolved looks like from outside: the question falls to grounding, no concept is fixed, the
FactualPackage is assembled from the generic protocol-identity entry, and the model is asked a
specific question with one general document in front of it.

It is where the false claims came from. `O BANZA exige um ledger?` returned "não exige um ledger
específico, pois os modelos subjacentes [...] não são comercialmente distintivos" — contradicting six
`critical` invariants and the ADR that defines them, while `financial-invariants` states the rule
correctly and was never reached.

**`answer_locale` was absent on every model answer and present on every other terminal.** The website
accepts an absent declaration by design, so the locale gate was enforced on every path whose text is
fixed and reviewed, and silent on the single path that composes free prose.

## What the *post-deploy* run found that the local suites had not

The first run scored P0 94.4% · P1 97.7% · P2 100%. Its failures were not noise.

**A silent Portuguese fallback, declared English.** Journey J-EN-READY turn 2, the question
"Why not?", returned a paragraph of Portuguese stamped `answer_locale: "en"`. `localeMatches` compares
the declaration against the request; they agreed; the gate passed it. A false declaration is worse
than an absent one. Only a multi-turn journey reaches that path.

**"Rust" corrected to "trust" before any router saw the question.** At high confidence, in every
phrasing. Recovery runs above the router, so this did not degrade an answer — it replaced the
question. Production then answered "não é necessário usar **trust** para implementar BANZA". `rust` is
four characters; the vocabulary that decides *what a typo may be corrected to* admits only five or
more, and the same set was deciding *which words are known*.

**An entry reached and discarded.** `Uma implementação pode usar PostgreSQL?` resolved `banza-limits`
and handed it to synthesis, which dropped it, and the reader was told there was not enough public
evidence for a question the corpus answers outright.

**A comparison answered with one side.** `Qual é a diferença entre L2 e L3?` returned the L2
definition alone, `degraded: true`, presented as a complete answer. The English twin confabulated
instead, citing ADR-021 and ADR-039 — reason codes and root authority, neither about profiles.

## A guard that could not fail

The first version of the locale guard passed a context shape the pipeline does not read. It never
reached the clarification path, and it **survived a mutation that restored the entire defect** while
reporting three green tests.

It was caught only by running the mutation. It now threads the conversation the way `server.js`
threads it and asserts that the path was reached, because a guard that cannot fail is worse than no
guard and the two are indistinguishable from outside.

## Reproducing

```
node assurance/banzai-knowledge/probe.mjs assurance/banzai-knowledge/corpus.jsonl /tmp/run.jsonl
python3 assurance/banzai-knowledge/score.py /tmp/run.jsonl
```

`BANZAI_BASE` selects the target, `PACE_MS` the spacing. The probe is read-only, paced under the edge
limit, and resumes from a partial output file.
