# BanzAI Knowledge & Reasoning — universe closure freeze

**Generation V2 is the canonical BanzAI Knowledge & Reasoning assurance generation.**

BanzAI Knowledge & Reasoning is universe-closed and production-verified against the declared frozen
semantic universe and V2 assurance corpus.

That sentence is the whole claim. It does not say that every possible natural-language phrasing is
guaranteed, that the BANZA protocol is production-ready, that AG-10 has run, that the protocol is
frozen, or that an independent implementation has been demonstrated. None of those are true, and none
of them follow from this work.

## Frozen generation

| | |
|---|---|
| semantic universe | `bf1a472f` — 203 units, 176 factual |
| V2 corpus | `d9084360` — 572 items, 596 turns |
| oracle | `score-v2.py` — semantic, independent of runtime claim validation |
| model | `local_qwen` |
| repository `main` | `e34f51e` |
| production runtime image | `banzai-api:src-dbc3f83` |

**The production image tag is `src-dbc3f83`, not `src-e34f51e`.** The runtime diff between `dbc3f83`
and `e34f51e` across `services/`, `engines/` and `website/` is **none** — PR #59 was evidence and
documentation only — so no redeployment was required and none was performed. `e34f51e` is the
repository state; `src-dbc3f83` is what is running.

Historical runs are not rewritten. The V2 corpus is not changed here, and the universe is not expanded
here. Any future semantic-universe expansion requires a new generation and a new baseline.

## Verified production result

Run from zero against live production at `src-dbc3f83`. Scored results in
`baseline/scored-src-dbc3f83-v2.json`.

| | |
|---|---|
| V2 requests | **572 / 572** |
| behavioral pass rate | **100%** |
| factual semantic units | **176 / 176** |
| P0 · P1 · P2 | **100% · 100% · 100%** |
| all declared knowledge classes | **100%** |
| conversational capabilities | **11 / 11** |
| conversational journeys | **8 / 8** |
| non-200 | 0 |
| timeouts | 0 |
| rate-limit retries | 0 |
| incorrect known-fact refusals | 0 |
| unsupported BANZA claims | 0 |
| model BANZA claims without grounding | 0 |
| critical source failures | 0 |
| locale failures | 0 |
| known property-level mutation survivors | 0 |

The 11 conversational capabilities are the ones flagged `conversational` in `capabilities.json`. Each
is exercised by at least one multi-turn journey turn in the frozen corpus — a claim about turn N
resolving against turn N−1 cannot be demonstrated by a single question — and all 8 journeys passed in
this run.

## The architecture, as it stands

```
semantic authority
  → semantic unit
    → required claims
      → claim-specific evidence requirements
        → AnswerObligationSet
          → obligations first in the system prompt
            → grounded generation
              → Rust semantic validation
                → at most one bounded semantic repair
                  → successful answer  |  subject-preserving fail-closed
```

Claims are not derived from benchmark ids. They are not exact response templates. They are
locale-independent semantic propositions, tied to semantic authority and to the evidence that may
support them, and they do not make the model authoritative — the model composes prose, and Rust decides
whether that prose discharged the obligation.

The V2 oracle remains independent of runtime claim validation. The runtime validator is Rust predicates;
the oracle is Python patterns written separately. They share the proposition and nothing else.

## Open characterised debt: BanzAI Terminal Semantics Honesty

104 of 596 turns in the final run were labelled `operational_failure` / `unresolved_subject` while the
delivered grounded answer was semantically correct.

This is **not** part of the closed Knowledge & Reasoning failure count. It is a metadata-honesty debt:
the content fulfils and the label under-claims. The count is identical across `src-478b70c`,
`src-008841a` and `src-dbc3f83`, so it is long-standing conservatism rather than anything this
generation introduced. Not fixed here.

## Open characterised limitation: Natural-Language Paraphrase Generalization

At least one natural novel phrasing outside the frozen V2 corpus still fails closed with
`synthesis_output_unvalidated` despite targeting a supported semantic area — *"Explique, para um leitor
técnico, de que maneira exacta um operador demonstra conformidade com o protocolo BANZA"* returns the
trunk definition, degraded and labelled.

Failing closed is the designed outcome. The coverage limit is real. The V2 corpus is **not** changed to
absorb this case retroactively; a future robustness generation may deliberately expand paraphrase
coverage.

## Observability limitation

Precise semantic-repair frequency could not be recovered from the final production corpus.
`claim_repair` is written to `routerTrace`, and the flat `/ask` envelope does not preserve it for the
measurement. The repair count is therefore **not** stated, and is not guessed.

What is defensible: 8 of 596 turns owed declared claims; 1 of those took the model path; therefore at
most one semantic repair could have occurred in that run. Cache-cold probing showed a first-pass
grounded model synthesis at roughly 15 s and the repair path at roughly 22 s.

This is an observability limitation, not a correctness failure.

## Performance

| path | n | p50 | p95 | max |
|---|---|---|---|---|
| deterministic | 565 | 59 ms | 100 ms | — |
| model | 31 | 14.75 s | 18.6 s | 22.8 s |

Model-use rate 5.2%. External model calls 0. Validated-cache hits 10. No precision beyond these
recorded measurements is claimed.

## Freeze rule for future engine changes

After this milestone, BanzAI Knowledge & Reasoning is not modified for proactive cleanup. A future
engine change requires at least one of:

- **A** — a demonstrated regression;
- **B** — a deliberate semantic-universe expansion;
- **C** — a deliberate new robustness / paraphrase assurance generation;
- **D** — explicit work on a characterised debt, such as terminal metadata honesty;
- **E** — a security or authority defect;
- **F** — a performance or reliability requirement approved as a new milestone.

Any runtime change must preserve the frozen V2 regression corpus.

## BANZA status, unchanged

**BANZA protocol: PRE-PRODUCTION. AG-10: NOT_RUN. Global unmatched-path 404: OPEN.**

Nothing in this programme touches protocol semantics, trust or governance, and nothing in it changes
those statuses.
