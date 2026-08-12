// canonical-checks.mjs — the ONE shared expectation evaluator for the canonical eval (Increment 7, §19-§20).
//
// Both the generator (gen-canonical-eval.mjs, which KEEPS only cases whose expectation the committed engine
// confirms) and the metrics harness (canonical-metrics.mjs, which SCORES the frozen expectations against the
// engine) import this module, so the two never drift: on HEAD they agree (100% / zero-tolerance = 0); a
// future engine regression makes the frozen expectations mismatch → the harness accuracy drops below its
// floor (and the generator would drop the case, tripping the count/drift gate). It asserts engine OUTPUT vs
// expectation ONLY — it re-implements NO engine logic. It drives the committed Rust WASM through the existing
// knowledge.js wrappers (RUST_WRAPPER_ONLY, pg-free): resolveQuery / resolveScope / planTools /
// resolveOperationalMetric / resolveReferences / explainReasonCode / contextualFallback / verifyClaims /
// buildFactualPackagePlanned / buildOperationalPackage. Deterministic; NO model call, NO network.

import {
  resolveQuery,
  resolveScope,
  planTools,
  resolveOperationalMetric,
  resolveReferences,
  explainReasonCode,
  contextualFallback,
  verifyClaims,
  buildFactualPackagePlanned,
  buildOperationalPackage,
} from "../src/knowledge.js";

// The eleven mandated accuracy metrics (§20).
export const ACC_METRICS = [
  "intent_accuracy",
  "entity_resolution_accuracy",
  "artifact_resolution_accuracy",
  "tool_selection_accuracy",
  "metric_resolution_accuracy",
  "aggregation_accuracy",
  "citation_precision",
  "claim_support_rate",
  "honest_fallback_accuracy",
  "multi_turn_context_accuracy",
  "calculation_accuracy",
];

// The eight zero-tolerance counters (§20) — every one MUST be 0.
export const ZT_COUNTERS = [
  "wrong_entity_rate",
  "wrong_artifact_rate",
  "unsupported_claim_rate",
  "fabricated_metric_rate",
  "mixed_incompatible_executions",
  "single_observation_presented_as_average",
  "dead_source_citations",
  "llm_authoritative_decisions",
];

const eqArr = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
const kindsOf = (q) => (planTools(q).steps || []).map((s) => s.kind);
// A metric value fabricated out of thin air would surface as a numeric field on the operational decision.
// The deterministic resolver carries ONLY strings/bools + a number-free honest_fallback, so this is 0 by
// construction; we still probe it structurally (any numeric own-value on the decision = fabrication).
const hasFabricatedNumber = (op) =>
  Object.entries(op).some(([k, v]) => k !== "schema_version" && typeof v === "number");

// evaluate(c) → { dims, zt } where every entry is true/false/0/1 (or null = not-applicable-to-this-case).
// dims feed the accuracy metrics (numerator/denominator); zt feed the hard-0 counters (1 = violation).
export function evaluate(c) {
  const dims = Object.fromEntries(ACC_METRICS.map((m) => [m, null]));
  const zt = Object.fromEntries(ZT_COUNTERS.map((m) => [m, null]));

  // llm_authoritative_decisions — the whole harness is deterministic Rust (no model). We PROVE it per case:
  // the primary resolver is run twice and must be byte-identical (a model in the loop would be stochastic).
  const twice = (fn) => {
    const a = JSON.stringify(fn());
    const b = JSON.stringify(fn());
    return a === b;
  };

  if (c.kind === "multiturn") {
    zt.llm_authoritative_decisions = twice(() => resolveReferences(c.query, c.prior || {})) ? 0 : 1;
    const r = resolveReferences(c.query, c.prior || {});
    const e = c.expect || {};
    let ok = true;
    if (e.resolution_state !== undefined) ok = ok && r.resolution_state === e.resolution_state;
    if (e.referent_kind !== undefined) ok = ok && r.referent_kind === e.referent_kind;
    if (e.resolved_intent !== undefined) ok = ok && r.resolved_intent === e.resolved_intent;
    if (e.execution_id !== undefined) ok = ok && r.execution_id === e.execution_id;
    if (e.artifact !== undefined) ok = ok && r.artifact === e.artifact;
    if (e.boundary_detected !== undefined) ok = ok && Boolean(r.boundary_detected) === e.boundary_detected;
    if (e.requires_clarification !== undefined) ok = ok && Boolean(r.requires_clarification) === e.requires_clarification;
    if (e.comparison_targets !== undefined) ok = ok && eqArr(r.comparison_targets, e.comparison_targets);
    // SAFETY golden rule: a boundary follow-up must never be rewritten into a benign action.
    if (e.query_unchanged) ok = ok && r.resolved_query === c.query;
    dims.multi_turn_context_accuracy = ok;
    return { dims, zt };
  }

  if (c.kind === "claim") {
    // Documentary claim/citation verification (§8/§9). build the ONE package, then verify a composed output.
    const b = c.build;
    const pkg = buildFactualPackagePlanned("canon", b.pkg_query, b.pkg_entity || "", b.depth || "brief");
    zt.llm_authoritative_decisions = twice(() => verifyClaims(pkg, b.output)) ? 0 : 1;
    const v = verifyClaims(pkg, b.output);
    if (b.adversarial === "unsupported") {
      // an ungrounded claim MUST be blocked and named.
      zt.unsupported_claim_rate = v.ok || !(v.unsupported_claims || []).length ? 1 : 0;
    } else if (b.adversarial === "dead_citation") {
      // an invented citation MUST be rejected and named.
      const named = (v.dead_citations || []).includes(b.dead_id);
      zt.dead_source_citations = v.ok || !named ? 1 : 0;
    } else {
      // a grounded claim citing an allowed source: precision (no dead citation, verdict ok) + support.
      const cat = ((v.classified || [])[0] || {}).category;
      dims.citation_precision = Boolean(v.ok) && (v.dead_citations || []).length === 0;
      dims.claim_support_rate = Boolean(v.ok) && (cat === "SUPPORTED" || cat === "DERIVED");
    }
    return { dims, zt };
  }

  if (c.kind === "calc") {
    // Operational DERIVED-calculation exposure (§8) + BZO-9 single-observation-as-average (zero-tolerance).
    const b = c.build;
    const pkg = buildOperationalPackage("canon", b.pkg_query, b.duration, b.claims, b.sources);
    zt.llm_authoritative_decisions = twice(() => verifyClaims(pkg, b.output)) ? 0 : 1;
    const v = verifyClaims(pkg, b.output);
    if (b.adversarial === "single_obs_avg") {
      zt.single_observation_presented_as_average =
        v.ok || !(v.single_observation_as_average || []).length ? 1 : 0;
    } else {
      // a real average over ≥2 comparable runs, with a fully-exposed calculation, must pass + expose fields.
      const calc = (pkg.calculations || [])[0] || {};
      const exposed = ["data", "formula", "method", "filters", "period"].every((f) => calc[f]) &&
        calc.sample_size >= 2;
      const sizeOk = b.expect_sample_size === undefined || pkg.sample_size === b.expect_sample_size;
      const aggOk = b.expect_aggregation === undefined || pkg.aggregation_method === b.expect_aggregation;
      dims.calculation_accuracy = Boolean(v.ok) && exposed && sizeOk && aggOk;
    }
    return { dims, zt };
  }

  // kind === "resolve" — the documentary / operational / artifact / boundary / negative / reason families.
  const e = c.expect || {};
  zt.llm_authoritative_decisions = twice(() => resolveQuery(c.query)) ? 0 : 1;

  if (e.primary_intent !== undefined) {
    const r = resolveQuery(c.query);
    let ok = r.primary_intent === e.primary_intent;
    if (e.sub_intents !== undefined) ok = ok && eqArr(r.sub_intents, e.sub_intents);
    if (e.reason_code !== undefined) {
      // reason-code understanding: the named code must resolve from the registry (reason.rs).
      const rc = explainReasonCode(c.query);
      ok = ok && Boolean(rc.found) && rc.code === e.reason_code;
    }
    dims.intent_accuracy = ok;
  }

  if (e.entity_id !== undefined) {
    const s = resolveScope(c.query);
    dims.entity_resolution_accuracy = s.entity_id === e.entity_id;
    // wrong_entity = resolved a DIFFERENT non-empty entity (a miss/empty is an accuracy gap, not a wrong).
    zt.wrong_entity_rate = s.entity_id !== "" && s.entity_id !== e.entity_id ? 1 : 0;
  }

  if (e.doc_entities !== undefined) {
    const r = resolveQuery(c.query);
    const got = new Set(r.entities || []);
    const ok = e.doc_entities.every((d) => got.has(d));
    // fold document-reference resolution into the same entity metric.
    dims.entity_resolution_accuracy = dims.entity_resolution_accuracy === null ? ok : dims.entity_resolution_accuracy && ok;
  }

  if (e.artifact_type !== undefined) {
    const s = resolveScope(c.query);
    dims.artifact_resolution_accuracy = s.artifact_type === e.artifact_type;
    // wrong_artifact = resolved a DIFFERENT concrete artifact than expected.
    zt.wrong_artifact_rate =
      s.artifact_type !== "none" && s.artifact_type !== "" && s.artifact_type !== e.artifact_type ? 1 : 0;
    if (e.requires_live_tool !== undefined) {
      dims.artifact_resolution_accuracy =
        dims.artifact_resolution_accuracy && Boolean(s.requires_live_tool) === e.requires_live_tool;
    }
  }

  if (e.tool_kinds !== undefined) {
    dims.tool_selection_accuracy = eqArr(kindsOf(c.query), e.tool_kinds);
  }

  if (e.is_operational !== undefined || e.metric !== undefined) {
    const op = resolveOperationalMetric(c.query);
    let ok = true;
    if (e.is_operational !== undefined) ok = ok && Boolean(op.is_operational) === e.is_operational;
    if (e.metric !== undefined) ok = ok && op.metric === e.metric;
    dims.metric_resolution_accuracy = ok;
    if (e.aggregation !== undefined) dims.aggregation_accuracy = op.aggregation === e.aggregation;
    // fabricated_metric — a live-data metric must NEVER materialize a number without telemetry.
    if (e.metric !== undefined && Boolean(op.requires_live_data)) {
      zt.fabricated_metric_rate = hasFabricatedNumber(op) ? 1 : 0;
    }
  }

  if (e.fallback_kind !== undefined) {
    dims.honest_fallback_accuracy = contextualFallback(c.query, e.situation || "").kind === e.fallback_kind;
  }

  // mixed_incompatible_executions — a cross-profile/env comparison must keep operands SEPARATE
  // (COMPARE_EXECUTIONS), never merge them into one average/median metric.
  if (c.probe === "mixed_exec") {
    const op = resolveOperationalMetric(c.query);
    const ks = kindsOf(c.query);
    const merged = op.aggregation === "average" || op.aggregation === "median";
    const kept = ks.includes("COMPARE_EXECUTIONS");
    zt.mixed_incompatible_executions = merged || !kept ? 1 : 0;
  }

  return { dims, zt };
}
