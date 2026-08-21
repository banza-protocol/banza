# BanzAI knowledge & reasoning — final assurance report

Four read-only benchmarks against **live production**, one before the work and one after each
deployment. Every number here is recomputable from the runs beside this file.

## The four runs

| deployed | records | model | only ADR-001 | `answer_locale` absent | zero-source | p50 | p95 |
|---|---|---|---|---|---|---|---|
| `src-14df955` *(before)* | 62 | 18 | **9 of 18** | **18 of 18** | 29% | 1039 ms | 19605 ms |
| `src-2a01974` | 115 | 15 | 4 of 15 | 0 | 19% | 1136 ms | 18048 ms |
| `src-4238558` | 115 | 14 | 3 of 14 | 0 | 13% | 72 ms | 16798 ms |
| `src-acfba64` *(definitive)* | 115 | 12 | 2 of 12 | **0** | 13% | **61 ms** | 18028 ms |

Final latency by path: deterministic p50 59 ms / p95 126 ms (n=103); model p50 18.0 s / p95 22.5 s
(n=12). Model-use rate 10%. Non-200 responses: 0.

## What the before-state actually was

**Half of every model answer cited ADR-001 and nothing else.** That is what a subject that never
resolved looks like from outside: the question falls to grounding, no concept is fixed, the
FactualPackage is assembled from the generic protocol-identity entry, and the model is asked a
specific question with one general document in front of it.

It is where the false claims came from:

> `O BANZA exige um ledger?` — "não exige um ledger específico, pois os modelos subjacentes [...] não
> são comercialmente distintivos"

contradicting INV-LEDGER-001…005 and INV-WALLET-001, all severity `critical`, and ADR-012 — while the
corpus states the rule correctly in `financial-invariants`, an entry the question could not reach.

**`answer_locale` was absent on every model answer and present on every other terminal.** The website
accepts an absent declaration by design, so the locale gate closed in PR #37/#38 was enforced on every
path whose text is fixed and reviewed, and silent on the single path that composes free prose.

## What the production runs found that the local suites did not

Each deployment was followed by a full benchmark, and each benchmark found defects that a green local
suite had not.

| | found in | what it was |
|---|---|---|
| P0 | `2a01974` | an English follow-up answered in Portuguese, **declared English** — `localeMatches` compared declaration to request, they agreed, and the gate passed it |
| P0 | `2a01974` | `financial-authorization` returned the English placeholder — a code licence is not a financial authorisation |
| P1 | `2a01974` | **"Rust" corrected to "trust"** at high confidence, before any router saw the question |
| P1 | `2a01974` | `banza-limits` reached and then discarded by synthesis |
| P0 | `4238558` | `What is the difference between L2 and L3?` confabulated, citing reason-codes and root-authority ADRs |
| P0 | `4238558` | **the ledger claim survived in its follow-up form** — "Does BANZA require one?" |
| P0 | `acfba64` | `Qual é o limiar?` refused, one turn after the engine stated the 2-of-3 rule |

## Three things worth recording about the method

**A guard that could not fail.** The first version of the locale guard passed a context shape the
pipeline does not read. It never reached the path, and it survived a mutation that restored the entire
defect while reporting three green tests. It was caught only by running the mutation.

**A fix that nearly shipped a regression.** The first repair for `rust` declared it as a concept
*alias*, and that table is matched by substring — so `rust` matched inside `trust` and every trust
question resolved to the Rust-first ADR. The golden-answer guard caught it before merge, because it is
a generated artifact and regenerating it is part of changing routing.

**An oracle that scored a wrong answer as a pass.** The first scoring reported P0 100% on `4238558`.
Its per-question rules were applied only to single-turn questions, so journey turns were checked by
generic invariants alone — and multi-turn is exactly where anaphora lives. Strengthened to score every
turn, the same recorded run scored P0 96.3%. Nothing changed in production between those numbers.

## Method

Read-only: `POST /banzai/ask` only, paced at 3.4 s to stay under the edge limit of 20 r/m, no
destructive operation, no production patching. Every repair went through branch → PR → 307 CI checks →
7 required contexts → normal merge commit → post-merge **main** CI → controlled deployment of the one
changed service → re-benchmark. Every new guard was proven to go red on a reverted fix and green on
exact restore.

## Status

**BanzAI knowledge & reasoning: production-verified** at `src-acfba64` for the corpus in this
directory, at P0 98.1% · P1 100% · P2 100%, with the one remaining P0 closed by the change that
accompanies this report.

**BANZA protocol: PRE-PRODUCTION.** `protocol_frozen: false`, `l0_frozen: false`,
`independent_implementation_demonstrated: false`, `independent_trial_started: false`,
`production_certificates: false`. **AG-10: NOT_RUN.** Nothing in this work touches protocol semantics,
trust or governance, and none of it changes that status.

## Known limitations

- **Comparisons without a combined entry are not composed.** `clearing` and `settlement` each have an
  entry; their difference has none, and the question resolves to nothing rather than to one side.
- **140 of 178 deterministic entries still have no English realization.** The safety boundaries and
  core vocabulary carry English; the rest do not.
- **Follow-ups whose subject is implicit and not a trailing pro-form** are not resolved — "Isso
  significa consenso global?" refuses rather than inheriting the prior subject. Inheriting blindly
  would produce confident, off-target answers, which is the failure class this programme removed.
- The global unmatched-path 404 is untouched and remains open.
