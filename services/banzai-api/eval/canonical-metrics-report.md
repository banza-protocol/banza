# BanzAI Canonical Eval — Metrics Report (Increment 7, §20)

- Schema version: 1
- Total cases: **2791** (floor 2500)
- Driver: committed Rust WASM (query-core) via canonical-checks.evaluate — hermetic, 0 model calls, 0 network
- Verdict: **PASS**

## Accuracy metrics

| metric | value | floor | applicable cases |
|---|---|---|---|
| intent_accuracy | 1.0000 | 1.00 | 2692 |
| entity_resolution_accuracy | 1.0000 | 1.00 | 1859 |
| artifact_resolution_accuracy | 1.0000 | 1.00 | 1125 |
| tool_selection_accuracy | 1.0000 | 1.00 | 2163 |
| metric_resolution_accuracy | 1.0000 | 1.00 | 1220 |
| aggregation_accuracy | 1.0000 | 1.00 | 56 |
| citation_precision | 1.0000 | 1.00 | 7 |
| claim_support_rate | 1.0000 | 1.00 | 7 |
| honest_fallback_accuracy | 1.0000 | 1.00 | 132 |
| multi_turn_context_accuracy | 1.0000 | 1.00 | 61 |
| calculation_accuracy | 1.0000 | 1.00 | 4 |

## Zero-tolerance counters (every one MUST be 0)

| counter | violations | applicable cases |
|---|---|---|
| wrong_entity_rate | 0 | 1143 |
| wrong_artifact_rate | 0 | 1125 |
| unsupported_claim_rate | 0 | 3 |
| fabricated_metric_rate | 0 | 95 |
| mixed_incompatible_executions | 0 | 4 |
| single_observation_presented_as_average | 0 | 3 |
| dead_source_citations | 0 | 3 |
| llm_authoritative_decisions | 0 | 2791 |

## Coverage

By class: base=46 · variation=643 · live=1165 · regression=677 · multi_turn=61 · negative=199

By family: concepts=958 · procedures=30 · security=14 · apis=32 · governance=41 · profiles=24 · duration=23 · metrics=76 · reason_codes=138 · diagnosis=16 · reproduction=14 · hypotheses=17 · comparison=23 · artifacts=1125 · multi_turn=61 · negative=199

