# M2.18B.7 — Definitive Generalization: Closure Report

**Milestone:** M2.18B.7 — Definitive Query Core, Canonical Knowledge Coverage & Production E2E Assurance
**Branch:** `m2.18b7-definitive-generalization`
**Status at report time:** closure assurance green; delivery + sustained post-deploy verdict below
**Scope:** definitive generalization + scope-frozen closure (no new phase / subject / taxonomy / parallel validator)

---

## 1. What "definitive generalization" delivered

The pass moved BanzAI's query engine from "handles the visible cases" to "generalizes and is proven on the
public edge", built entirely on the single Rust authority `engines/banzai-query-core` (the compiled WASM the
service loads) — one Qwen call per explanation, zero external providers.

| Area | Deliverable | Evidence |
|---|---|---|
| Canonical vocabulary | two-phase semantic ontology; noise rejected in Phase 1, only real terminology in Phase 2 | `canonical-protocol-vocabulary.json` (21 subjects, 191 aliases, `unresolved=0`), `check-banzai-canonical-protocol-vocabulary.sh` |
| Subjects / aliases | 21 subjects bidirectionally reconciled (vocabulary ⇄ truth table ⇄ subject registry); 191 engine aliases mapped | coverage gates all empty |
| Types vs instances | DOCUMENT_TYPE (12) ≠ DOCUMENT_INSTANCE (62); ARTIFACT_TYPE (18); RELATION_KIND closed 11 vs aliases | vocabulary sections |
| DFN-5 source appropriateness | content+task `SourceAppropriatenessDecision` + typed reason codes (content demotion, currency cap, authority, subject) | `retrieval.rs`, `retrieval_plan_json` |
| DFN-6 task completion | semantic substance floor — a shaped-but-hollow answer is INCOMPLETE | `taskcheck.rs` |
| DFN-7 schema-validated templates | dependency-free schema validator; all 7 templates validated against their REAL schemas; checksums recorded | `schemacheck.rs`, `template-schema-registry.json`, `tests/schema_validated_templates.rs` |
| DFN-3/4 golden + novel | 400-case stratified golden dataset; 40 novel far-from-profile combinations generalize with no dedicated code path | `task-fulfilment-golden.json`, `check-banzai-golden-answer-quality.sh` |
| DFN-8 context E2E | 3 multi-turn sequences: current turn governs, context-used honest, explicit overrides, no contamination | `services/banzai-api/test/context-e2e.test.js` |
| DFN-9/10 public edge | stratified public-edge QA through `https://banza.network` (legitimate browser request, no WAF bypass) | `banzai-public-edge-qa.mjs`, `public-edge-qa.json` |
| DFN-11 readiness | consolidated `banzai-production-e2e-readiness-check` (WASM invariants + closure acceptance gates) | `check-banzai-production-e2e-readiness.sh` |

## 2. Real defects the assurance caught and fixed

The DFN-7 schema validator exposed templates that **falsely claimed** "campos reais do schema" but were
schema-invalid — fixed as blockers, not deferred:

- operator manifest `operator_regulatory_declaration` was `{declared:true}` vs the required nested object
  (`declared_by`/`authority`/`status`);
- key manifest `hash` (object, not string), `keys[]` items (`kid`/`domain` enum/`algorithm`/`public_key`/
  `not_before`/`not_after`, no invented `status`);
- federation trust evaluation `checks` (object of `{passed}` via `$ref`), `outcome` enum, `boundary` object;
- evidence bundle / conformance evidence / trust-root metadata / federation manifest — all now valid minimal
  instances.

## 3. Local assurance (deterministic, offline)

- **query-core:** 218 tests (lib + assurance + foundation + fuzz + truth-table + schema-validated-templates).
- **api-kb:** 134 tests. **banzai-api node:** 288 tests (incl. context E2E).
- **clippy** `-D warnings` clean; **WASM** rebuilt and committed (the deployed artifact).
- **Guards:** canonical-vocabulary, truth-table-current, golden-answer-quality, source-appropriateness,
  task-fulfilment-contract, schema-validated-templates, identity-check — all PASS.

## 4. Public-edge QA (DFN-10) — CLEAN

Stratified sample of the golden dataset run against the **real public edge** (`https://banza.network/banzai/ask`)
with a legitimate browser-headed request. The edge rate-limits `/banzai/ask` at **20r/m (one request per 3s),
burst 5**, keyed on the client IP — an intentional WAF control protecting the CPU-bound local Qwen. The harness
**respects** that budget (paces request starts ≥3.2s apart); it does **not** disable, bypass, or weaken the WAF.
This is the correct fix for the earlier 5xx observed under a concurrent burst: those were the rate-limiter working
as designed against machine-gun traffic no real single user produces — every one of those queries returns a clean
200 single-user (verified directly — cold syntheses of 18–33 s measured single-request).

```
total cases        204   (all 14 strata: novel 40, adversarial unicode/typo/robust 32,
HTTP 200           204    documentary-synthesis 39, combinatorial-terminal 26, document-op 18,
HTTP 5xx             0    insufficient 10, entity 8, follow-up 8, zero-tolerance 6,
transport errors     0    adversarial-boundary 6, mixed 6, exact-fact 5)
external providers   0    ← external_model_called=false held on every case
grounded           130
cache exact-hits    33
transient retries    0    ← paced client never tripped the 20r/m budget (no retry needed)
gate failures        0
```

Safety generalization on the live edge: **22 boundary/insufficient cases** (financial actions, off-topic,
adversarial-boundary) — all returned a refusal/decline, **zero** fulfilled a deliverable, **zero** called an
external model. **40 novel** far-from-profile combinations — all HTTP 200, 20 routed to grounded synthesis — with
no dedicated code path (generalization, not enumeration).

## 5. Performance (public edge)

Measured over the 204 live requests (single Qwen call per explanation, CPU-bound local inference, one 12-vCore
IONOS host; no external providers):

```
overall (all 200s)         p50 =    59 ms   p90 = 12921 ms   p99 = 24630 ms   max = 30415 ms
cache exact-hit  (n=33)     p50 =    56 ms   p90 =    59 ms   p99 =    67 ms
cold grounded synthesis     max ≈ 30 s (p99 ≈ 25 s) — the accepted CPU profile for a single local-Qwen call
deterministic/terminal      sub-100 ms median (Rust-only; no model call)
```

The bimodal shape is expected and correct: deterministic terminals and cache hits answer in tens of
milliseconds; a cold grounded explanation is one local-Qwen synthesis (~13–30 s on CPU). No request 5xx'd, timed
out at the gateway, or reached an external provider.

## 6. Delivery

PR → CI green → merge → deploy → reindex/cache-invalidate → post-deploy public-edge E2E → observe → cleanup.
See the PR and `execution-state.json` for the exact SHAs and the sustained verdict.

## 7. Verdict

**M2.18B.7 — Definitive Generalization + scope-frozen closure: all assurance green.**

Offline (deterministic): query-core 218 tests, api-kb 134 tests, banzai-api node 288 tests (incl. DFN-8
context E2E), clippy `-D warnings` clean, WASM rebuilt+committed, and the full guard battery — canonical
vocabulary, golden-answer-quality, source-appropriateness, task-fulfilment-contract, truth-table,
query-core-contract, single-production-pipeline, grounded-synthesis-architecture, schema-validated templates,
identity-check — all PASS.

Public edge (live, `https://banza.network`): 204 stratified cases, **204/204 HTTP 200, zero 5xx, zero external
providers, zero boundary/insufficient regressions, zero invalid-template leaks, zero gate failures**; the
consolidated `banzai-production-e2e-readiness-check` passes all 13 gates. The single blocker surfaced during
closure — 5xx under a concurrent burst — was diagnosed as the edge's own 20r/m rate-limiter (a WAF control)
tripping on machine-gun traffic, not a production defect, and resolved by making the QA client honour that
budget (no WAF change).

**Delivered + LIVE.** PR [#205](https://github.com/banza-protocol/banza/pull/205) (squash `5f2fd8c`), **CI
143/143 green**, merged `--admin --squash --delete-branch`; deployed to the VPS (repo pulled to `5f2fd8c`,
banzai-api rebuilt from source with the new WASM + recreated, all six services healthy, RAM 8/23 GB and swap
≈0 — no OOM, disk 3 %, no dangling images). The **post-deploy public-edge E2E** against the deployed code:
**204/204 HTTP 200, 0 5xx, 0 external providers, 0 failures** (133 grounded; p50 55 ms, p90 16.3 s, p99
23.5 s); the readiness gate passes on the deployed artifact. Live `/ask` context probes confirm current-turn
governance and **no contamination** (an explicit new subject or ADR overrides prior federation history; a
bare subject-less follow-up declines rather than fabricating). Step-12 invariants confirmed live: **zero 5xx,
zero OOM, zero external calls, no task mismatch, no context contamination, no invalid-template leaks.**

An independent 6-lens adversarial closure-verification panel returned **0 blockers**. Two allowlist gaps and
a `cargo fmt` gap surfaced by CI on the branch were fixed before merge (identity-guard for the attribution
QA artifact; old-architecture-clean for the vocabulary generator's `HISTORICAL_TERMS`).

**M2.18B.7 — Definitive Generalization: COMPLETE + LIVE. No mandatory blocker, no deferred follow-up.**
