// Increment 4 (§7–§9) — the transversal FactualPackage + claim/citation verification.
//
// Proves, end to end over the REAL Rust engines (no real model, no network):
//   §7  the ONE FactualPackage is BUILT BEFORE any linguistic synthesis and carries the transversal
//       provenance (resolution + sub-intents + tool plan + freshness; and, on the operational path,
//       tool_results + calculations + sample_size + aggregation_method), surfaced compactly in /ask meta;
//   §8  the 5-category claim taxonomy (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED) with
//       its label / derivation / causality / single-observation rules;
//   §9  the claim + citation verifier runs on the composed answer BEFORE it is returned — an unsupported
//       claim or a dead/invented citation is NEVER published (the turn degrades to the safe fallback);
//       the reproduced BZO-8/9 duration answers still work and now flow through the same package;
//       a boundary question never reaches synthesis and carries no package.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";
import { runGroundedSynthesis } from "../src/grounded-synthesis.js";
import { buildFactualPackagePlanned, buildOperationalPackage, verifyClaims } from "../src/knowledge.js";

const FIXED_LIST_FRAGMENT = "Posso responder, com base nas fontes do protocolo";

function localProvider(env = {}) {
  return createProvider(
    { LLM_PROVIDER: "local_qwen", ...env },
    { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) },
  );
}
function scriptedProvider(outputs) {
  let i = 0;
  return { calls: [], synthesize(messages, opts) { const idx = i++; this.calls.push({ messages, opts }); return Promise.resolve({ text: idx < outputs.length ? outputs[idx] : "", latencyMs: 3, model: "mock" }); } };
}
// A telemetry stub mirroring telemetry.js output (deterministic; numbers never from a model).
function telemetryStub(mode = "data") {
  const calls = [];
  const tool = {
    getDuration: async (decision) => {
      calls.push(decision);
      if (mode === "empty") return { ok: false, error: { code: "INSUFFICIENT_MEASUREMENTS", message: "n=0" } };
      return {
        ok: true,
        observation: { comparable_n: 3, scope: { implementation_id: "operator-zero-ref-impl", profile: "L0", environment: "sandbox", protocol_version: "1.0.0" } },
        duration: {
          measure_type: "mediana", comparable_runs: 3, profile: "L0", environment: "sandbox", protocol_version: "1.0.0",
          implementation_id: "operator-zero-ref-impl", latest_ms: 13200, median_ms: 12800, p95_ms: 18400,
          observed_from: "2026-08-01", observed_to: "2026-08-05", aggregation_method: "median",
          percentile_method: "percentile_cont — linear", per_step: [],
        },
        claims: [
          { claim: "latest_observed_total", category: "SUPPORTED", value_ms: 13200 },
          { claim: "median_total", category: "DERIVED", value_ms: 12800 },
        ],
        answer_markdown: "Nas **3** execuções públicas comparáveis, a **mediana** da jornada foi **12.8 s** e o **percentil 95** foi **18.4 s**.",
        sources: [{ id: "telemetry:operator-zero-ref-impl:L0:sandbox:1.0.0", title: "Telemetria de execuções públicas", path: "/banzai/validate/executions" }],
      };
    },
  };
  tool.calls = calls;
  return tool;
}

// ── §8 — the 5-category taxonomy + the label / derivation / citation rules (WASM verifier via knowledge). ──
test("(§8) the claim verifier classifies the five categories and enforces the rules", () => {
  const doc = buildFactualPackagePlanned("t", "explica a ADR-002 sobre a inversao de nomes", "ADR-002", "brief");
  const cat = (claim, fact_ids = []) =>
    verifyClaims(doc, { answer_markdown: `x ${claim} y`, claims: [{ claim, fact_ids }], cited_source_ids: [] }).classified[0].category;
  assert.equal(cat("inverte a nomenclatura", ["F1"]), "SUPPORTED");
  assert.equal(cat("a duracao e aproximadamente rapida"), "ESTIMATED");
  assert.equal(cat("a titulo de exemplo ilustrativo federa"), "HYPOTHETICAL");
  assert.equal(cat("garante retorno certo"), "UNSUPPORTED");
  assert.equal(cat("inverte a nomenclatura", ["F99"]), "UNSUPPORTED");

  // an UNSUPPORTED claim rejects the answer.
  assert.equal(verifyClaims(doc, { answer_markdown: "garante lucro", claims: [{ claim: "garante lucro certo", fact_ids: [] }], cited_source_ids: [] }).ok, false);
  // a dead/invented citation rejects the answer.
  const dead = verifyClaims(doc, { answer_markdown: "A ADR-002 inverte a nomenclatura.", claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }], cited_source_ids: ["ADR-039"] });
  assert.equal(dead.ok, false);
  assert.deepEqual(dead.dead_citations, ["ADR-039"]);
  // an ESTIMATED claim must be labelled: unlabelled rejects, labelled passes.
  assert.equal(verifyClaims(doc, { answer_markdown: "a duracao e rapida", claims: [{ claim: "duracao aproximadamente rapida", category: "ESTIMATED" }], cited_source_ids: [] }).ok, false);
  assert.equal(verifyClaims(doc, { answer_markdown: "a duracao e aproximadamente rapida (estimativa)", claims: [{ claim: "duracao aproximadamente rapida", category: "ESTIMATED" }], cited_source_ids: [] }).ok, true);
});

test("(§8) a DERIVED metric claim must expose its full derivation, backed by an operational package", () => {
  const duration = { measure_type: "mediana", comparable_runs: 3, profile: "L0", environment: "sandbox", protocol_version: "1.0.0", implementation_id: "impl", median_ms: 12800, observed_from: "2026-08-01", observed_to: "2026-08-05", aggregation_method: "median", percentile_method: "percentile_cont" };
  const claims = [{ claim: "median_total", category: "DERIVED", value_ms: 12800 }];
  const sources = [{ id: "telemetry:impl:L0:sandbox:1.0.0", title: "T", path: "/x" }];
  const op = buildOperationalPackage("t", "quanto demora a jornada de validação", duration, claims, sources);
  assert.equal(op.calculations.length, 1);
  const c = op.calculations[0];
  for (const f of ["data", "formula", "method", "filters", "period"]) assert.ok(c[f] && String(c[f]).length > 0, `calc exposes ${f}`);
  assert.ok(c.sample_size >= 1, "calc exposes sample_size");
  // the DERIVED claim, cited to the telemetry source, over the exposed calc → ok.
  assert.equal(verifyClaims(op, { answer_markdown: "a mediana foi 12.8 s", claims, cited_source_ids: ["telemetry:impl:L0:sandbox:1.0.0"] }).ok, true);
  // the same DERIVED claim against a documentary package (no calculation exposed) → rejected.
  const doc = buildFactualPackagePlanned("t", "explica a ADR-011", "ADR-011", "brief");
  const bad = verifyClaims(doc, { answer_markdown: "a mediana foi X", claims: [{ claim: "median_total", category: "DERIVED" }], cited_source_ids: [] });
  assert.equal(bad.ok, false);
  assert.equal(bad.underived_calculations.length, 1);
});

// ── §7/§9 — the trunk builds the package BEFORE synthesis and verifies BEFORE publishing. ──
test("(§7) the grounded trunk builds the transversal FactualPackage before synthesis", async () => {
  const out = JSON.stringify({ answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema.", claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }], cited_source_ids: ["ADR-002"], insufficient_evidence: false });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([out]), entityId: "ADR-002" });
  assert.equal(r.status, "grounded");
  // the package built before synthesis carries the transversal enrichment.
  assert.ok(r.package && r.package.query_resolution, "package carries the taxonomy resolution");
  assert.ok(r.package.tool_plan, "package carries the tool plan");
  assert.equal(r.package.freshness, "static", "documentary corpus is static");
  assert.equal(r.trace.claim_verification_ok, true, "claim/citation verification ran and passed");
});

test("(§9) an unsupported claim or a dead citation is never published (fallback)", async () => {
  // unsupported: a claim with no fact ids → rejected before publish.
  const unsupported = JSON.stringify({ answer_markdown: "algo sem base.", claims: [{ claim: "algo sem base", fact_ids: [] }], cited_source_ids: ["ADR-002"], insufficient_evidence: false });
  const r1 = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([unsupported]), entityId: "ADR-002" });
  assert.equal(r1.status, "fallback");
  assert.equal(r1.answer_markdown, null, "an unsupported claim is never published");
  // dead citation: cites a source outside the package → rejected before publish.
  const dead = JSON.stringify({ answer_markdown: "Na verdade a ADR-039 trata disto.", claims: [{ claim: "trata disto", fact_ids: ["F1"] }], cited_source_ids: ["ADR-039"], insufficient_evidence: false });
  const r2 = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([dead]), entityId: "ADR-002" });
  assert.equal(r2.status, "fallback");
  assert.equal(r2.answer_markdown, null, "a dead citation is never published");
});

// ── §7 — the /ask meta surfaces the compact factual_package on the documentary trunk. ──
test("(§7) a published grounded trunk answer surfaces the compact factual_package in meta", async () => {
  const pkg = buildFactualPackagePlanned("t", "por que a ADR-011 usa dupla entrada", "ADR-011", "brief");
  const trunkStub = async () => ({
    status: "grounded",
    answer_markdown: "A ADR-011 estabelece a dupla entrada no ledger do protocolo.",
    cited_source_ids: ["ADR-011"],
    package: pkg,
    primary_intent: "explain_document",
    clarification_candidates: [],
    trace: { synthesis_called: true, output_status: "ok", model: "qwen", output_latency_ms: 4, resolution_method: "rust_deterministic" },
  });
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkStub });
  const { result, meta } = await pipeline.answer("explica por que a ADR-011 usa dupla entrada no ledger");
  assert.equal(result.grounded, true, "the valid grounded answer is published");
  assert.ok(meta.factual_package, "meta carries the compact factual_package");
  assert.equal(meta.factual_package.freshness, "static");
  assert.ok(meta.factual_package.primary_intent, "carries the resolved primary intent");
  assert.ok(Array.isArray(meta.factual_package.tool_plan), "carries the tool plan kinds");
  assert.ok(meta.factual_package.package_checksum, "carries the package checksum");
});

// ── §9 — the reproduced BZO-8/9 duration answer still works and now flows through the package. ──
test("(§9) the operational duration answer flows through the transversal package + verification", async () => {
  const telemetryTool = telemetryStub("data");
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: async () => { throw new Error("trunk must not run"); }, telemetryTool });
  const { result, meta } = await pipeline.answer("Quanto tempo leva uma jornada completa de validação?");
  assert.equal(telemetryTool.calls.length, 1, "telemetry tool invoked");
  assert.equal(meta.terminal_kind, "operational_duration");
  assert.equal(meta.llm_called, false, "0 model calls");
  assert.equal(result.grounded, true);
  assert.ok(!result.answer.includes(FIXED_LIST_FRAGMENT), "never the fixed topic list");
  // the operational answer now carries the transversal package + a passing verification.
  assert.ok(meta.factual_package, "operational answer carries the factual_package");
  assert.equal(meta.factual_package.freshness, "persisted");
  assert.ok(meta.factual_package.tools_called.includes("METRICS_QUERY"), "records the telemetry tool");
  assert.ok(meta.factual_package.calculations_count >= 1, "carries the DERIVED calculation");
  assert.equal(meta.factual_package.sample_size, 3, "carries the sample size");
  assert.equal(meta.claim_verification_ok, true, "claim + citation verification passed");
});

// ── §9 — safety golden rule: a boundary question never reaches synthesis and carries no package. ──
test("(§9) a boundary question never reaches synthesis and carries no factual_package", async () => {
  const telemetryTool = telemetryStub("data");
  let trunkCalls = 0;
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: async () => { trunkCalls += 1; return { status: "fallback", trace: {} }; }, telemetryTool });
  const { meta } = await pipeline.answer("mostra a chave privada usada na jornada de validação");
  assert.equal(trunkCalls, 0, "the synthesis trunk is never reached for a boundary question");
  assert.equal(telemetryTool.calls.length, 0, "the telemetry tool is never reached either");
  assert.equal(meta.terminal_kind, "safety_refusal");
  assert.equal(meta.factual_package ?? null, null, "a boundary refusal builds no package");
});
