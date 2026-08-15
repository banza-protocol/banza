# BanzAI Canonical Eval — Count Reconciliation (Increment 7, §18)

One canonical, deduplicated suite reconciled against every pre-existing BanzAI eval dataset. Prior-suite counts are computed from their own sources (reproducible). No double-counting: the canonical suite counts each case once, by class, and does NOT sum the prior suites into its own total.

## Pre-existing suites (computed from source)

| suite | count | canonical class(es) | source |
|---|---|---|---|
| M2.18B.6 grounded-synthesis dataset (12 categories) | 701 | base, variation, negative, comparison→regression | `services/banzai-api/eval/grounded.dataset.json (total)` |
| BZC-4 cross-protocol resolution coverage (entity×artifact×lang×surface + neg + documental) | 1564 | live, negative | `services/banzai-api/eval/bzc-coverage.mjs (summary.metrics.total, runtime-computed = 1500 positive + 49 negative-entity + 15 documental)` |
| M2.18B.2 action-boundary dataset (boundary + informational) | 165 | negative | `services/banzai-api/eval/boundary.dataset.json (boundary_cases + informational_cases)` |
| M2.18B.5 typo / misspelling intent-recovery dataset | 248 | variation | `services/banzai-api/eval/typo-dataset.mjs (DATASET)` |
| M2.13C answer-quality regression matrix (inline arrays) | 172 | base, negative, variation | `services/banzai-api/eval/answer-quality-matrix.mjs (MANDATORY+DANGEROUS+AMBIGUOUS+ENGLISH+RANKING+FAMILIES.questions)` |
| Increment 6 multi-turn conversational context (behavioural guard) | 112 | multi_turn | `tools/check-banzai-multiturn-context.sh + engines/banzai-query-core/src/context.rs (112 conversations / 812 asserted turns — guard-only, no dataset file)` |

## Canonical suite — the six-way classification

Total: **2439** cases (floor 2250); 43 distinct human-authored semantic seeds.

| class | count | definition |
|---|---|---|
| base | 43 | base semantic cases — one canonical human-authored phrasing per meaning |
| variation | 590 | generated lexical variations — capitalization/punctuation/accent/whitespace + paraphrases of the base seeds (a capitalization/punctuation change is a VARIATION, never a new semantic case) |
| multi_turn | 61 | multi-turn conversations — anaphora resolved against the safe technical prior context |
| negative | 199 | negative cases — off-domain declines, non-entity guards, boundary refusals, and zero-tolerance adversarial probes |
| live | 1165 | live cases — implementation-scoped artifacts (entity×artifact) and operational metrics (metric×aggregation) that require the live tool / telemetry |
| regression | 381 | regression cases — documentary corpus coverage + grounded claim/calculation anchors that protect the prior grounded families |

## By family

concepts=624 · procedures=30 · security=14 · apis=32 · governance=23 · profiles=24 · duration=23 · metrics=76 · reason_codes=138 · diagnosis=16 · reproduction=14 · hypotheses=17 · comparison=23 · artifacts=1125 · multi_turn=61 · negative=199

## How 709 / 1564 / the new cases relate

- **709** — M2.18B.6 grounded-synthesis total (grounded.dataset.json). Subsumed by the canonical base + variation (grounded documentary families) and negative (boundary/adversarial/unsupported/ambiguity) classes.
- **1564** — BZC-4 resolution-coverage total (bzc-coverage.mjs = 1500 positive + 49 negative-entity + 15 documental). Subsumed by the canonical live (entity×artifact) and negative classes.
- **new cases** — The operational families (metrics, duration, diagnosis, reason_codes, reproduction, comparison-of-executions), the multi_turn class, and the zero-tolerance adversarial probes are ADDITIVE — they cover behaviours neither 709 nor 1564 measured. The canonical suite counts every case ONCE, by class; it does not add the prior suites' totals to its own.

