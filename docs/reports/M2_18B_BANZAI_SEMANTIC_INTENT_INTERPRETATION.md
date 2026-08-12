# M2.18B — BanzAI Semantic Intent Interpretation

**Status:** IMPLEMENTED, flag-gated (`BANZAI_INTENT_INTERPRETER`, default OFF) · awaiting live activation
+ eval + live QA. **M2.18 as a whole is NOT complete** (Phase 2 subphase M2.18B; M2.18C/D remain).
**Branch:** `feat/m2-18b-banzai-semantic-intent-interpretation-2026-07` · **Rollback ref:** `15ad29c`.

## 1. Objective
Put the local Qwen at the FRONT of the pipeline to interpret a natural-language question into a
validated, versioned structured intent BEFORE any broad documentary retrieval — while exact identifiers
and protocol boundaries keep the deterministic fast-path. **O Qwen compreende a pergunta; o Rust
confirma o que ela significa para o protocolo.** Operational rule: no broad retrieval starts before a
valid `IntentEnvelope` exists.

## 2. Baseline (before M2.18B)
`15ad29c` on main (M2.18 Phase 1 live). Live precondition capture: `/operators`=`[]`, `/operador-zero`
=410, resolver-first live (`ADR 002`→ADR-002, no CLAUDE.md). Failing case that motivates the phase:
**"explica a decisão sobre nomes" → `grounded:false, sources:[]`** ("Não encontrei uma fonte
específica") — keyword retrieval cannot map the paraphrase to ADR-002.

## 3. Architecture (this phase)
`Pergunta → fast-path (id exacto / fronteira / artefacto inequívoco) → [se necessário] Qwen
interpretação → IntentEnvelope v1 → validação (Rust) → resolver Rust → {entidade confirmada |
candidatos→esclarecimento | unsupported | boundary}`. The input Qwen never answers the user.

## 4–16. What was built
- **IntentEnvelope v1 + validator** (Rust `intent.rs`): 18 intents, entity types, operations; enum +
  range + coherence checks; `deny_unknown_fields`. WASM `validate_intent_envelope_json`. 9 unit tests.
- **Interpreter prompt** (Rust `prompt.rs::build_interpretation_prompt`, WASM export): JSON-only,
  enum-constrained, does-not-answer, injection-defended, with positive/negative examples. Rust owns it.
- **Resolver confirmation** (WASM `confirm_entity_json` → docref): the Qwen proposes a canonical id;
  Rust confirms ADR/RFC exactly; other types / unknown ids → `confirmed:false` (never fabricated).
- **Interpreter client** (`interpret.js`): build prompt → `provider.interpret()` → extract JSON →
  validate → ONE controlled repair → safe fallback. Returns `{envelope|null, trace}`.
- **Provider** (`provider.js::interpret`): a separate, temperature-0, short-token, own-timeout model
  turn; local endpoint stays on-host; counted like `answer()`.
- **Pipeline wiring** (`pipeline.js`, flag-gated): deterministic fast-path (safety/boundary/exact id /
  structured document_id / journey) bypasses the interpreter; natural language → interpret → route:
  boundary→safe refusal (no retrieval), ambiguity→clarify (never silent), unsupported→scope, confirmed
  entity→hand id to the existing M2.10A path, else seed retrieval with the normalized query; interpreter
  failure→deterministic doc probe then clarify (never raw broad retrieval).
- **Traces** (PART 17): `fast_path_used`, `intent_interpreter_called`, `interpreter_status`,
  `repair_attempted`, `interpreter_latency_ms`, `interpreter_model`, `intent`, `confidence`,
  `routing_result`, `fallback_used` — threaded into `docMeta`. No prompt / internal content exposed.
- **Latency/safety** (PART 15/18): compact prompt, temp 0, `BANZAI_INTERPRETER_TIMEOUT_MS` (20s),
  no documents in interpretation; question/system/context/artifact separated; enums fixed in Rust.

## 17–20. Tests
`services/banzai-api/test/m2-18b-semantic-intent.test.js` (11): extractJson; interpret ok / repaired /
invalid / failed; pipeline fast-path (no interpreter), paraphrase→resolved document, ambiguity→clarify,
boundary→safe refusal, unsupported→scope, interpreter-failure→fallback clarification. Rust `intent.rs`
contract tests (9). All green. Flag-OFF regression: full node suite unchanged.

## 21. Evaluation
`services/banzai-api/eval/m2-18b-intent-interpretation.dataset.json` (24 cases: identifiers, paraphrase,
implicit, follow_up, compare, ambiguity, boundary, unsupported, mixed_language, typos) + thresholds
(intent≥0.85, entity≥0.85, clarification≥0.8, silent-selection=0, invalid≤0.05, boundary-recall=1.0,
fast-path≥0.25, p95≤12s). Harness `eval/run-m2-18b-eval.mjs` runs it LIVE (`BASE=… node …`). Runs after
activation; must PASS before M2.18B is declared complete.

## 22–24. Docs · SVG · Guard
- Doc §8 in `docs/governance/BANZAI_INTENT_FIRST_GROUNDED_REASONING.md` + public BanzAI note.
- `docs/diagrams/banzai-intent-first-grounded-reasoning.svg` (fast-path → Qwen → envelope → validation →
  resolver → outcomes; later phases dashed). Passes svg-visual-quality.
- `make banzai-semantic-intent-interpretation-check` (self-testing, comment-aware) + CI job.

## 25. Local battery (green)
cargo 42 lib (9 intent) + 111 route, fmt+clippy clean, WASM rebuilt (validate/confirm/interpret-prompt
exports smoke-tested); node **249** (11 new); guards banzai-semantic-intent-interpretation +
banzai-intent-first + qwen-routing + action-boundary + svg-visual-quality + identity + purity + rust-rule
— all green.

## 26. Functional QA (local, mock interpreter)
Fast-path exact id → no interpreter. Paraphrase → interpreted → resolver-confirmed document. Ambiguity →
clarification (never silent). Boundary → safe refusal, no retrieval. Unsupported → scope. Invalid output
→ fallback clarification (no raw retrieval). Interpreter never produces a factual answer; no broad
retrieval without a valid contract; no entity accepted without Rust confirmation.

## 28–33. CI · deploy · activation · live QA (2026-07-25)
- **CI + merge:** PR #173 (implementation) CI 141/141 → merged `e8fb11e`. PR #174 (compose passthrough
  for `BANZAI_INTENT_INTERPRETER`, default OFF) CI 141/141 → merged `bd73f41`. Only block on both:
  REVIEW_REQUIRED (admin-squash-merged, the established pattern).
- **Deploy (flag OFF):** banzai-api rebuilt on the VPS at `e8fb11e`→`bd73f41`, container healthy. Zero
  live behaviour change (Phase-1 preserved) — the safe default landed in production.
- **Activation attempt + live QA:** set `BANZAI_INTENT_INTERPRETER=1` + recreated (container env
  confirmed `=1`). Live probes surfaced **two blockers to the completion gate**:
  1. **Trace not observable.** `server.js` emits a fixed allowlist of response fields; the M2.18B
     interpreter-trace fields (`intent_interpreter_called`, `fast_path_used`, `interpreter_status`,
     `routing_result`, …) are NOT in it, so the trace is invisible in `/ask` and the eval harness (which
     reads the response) cannot measure — PART 17 + PART 21 cannot be satisfied as shipped.
  2. **Interpreter reliability on the 4B model.** Live, "fala da ADR sobre nomes" hit the safe
     *fallback* clarification (the interpreter did not return a valid-contract envelope) and "explica a
     decisão sobre nomes" still returned no_source — the input Qwen (qwen3-4b) did not reliably produce
     valid IntentEnvelope JSON / map the paraphrase to ADR-002. No regression (both are ≤ the Phase-1
     result), but the eval thresholds are not demonstrably met.
- **Rollback (executed):** `BANZAI_INTENT_INTERPRETER=0` + recreated; Phase-1 verified live (`me fala
  sobre a ADR 002` → ADR-002, no CLAUDE.md). **Production is back on the proven Phase-1 spine.**

## Follow-ups required before re-activation (small, scoped)
1. Surface the interpreter-trace fields in the `server.js` `/ask` response (top-level, like
   `resolved_document_id`), so PART 17 is observable and `run-m2-18b-eval.mjs` can measure.
2. With the trace observable, run the eval harness live; tune the interpreter prompt / repair (and/or a
   larger/again-benchmarked model) until the thresholds hold — then re-activate.

## Limitations
- Grounded output-Qwen synthesis from a full FactualPackage (M2.18C), the final factual validator, long
  conversational state (M2.18D), the integral golden suite and the human eval remain.
- The interpreter adds a second local-model turn on the natural-language path (not the queued Tier 5);
  bounded by its own timeout + fallback. Load behaviour is observed at activation.

## Rollback
Set `BANZAI_INTENT_INTERPRETER=0` in the VPS runtime `.env` and restart banzai-api (instant, no rebuild)
→ Phase-1 behaviour. Full rollback: redeploy the pre-M2.18B image; branch ref `15ad29c`.

## Verdict
_To fill only after all evidence (eval PASS + live QA) — never in advance. M2.18 is NOT complete._
